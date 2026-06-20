"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calculateIncludedTaxes, calculateTaxes, roundMoney } from "@/lib/calculations";
import { isDemoMode } from "@/lib/env";
import { requireBusinessId, requireOwnerBusinessId } from "@/lib/auth";
import { syncJobToGoogle } from "@/lib/google/sync";
import { resolveJobSchedule } from "@/lib/job-schedule";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: boolean; message: string };

const requiredText = z.string().trim().min(1).max(200);

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function calculateExpenseAmounts(
  mode: "subtotal" | "total",
  amount: number,
  settings: { gstEnabled: boolean; qstEnabled: boolean; gstRate: number; qstRate: number }
) {
  if (mode === "total") return calculateIncludedTaxes(amount, settings);
  const subtotal = roundMoney(amount);
  return { subtotal, ...calculateTaxes(subtotal, settings) };
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
      clientNumber: z.coerce.number().int().positive().max(1_000_000_000),
      name: z.string().trim().max(200),
      phone: z.string().trim().max(40),
      email: z.union([z.literal(""), z.string().email()]),
      notes: z.string().trim().max(2000),
      address: z.string().trim().max(300),
      city: z.string().trim().max(120),
      province: z.string().trim().max(3),
      postalCode: z.string().trim().max(12),
    })
    .safeParse({
      clientNumber: formValue(formData, "clientNumber"),
      name: formValue(formData, "name"),
      phone: formValue(formData, "phone"),
      email: formValue(formData, "email"),
      notes: formValue(formData, "notes"),
      address: formValue(formData, "address"),
      city: formValue(formData, "city"),
      province: formValue(formData, "province"),
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
      client_number: parsed.data.clientNumber,
      name: parsed.data.name || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    if (clientError?.code === "23505") return { ok: false, message: "Ce numéro client est déjà utilisé." };
    return { ok: false, message: clientError?.message ?? "Création impossible." };
  }

  const hasProperty = Boolean(parsed.data.address || parsed.data.city || parsed.data.province || parsed.data.postalCode);
  if (hasProperty) {
    const { error: propertyError } = await supabase.from("properties").insert({
      business_id: businessId,
      client_id: client.id,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      postal_code: parsed.data.postalCode || null,
    });

    if (propertyError) {
      await supabase.from("clients").delete().eq("business_id", businessId).eq("id", client.id);
      return { ok: false, message: propertyError.message };
    }
  }

  revalidatePath("/clients");
  return { ok: true, message: "Client ajouté." };
}

export async function updateClientAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      clientId: requiredText,
      propertyId: z.string().trim().max(200),
      clientNumber: z.coerce.number().int().positive().max(1_000_000_000),
      name: z.string().trim().max(200),
      phone: z.string().trim().max(40),
      email: z.union([z.literal(""), z.string().email()]),
      notes: z.string().trim().max(2000),
      address: z.string().trim().max(300),
      city: z.string().trim().max(120),
      province: z.string().trim().max(3),
      postalCode: z.string().trim().max(12),
    })
    .safeParse({
      clientId: formValue(formData, "clientId"),
      propertyId: formValue(formData, "propertyId"),
      clientNumber: formValue(formData, "clientNumber"),
      name: formValue(formData, "name"),
      phone: formValue(formData, "phone"),
      email: formValue(formData, "email"),
      notes: formValue(formData, "notes"),
      address: formValue(formData, "address"),
      city: formValue(formData, "city"),
      province: formValue(formData, "province"),
      postalCode: formValue(formData, "postalCode"),
    });

  if (!parsed.success) return { ok: false, message: "Vérifiez les renseignements du client." };
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return { ok: true, message: "Client modifié en mode démonstration." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };

  const { error: clientError } = await supabase
    .from("clients")
    .update({
      client_number: parsed.data.clientNumber,
      name: parsed.data.name || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      needs_review: parsed.data.name ? false : undefined,
    })
    .eq("business_id", businessId)
    .eq("id", parsed.data.clientId);
  if (clientError) {
    if (clientError.code === "23505") return { ok: false, message: "Ce numéro client est déjà utilisé." };
    return { ok: false, message: clientError.message };
  }

  const propertyValues = {
    address: parsed.data.address || null,
    city: parsed.data.city || null,
    province: parsed.data.province || null,
    postal_code: parsed.data.postalCode || null,
  };
  if (parsed.data.propertyId) {
    const { error } = await supabase
      .from("properties")
      .update(propertyValues)
      .eq("business_id", businessId)
      .eq("client_id", parsed.data.clientId)
      .eq("id", parsed.data.propertyId);
    if (error) return { ok: false, message: error.message };
  } else if (Object.values(propertyValues).some(Boolean)) {
    const { error } = await supabase.from("properties").insert({
      business_id: businessId,
      client_id: parsed.data.clientId,
      ...propertyValues,
    });
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { ok: true, message: "Client mis à jour." };
}

export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  const parsedId = requiredText.safeParse(clientId);
  if (!parsedId.success) return { ok: false, message: "Client invalide." };
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return { ok: true, message: "Client supprimé en mode démonstration." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };

  const { count, error: countError } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("client_id", parsedId.data);
  if (countError) return { ok: false, message: countError.message };
  if ((count ?? 0) > 0) {
    return { ok: false, message: "Ce client possède encore des travaux. Retirez-les avant de supprimer le client." };
  }

  const { error } = await supabase.from("clients").delete().eq("business_id", businessId).eq("id", parsedId.data);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/clients");
  return { ok: true, message: "Client supprimé." };
}

export async function createAccountAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      workerId: z.string().uuid(),
      email: z.string().trim().email().max(320),
      password: z
        .string()
        .min(12)
        .max(72)
        .regex(/[a-z]/)
        .regex(/[A-Z]/)
        .regex(/[0-9]/),
    })
    .safeParse({
      workerId: formValue(formData, "workerId"),
      email: formValue(formData, "email").toLowerCase(),
      password: formValue(formData, "password"),
    });

  if (!parsed.success) {
    return { ok: false, message: "Utilisez un courriel valide et un mot de passe de 12 caractères avec majuscule, minuscule et chiffre." };
  }

  const { auth, businessId } = await requireOwnerBusinessId();
  if (auth.isDemo) {
    return { ok: false, message: "La création de comptes est désactivée en mode démonstration." };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, message: "La clé de service Supabase est absente." };

  const { data: worker, error: workerError } = await admin
    .from("workers")
    .select("id,user_id")
    .eq("business_id", businessId)
    .eq("id", parsed.data.workerId)
    .single();
  if (workerError || !worker) return { ok: false, message: "Travailleur introuvable." };
  if (worker.user_id) return { ok: false, message: "Ce travailleur possède déjà un compte." };

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return { ok: false, message: error?.message ?? "Impossible de créer le compte." };
  }

  const { error: membershipError } = await admin.from("business_members").insert({
    business_id: businessId,
    user_id: data.user.id,
    role: "admin",
  });

  if (membershipError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: "Le compte n’a pas pu être rattaché à l’entreprise." };
  }

  const { data: linkedWorker, error: workerLinkError } = await admin
    .from("workers")
    .update({ user_id: data.user.id })
    .eq("business_id", businessId)
    .eq("id", parsed.data.workerId)
    .is("user_id", null)
    .select("id")
    .maybeSingle();
  if (workerLinkError || !linkedWorker) {
    await admin.from("business_members").delete().eq("business_id", businessId).eq("user_id", data.user.id);
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: "Le compte n’a pas pu être associé au travailleur." };
  }

  revalidatePath("/parametres");
  return { ok: true, message: "Compte administrateur créé. Transmettez le mot de passe initial de façon sécurisée." };
}

export async function assignWorkerAccountAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ workerId: z.string().uuid(), userId: z.string().uuid() })
    .safeParse({ workerId: formValue(formData, "workerId"), userId: formValue(formData, "userId") });
  if (!parsed.success) return { ok: false, message: "Choisissez un travailleur et un compte valides." };

  const { auth, businessId } = await requireOwnerBusinessId();
  if (auth.isDemo) return { ok: false, message: "L’association est désactivée en mode démonstration." };
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, message: "La clé de service Supabase est absente." };

  const [{ data: membership }, { data: worker }, { data: existingLink }] = await Promise.all([
    admin.from("business_members").select("user_id").eq("business_id", businessId).eq("user_id", parsed.data.userId).maybeSingle(),
    admin.from("workers").select("id,user_id").eq("business_id", businessId).eq("id", parsed.data.workerId).maybeSingle(),
    admin.from("workers").select("id").eq("business_id", businessId).eq("user_id", parsed.data.userId).maybeSingle(),
  ]);
  if (!membership) return { ok: false, message: "Ce compte n’appartient pas à l’entreprise." };
  if (!worker) return { ok: false, message: "Travailleur introuvable." };
  if (worker.user_id) return { ok: false, message: "Ce travailleur possède déjà un compte." };
  if (existingLink) return { ok: false, message: "Ce compte est déjà associé à un autre travailleur." };

  const { data: linkedWorker, error } = await admin
    .from("workers")
    .update({ user_id: parsed.data.userId })
    .eq("business_id", businessId)
    .eq("id", parsed.data.workerId)
    .is("user_id", null)
    .select("id")
    .maybeSingle();
  if (error || !linkedWorker) return { ok: false, message: error?.message ?? "Le travailleur a déjà été associé." };
  revalidatePath("/parametres");
  return { ok: true, message: "Compte associé au travailleur." };
}

export async function createJobAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      propertyId: requiredText,
      jobDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
      endTime: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
      serviceScope: z.enum(["inside", "outside", "both"]),
      windowCount: z.coerce.number().int().min(0).max(10000).optional(),
      serviceSubtotal: z.coerce.number().min(0).max(1_000_000),
      followupDate: z.string().trim().max(20),
      notes: z.string().trim().max(2000),
      workerIds: z.array(z.string()),
      sellerWorkerId: requiredText,
    })
    .safeParse({
      propertyId: formValue(formData, "propertyId"),
      jobDate: formValue(formData, "jobDate"),
      startTime: formValue(formData, "startTime"),
      endTime: formValue(formData, "endTime"),
      serviceScope: formValue(formData, "serviceScope"),
      windowCount: formValue(formData, "windowCount") || undefined,
      serviceSubtotal: formValue(formData, "serviceSubtotal"),
      followupDate: formValue(formData, "followupDate"),
      notes: formValue(formData, "notes"),
      workerIds: formData.getAll("workerIds").filter((value): value is string => typeof value === "string"),
      sellerWorkerId: formValue(formData, "sellerWorkerId"),
    });

  if (!parsed.success) {
    return { ok: false, message: "Vérifiez les renseignements du travail." };
  }

  const schedule = resolveJobSchedule(parsed.data.jobDate, parsed.data.startTime, parsed.data.endTime);
  if (!schedule.ok) return { ok: false, message: schedule.error };

  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) {
    return { ok: true, message: "Travail validé en mode démonstration." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };

  const [{ data: property, error: propertyError }, { data: business, error: businessError }, { data: seller, error: sellerError }] =
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
      supabase
        .from("workers")
        .select("id")
        .eq("business_id", businessId)
        .eq("id", parsed.data.sellerWorkerId)
        .eq("active", true)
        .single(),
    ]);

  if (propertyError || businessError || sellerError || !property || !business || !seller) {
    return { ok: false, message: "La propriété, le vendeur ou les taxes sont introuvables." };
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
      starts_at: schedule.start.toISOString(),
      ends_at: schedule.end.toISOString(),
      time_is_set: schedule.timeIsSet,
      service_scope: parsed.data.serviceScope,
      window_count: parsed.data.windowCount ?? null,
      service_subtotal: parsed.data.serviceSubtotal,
      gst_amount: taxes.gst,
      qst_amount: taxes.qst,
      total_due: taxes.total,
      followup_date: parsed.data.followupDate || null,
      notes: parsed.data.notes || null,
      seller_worker_id: seller.id,
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

export async function updateJobAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      jobId: requiredText,
      propertyId: requiredText,
      jobDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
      endTime: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]),
      serviceScope: z.enum(["inside", "outside", "both"]),
      windowCount: z.coerce.number().int().min(0).max(10000).optional(),
      serviceSubtotal: z.coerce.number().min(0).max(1_000_000),
      followupDate: z.string().trim().max(20),
      notes: z.string().trim().max(2000),
      workerIds: z.array(requiredText),
      sellerWorkerId: requiredText,
    })
    .safeParse({
      jobId: formValue(formData, "jobId"),
      propertyId: formValue(formData, "propertyId"),
      jobDate: formValue(formData, "jobDate"),
      startTime: formValue(formData, "startTime"),
      endTime: formValue(formData, "endTime"),
      serviceScope: formValue(formData, "serviceScope"),
      windowCount: formValue(formData, "windowCount") || undefined,
      serviceSubtotal: formValue(formData, "serviceSubtotal"),
      followupDate: formValue(formData, "followupDate"),
      notes: formValue(formData, "notes"),
      workerIds: formData.getAll("workerIds").filter((value): value is string => typeof value === "string"),
      sellerWorkerId: formValue(formData, "sellerWorkerId"),
    });
  if (!parsed.success) return { ok: false, message: "Vérifiez les renseignements du travail." };

  const schedule = resolveJobSchedule(parsed.data.jobDate, parsed.data.startTime, parsed.data.endTime);
  if (!schedule.ok) return { ok: false, message: schedule.error };

  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return { ok: true, message: "Travail modifié en mode démonstration." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };

  const [{ data: property }, { data: business }, { data: seller }, { data: workers }] = await Promise.all([
    supabase.from("properties").select("client_id").eq("business_id", businessId).eq("id", parsed.data.propertyId).maybeSingle(),
    supabase.from("businesses").select("gst_enabled,qst_enabled,gst_rate,qst_rate").eq("id", businessId).maybeSingle(),
    supabase.from("workers").select("id").eq("business_id", businessId).eq("id", parsed.data.sellerWorkerId).eq("active", true).maybeSingle(),
    parsed.data.workerIds.length > 0
      ? supabase.from("workers").select("id").eq("business_id", businessId).in("id", parsed.data.workerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (!property || !business || !seller || (workers?.length ?? 0) !== new Set(parsed.data.workerIds).size) {
    return { ok: false, message: "La propriété, le vendeur, les travailleurs ou les taxes sont introuvables." };
  }

  const taxes = calculateTaxes(parsed.data.serviceSubtotal, {
    gstEnabled: business.gst_enabled,
    qstEnabled: business.qst_enabled,
    gstRate: Number(business.gst_rate),
    qstRate: Number(business.qst_rate),
  });
  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      client_id: property.client_id,
      property_id: parsed.data.propertyId,
      starts_at: schedule.start.toISOString(),
      ends_at: schedule.end.toISOString(),
      time_is_set: schedule.timeIsSet,
      service_scope: parsed.data.serviceScope,
      window_count: parsed.data.windowCount ?? null,
      service_subtotal: parsed.data.serviceSubtotal,
      gst_amount: taxes.gst,
      qst_amount: taxes.qst,
      total_due: taxes.total,
      followup_date: parsed.data.followupDate || null,
      notes: parsed.data.notes || null,
      seller_worker_id: parsed.data.sellerWorkerId,
      google_sync_status: "pending",
    })
    .eq("business_id", businessId)
    .eq("id", parsed.data.jobId);
  if (updateError) return { ok: false, message: updateError.message };

  const { error: unlinkError } = await supabase
    .from("job_workers")
    .delete()
    .eq("business_id", businessId)
    .eq("job_id", parsed.data.jobId);
  if (unlinkError) return { ok: false, message: unlinkError.message };
  if (parsed.data.workerIds.length > 0) {
    const { error: linkError } = await supabase.from("job_workers").insert(
      [...new Set(parsed.data.workerIds)].map((workerId) => ({ business_id: businessId, job_id: parsed.data.jobId, worker_id: workerId }))
    );
    if (linkError) return { ok: false, message: linkError.message };
  }

  await syncJobToGoogle(supabase, businessId, parsed.data.jobId);
  revalidatePath("/travaux");
  revalidatePath("/calendrier");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/clients");
  return { ok: true, message: "Travail mis à jour." };
}

export async function createExpenseAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      date: requiredText,
      vendor: requiredText,
      category: requiredText,
      amountMode: z.enum(["subtotal", "total"]),
      amount: z.coerce.number().min(0).max(1_000_000),
      paymentMethod: z.string().trim().max(80),
      notes: z.string().trim().max(2000),
      jobId: z.string().trim().max(100),
    })
    .safeParse({
      date: formValue(formData, "date"),
      vendor: formValue(formData, "vendor"),
      category: formValue(formData, "category"),
      amountMode: formValue(formData, "amountMode"),
      amount: formValue(formData, "amount"),
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
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("gst_enabled,qst_enabled,gst_rate,qst_rate")
    .eq("id", businessId)
    .single();
  if (businessError || !business) return { ok: false, message: "Les paramètres de taxes sont introuvables." };
  if (parsed.data.jobId) {
    const { data: job } = await supabase.from("jobs").select("id").eq("business_id", businessId).eq("id", parsed.data.jobId).maybeSingle();
    if (!job) return { ok: false, message: "Le travail associé est introuvable." };
  }
  const amounts = calculateExpenseAmounts(parsed.data.amountMode, parsed.data.amount, {
    gstEnabled: business.gst_enabled,
    qstEnabled: business.qst_enabled,
    gstRate: Number(business.gst_rate),
    qstRate: Number(business.qst_rate),
  });
  const { data: expense, error } = await supabase.from("expenses").insert({
    business_id: businessId,
    expense_date: parsed.data.date,
    vendor: parsed.data.vendor,
    category: parsed.data.category,
    subtotal: amounts.subtotal,
    gst_amount: amounts.gst,
    qst_amount: amounts.qst,
    total: amounts.total,
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

export async function updateExpenseAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      expenseId: requiredText,
      date: requiredText,
      vendor: requiredText,
      category: requiredText,
      amountMode: z.enum(["subtotal", "total"]),
      amount: z.coerce.number().min(0).max(1_000_000),
      paymentMethod: z.string().trim().max(80),
      notes: z.string().trim().max(2000),
      jobId: z.string().trim().max(200),
    })
    .safeParse({
      expenseId: formValue(formData, "expenseId"),
      date: formValue(formData, "date"),
      vendor: formValue(formData, "vendor"),
      category: formValue(formData, "category"),
      amountMode: formValue(formData, "amountMode"),
      amount: formValue(formData, "amount"),
      paymentMethod: formValue(formData, "paymentMethod"),
      notes: formValue(formData, "notes"),
      jobId: formValue(formData, "jobId"),
    });
  if (!parsed.success) return { ok: false, message: "Vérifiez les renseignements de la dépense." };

  const receipt = formData.get("receipt");
  const allowedReceiptTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["application/pdf", "pdf"]]);
  if (receipt instanceof File && receipt.size > 0 && (!allowedReceiptTypes.has(receipt.type) || receipt.size > 10 * 1024 * 1024)) {
    return { ok: false, message: "Le reçu doit être un JPG, PNG ou PDF de 10 Mo ou moins." };
  }

  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return { ok: true, message: "Dépense modifiée en mode démonstration." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };

  if (parsed.data.jobId) {
    const { data: job } = await supabase.from("jobs").select("id").eq("business_id", businessId).eq("id", parsed.data.jobId).maybeSingle();
    if (!job) return { ok: false, message: "Le travail associé est introuvable." };
  }
  const [{ data: current, error: currentError }, { data: business, error: businessError }] = await Promise.all([
    supabase.from("expenses").select("receipt_path").eq("business_id", businessId).eq("id", parsed.data.expenseId).single(),
    supabase.from("businesses").select("gst_enabled,qst_enabled,gst_rate,qst_rate").eq("id", businessId).single(),
  ]);
  if (currentError || !current) return { ok: false, message: "Dépense introuvable." };
  if (businessError || !business) return { ok: false, message: "Les paramètres de taxes sont introuvables." };

  let newReceiptPath: string | null = current.receipt_path;
  if (receipt instanceof File && receipt.size > 0) {
    const extension = allowedReceiptTypes.get(receipt.type)!;
    newReceiptPath = `${businessId}/${new Date().getFullYear()}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(newReceiptPath, receipt, { contentType: receipt.type, upsert: false });
    if (uploadError) return { ok: false, message: `Le nouveau reçu n’a pas pu être téléversé (${uploadError.message}).` };
  }

  const amounts = calculateExpenseAmounts(parsed.data.amountMode, parsed.data.amount, {
    gstEnabled: business.gst_enabled,
    qstEnabled: business.qst_enabled,
    gstRate: Number(business.gst_rate),
    qstRate: Number(business.qst_rate),
  });
  const { error } = await supabase
    .from("expenses")
    .update({
      expense_date: parsed.data.date,
      vendor: parsed.data.vendor,
      category: parsed.data.category,
      subtotal: amounts.subtotal,
      gst_amount: amounts.gst,
      qst_amount: amounts.qst,
      total: amounts.total,
      payment_method: parsed.data.paymentMethod || null,
      notes: parsed.data.notes || null,
      job_id: parsed.data.jobId || null,
      receipt_path: newReceiptPath,
    })
    .eq("business_id", businessId)
    .eq("id", parsed.data.expenseId);
  if (error) {
    if (newReceiptPath && newReceiptPath !== current.receipt_path) await supabase.storage.from("receipts").remove([newReceiptPath]);
    return { ok: false, message: error.message };
  }
  if (current.receipt_path && newReceiptPath !== current.receipt_path) {
    await supabase.storage.from("receipts").remove([current.receipt_path]);
  }
  revalidatePath("/depenses");
  revalidatePath("/tableau-de-bord");
  return { ok: true, message: "Dépense mise à jour." };
}

export async function createVisitAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      street: requiredText,
      city: requiredText,
      visitedAt: requiredText,
      outcome: z.enum(["Rue visitée", "Clients obtenus", "Clients obtenus et à revenir", "À revisiter", "Aucun intérêt"]),
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

export async function updateVisitAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      visitId: requiredText,
      street: requiredText,
      city: requiredText,
      visitedAt: requiredText,
      outcome: z.enum(["Rue visitée", "Clients obtenus", "Clients obtenus et à revenir", "À revisiter", "Aucun intérêt"]),
      revisitDate: z.string().trim().max(20),
      notes: z.string().trim().max(2000),
    })
    .safeParse({
      visitId: formValue(formData, "visitId"),
      street: formValue(formData, "street"),
      city: formValue(formData, "city"),
      visitedAt: formValue(formData, "visitedAt"),
      outcome: formValue(formData, "outcome"),
      revisitDate: formValue(formData, "revisitDate"),
      notes: formValue(formData, "notes"),
    });
  if (!parsed.success) return { ok: false, message: "Vérifiez les renseignements de la visite." };
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return { ok: true, message: "Visite modifiée en mode démonstration." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
  const { error } = await supabase
    .from("canvassing_visits")
    .update({
      street: parsed.data.street,
      city: parsed.data.city,
      visited_at: parsed.data.visitedAt,
      outcome: parsed.data.outcome,
      revisit_date: parsed.data.revisitDate || null,
      notes: parsed.data.notes || null,
    })
    .eq("business_id", businessId)
    .eq("id", parsed.data.visitId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/prospection");
  return { ok: true, message: "Visite mise à jour." };
}

export async function deleteVisitAction(visitId: string): Promise<ActionResult> {
  const parsedId = requiredText.safeParse(visitId);
  if (!parsedId.success) return { ok: false, message: "Visite invalide." };
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return { ok: true, message: "Visite supprimée en mode démonstration." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };
  const { error } = await supabase
    .from("canvassing_visits")
    .delete()
    .eq("business_id", businessId)
    .eq("id", parsedId.data);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/prospection");
  return { ok: true, message: "Visite supprimée." };
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

export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  const parsedId = requiredText.safeParse(jobId);
  if (!parsedId.success) return { ok: false, message: "Travail invalide." };
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return { ok: true, message: "Travail supprimé en mode démonstration." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase n’est pas configuré." };

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id,google_event_id")
    .eq("business_id", businessId)
    .eq("id", parsedId.data)
    .single();
  if (jobError || !job) return { ok: false, message: "Travail introuvable." };

  if (job.google_event_id) {
    const { error: cancelError } = await supabase
      .from("jobs")
      .update({ status: "cancelled", google_sync_status: "pending" })
      .eq("business_id", businessId)
      .eq("id", parsedId.data);
    if (cancelError) return { ok: false, message: cancelError.message };
    const syncResult = await syncJobToGoogle(supabase, businessId, parsedId.data);
    if (!syncResult.ok) {
      revalidatePath("/travaux");
      return { ok: false, message: "L’événement Google n’a pas pu être retiré. Corrigez la connexion puis réessayez." };
    }
  }

  const { error } = await supabase.from("jobs").delete().eq("business_id", businessId).eq("id", parsedId.data);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/travaux");
  revalidatePath("/calendrier");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/clients");
  revalidatePath("/depenses");
  return { ok: true, message: "Travail supprimé." };
}
