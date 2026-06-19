"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { calculateTaxes } from "@/lib/calculations";
import { isDemoMode } from "@/lib/env";
import { requireBusinessId } from "@/lib/auth";
import { syncJobToGoogle } from "@/lib/google/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };

const requiredText = z.string().trim().min(1).max(200);

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInAction(formData: FormData) {
  if (isDemoMode()) {
    redirect("/tableau-de-bord");
  }

  const parsed = z
    .object({ email: z.string().email(), password: z.string().min(8) })
    .safeParse({
      email: formValue(formData, "email"),
      password: formValue(formData, "password"),
    });

  if (!parsed.success) {
    redirect("/connexion?erreur=identifiants");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/connexion?erreur=configuration");
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    redirect("/connexion?erreur=identifiants");
  }

  redirect("/tableau-de-bord");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/connexion");
}

export async function createClientAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      name: requiredText,
      phone: z.string().trim().max(40),
      email: z.union([z.literal(""), z.string().email()]),
      address: requiredText,
      city: requiredText,
      province: z.string().trim().min(2).max(3),
      postalCode: z.string().trim().max(12),
    })
    .safeParse({
      name: formValue(formData, "name"),
      phone: formValue(formData, "phone"),
      email: formValue(formData, "email"),
      address: formValue(formData, "address"),
      city: formValue(formData, "city"),
      province: formValue(formData, "province") || "QC",
      postalCode: formValue(formData, "postalCode"),
    });

  if (!parsed.success) {
    return { ok: false, message: "Vérifiez les renseignements du client." };
  }

  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) {
    return { ok: true, message: "Client validé en mode démonstration." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      business_id: businessId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    return { ok: false, message: clientError?.message ?? "Création impossible." };
  }

  const { error: propertyError } = await supabase.from("properties").insert({
    business_id: businessId,
    client_id: client.id,
    address: parsed.data.address,
    city: parsed.data.city,
    province: parsed.data.province,
    postal_code: parsed.data.postalCode || null,
  });

  if (propertyError) {
    return { ok: false, message: propertyError.message };
  }

  revalidatePath("/clients");
  return { ok: true, message: "Client ajouté." };
}

export async function createJobAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      propertyId: requiredText,
      startsAt: requiredText,
      endsAt: requiredText,
      serviceScope: z.enum(["inside", "outside", "both"]),
      windowCount: z.coerce.number().int().min(0).max(10000).optional(),
      serviceSubtotal: z.coerce.number().min(0).max(1_000_000),
      followupDate: z.string().trim().max(20),
      notes: z.string().trim().max(2000),
      workerIds: z.array(z.string()),
    })
    .safeParse({
      propertyId: formValue(formData, "propertyId"),
      startsAt: formValue(formData, "startsAt"),
      endsAt: formValue(formData, "endsAt"),
      serviceScope: formValue(formData, "serviceScope"),
      windowCount: formValue(formData, "windowCount") || undefined,
      serviceSubtotal: formValue(formData, "serviceSubtotal"),
      followupDate: formValue(formData, "followupDate"),
      notes: formValue(formData, "notes"),
      workerIds: formData.getAll("workerIds").filter((value): value is string => typeof value === "string"),
    });

  if (!parsed.success) {
    return { ok: false, message: "Vérifiez les renseignements du travail." };
  }

  const start = fromZonedTime(parsed.data.startsAt, "America/Toronto");
  const end = fromZonedTime(parsed.data.endsAt, "America/Toronto");
  if (end <= start) {
    return { ok: false, message: "L’heure de fin doit suivre l’heure de début." };
  }

  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) {
    return { ok: true, message: "Travail validé en mode démonstration." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };

  const [{ data: property, error: propertyError }, { data: business, error: businessError }] =
    await Promise.all([
      supabase
        .from("properties")
        .select("client_id")
        .eq("business_id", businessId)
        .eq("id", parsed.data.propertyId)
        .single(),
      supabase
        .from("businesses")
        .select("gst_enabled,qst_enabled,gst_rate,qst_rate")
        .eq("id", businessId)
        .single(),
    ]);

  if (propertyError || businessError || !property || !business) {
    return { ok: false, message: "La propriété ou les taxes sont introuvables." };
  }

  const taxes = calculateTaxes(parsed.data.serviceSubtotal, {
    gstEnabled: business.gst_enabled,
    qstEnabled: business.qst_enabled,
    gstRate: Number(business.gst_rate),
    qstRate: Number(business.qst_rate),
  });

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      business_id: businessId,
      client_id: property.client_id,
      property_id: parsed.data.propertyId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      service_scope: parsed.data.serviceScope,
      window_count: parsed.data.windowCount ?? null,
      service_subtotal: parsed.data.serviceSubtotal,
      gst_amount: taxes.gst,
      qst_amount: taxes.qst,
      total_due: taxes.total,
      followup_date: parsed.data.followupDate || null,
      notes: parsed.data.notes || null,
      google_sync_status: "pending",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return { ok: false, message: jobError?.message ?? "Création impossible." };
  }

  if (parsed.data.workerIds.length > 0) {
    const { error: workersError } = await supabase.from("job_workers").insert(
      parsed.data.workerIds.map((workerId) => ({
        business_id: businessId,
        job_id: job.id,
        worker_id: workerId,
      }))
    );
    if (workersError) return { ok: false, message: workersError.message };
  }

  await syncJobToGoogle(supabase, businessId, job.id);

  revalidatePath("/travaux");
  revalidatePath("/calendrier");
  revalidatePath("/tableau-de-bord");
  return { ok: true, message: "Travail planifié." };
}

export async function createExpenseAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      date: requiredText,
      vendor: requiredText,
      category: requiredText,
      subtotal: z.coerce.number().min(0).max(1_000_000),
      gstAmount: z.coerce.number().min(0).max(1_000_000),
      qstAmount: z.coerce.number().min(0).max(1_000_000),
      paymentMethod: z.string().trim().max(80),
      notes: z.string().trim().max(2000),
      jobId: z.string().trim().max(100),
    })
    .safeParse({
      date: formValue(formData, "date"),
      vendor: formValue(formData, "vendor"),
      category: formValue(formData, "category"),
      subtotal: formValue(formData, "subtotal"),
      gstAmount: formValue(formData, "gstAmount") || "0",
      qstAmount: formValue(formData, "qstAmount") || "0",
      paymentMethod: formValue(formData, "paymentMethod"),
      notes: formValue(formData, "notes"),
      jobId: formValue(formData, "jobId"),
    });

  if (!parsed.success) {
    return { ok: false, message: "Vérifiez les renseignements de la dépense." };
  }

  const receipt = formData.get("receipt");
  const allowedReceiptTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["application/pdf", "pdf"]]);
  if (receipt instanceof File && receipt.size > 0 && (!allowedReceiptTypes.has(receipt.type) || receipt.size > 10 * 1024 * 1024)) {
    return { ok: false, message: "Le reçu doit être un JPG, PNG ou PDF de 10 Mo ou moins." };
  }

  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) {
    return { ok: true, message: "Dépense validée en mode démonstration." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
  const total = parsed.data.subtotal + parsed.data.gstAmount + parsed.data.qstAmount;
  const { data: expense, error } = await supabase.from("expenses").insert({
    business_id: businessId,
    expense_date: parsed.data.date,
    vendor: parsed.data.vendor,
    category: parsed.data.category,
    subtotal: parsed.data.subtotal,
    gst_amount: parsed.data.gstAmount,
    qst_amount: parsed.data.qstAmount,
    total,
    payment_method: parsed.data.paymentMethod || null,
    notes: parsed.data.notes || null,
    job_id: parsed.data.jobId || null,
  }).select("id").single();

  if (error || !expense) return { ok: false, message: error?.message ?? "Création impossible." };
  if (receipt instanceof File && receipt.size > 0) {
    const extension = allowedReceiptTypes.get(receipt.type)!;
    const path = `${businessId}/${new Date().getFullYear()}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("receipts").upload(path, receipt, { contentType: receipt.type, upsert: false });
    if (uploadError) return { ok: true, message: `Dépense ajoutée; le reçu doit être téléversé de nouveau (${uploadError.message}).` };
    await supabase.from("expenses").update({ receipt_path: path }).eq("business_id", businessId).eq("id", expense.id);
  }
  revalidatePath("/depenses");
  revalidatePath("/tableau-de-bord");
  return { ok: true, message: "Dépense ajoutée." };
}

export async function createVisitAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      street: requiredText,
      city: requiredText,
      visitedAt: requiredText,
      outcome: requiredText,
      revisitDate: z.string().trim().max(20),
      notes: z.string().trim().max(2000),
    })
    .safeParse({
      street: formValue(formData, "street"),
      city: formValue(formData, "city"),
      visitedAt: formValue(formData, "visitedAt"),
      outcome: formValue(formData, "outcome"),
      revisitDate: formValue(formData, "revisitDate"),
      notes: formValue(formData, "notes"),
    });

  if (!parsed.success) {
    return { ok: false, message: "Vérifiez les renseignements de la visite." };
  }

  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) {
    return { ok: true, message: "Visite validée en mode démonstration." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
  const { error } = await supabase.from("canvassing_visits").insert({
    business_id: businessId,
    street: parsed.data.street,
    city: parsed.data.city,
    visited_at: parsed.data.visitedAt,
    outcome: parsed.data.outcome,
    revisit_date: parsed.data.revisitDate || null,
    notes: parsed.data.notes || null,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/prospection");
  return { ok: true, message: "Visite de rue ajoutée." };
}

async function updateJobState(jobId: string, values: Record<string, unknown>) {
  const parsedId = z.string().min(1).parse(jobId);
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return { ok: true, message: "État validé en mode démonstration." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
  const { error } = await supabase
    .from("jobs")
    .update(values)
    .eq("business_id", businessId)
    .eq("id", parsedId);
  if (error) return { ok: false, message: error.message };
  await syncJobToGoogle(supabase, businessId, parsedId);
  revalidatePath("/travaux");
  revalidatePath("/tableau-de-bord");
  return { ok: true, message: "Travail mis à jour." };
}

export async function completeJobAction(jobId: string) {
  return updateJobState(jobId, { status: "completed" });
}

export async function markJobPaidAction(jobId: string) {
  return updateJobState(jobId, {
    status: "completed",
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  });
}

export async function cancelJobAction(jobId: string) {
  return updateJobState(jobId, { status: "cancelled", google_sync_status: "pending" });
}
