import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendDigestEmail } from "@/lib/digest/email";
import { getQuebecClock, quebecDayBounds } from "@/lib/digest/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DigestInput = Parameters<typeof sendDigestEmail>[0];

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const clock = getQuebecClock();
  if (clock.hour !== 8) return NextResponse.json({ ok: true, skipped: "outside_local_hour", clock });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
  const { data: businesses, error } = await supabase.from("businesses").select("id,name,digest_email").not("digest_email", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const bounds = quebecDayBounds(clock.date);
  const results: Array<{ businessId: string; status: string }> = [];

  for (const business of businesses ?? []) {
    const { data: existing } = await supabase.from("digest_deliveries").select("id,status").eq("business_id", business.id).eq("local_date", clock.date).maybeSingle();
    if (existing?.status === "sent" || existing?.status === "sending") { results.push({ businessId: business.id, status: "duplicate" }); continue; }
    let deliveryId = existing?.id;
    if (deliveryId) {
      await supabase.from("digest_deliveries").update({ status: "sending", error: null }).eq("id", deliveryId);
    } else {
      const { data: delivery, error: deliveryError } = await supabase.from("digest_deliveries").insert({ business_id: business.id, local_date: clock.date, status: "sending" }).select("id").single();
      if (deliveryError || !delivery) { results.push({ businessId: business.id, status: "duplicate" }); continue; }
      deliveryId = delivery.id;
    }
    try {
      const [todayResult, remindersResult, unpaidResult] = await Promise.all([
        supabase.from("jobs").select("starts_at,time_is_set,service_subtotal,clients(name),properties(address)").eq("business_id", business.id).neq("status", "cancelled").gte("starts_at", bounds.start).lte("starts_at", bounds.end).order("starts_at"),
        supabase.from("jobs").select("starts_at,time_is_set,service_subtotal,followup_date,clients(name),properties(address)").eq("business_id", business.id).neq("status", "cancelled").lte("followup_date", clock.date).order("followup_date"),
        supabase.from("jobs").select("starts_at,time_is_set,service_subtotal,clients(name),properties(address)").eq("business_id", business.id).eq("status", "completed").eq("payment_status", "unpaid").order("starts_at"),
      ]);
      const queryError = todayResult.error ?? remindersResult.error ?? unpaidResult.error;
      if (queryError) throw queryError;
      const sent = await sendDigestEmail({ to: business.digest_email!, businessName: business.name, localDate: clock.date, today: (todayResult.data ?? []) as unknown as DigestInput["today"], reminders: (remindersResult.data ?? []) as unknown as DigestInput["reminders"], unpaid: (unpaidResult.data ?? []) as unknown as DigestInput["unpaid"], idempotencyKey: `lm-digest-${business.id}-${clock.date}` });
      if (sent.error) throw new Error(sent.error.message);
      await supabase.from("digest_deliveries").update({ status: "sent", provider_message_id: sent.data?.id ?? null }).eq("id", deliveryId);
      results.push({ businessId: business.id, status: "sent" });
    } catch (sendError) {
      await supabase.from("digest_deliveries").update({ status: "failed", error: sendError instanceof Error ? sendError.message : "Erreur inconnue" }).eq("id", deliveryId);
      results.push({ businessId: business.id, status: "failed" });
    }
  }
  return NextResponse.json({ ok: true, localDate: clock.date, results });
}
