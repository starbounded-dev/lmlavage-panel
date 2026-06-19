import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { createGoogleOAuthClient } from "@/lib/google/client";
import { decryptRefreshToken } from "@/lib/google/tokens";

type JoinedJob = {
  id: string; starts_at: string; ends_at: string; status: string; service_scope: string; window_count: number | null;
  notes: string | null; google_event_id: string | null;
  clients: { name: string } | null; properties: { address: string; city: string; province: string } | null;
  job_workers: Array<{ workers: { name: string } | null }>;
};

export async function syncJobToGoogle(supabase: SupabaseClient, businessId: string, jobId: string) {
  const [{ data: connection, error: connectionError }, { data: rawJob, error: jobError }] = await Promise.all([
    supabase.from("calendar_connections").select("calendar_id,encrypted_refresh_token,token_iv,token_tag").eq("business_id", businessId).maybeSingle(),
    supabase.from("jobs").select("id,starts_at,ends_at,status,service_scope,window_count,notes,google_event_id,clients(name),properties(address,city,province),job_workers(workers(name))").eq("business_id", businessId).eq("id", jobId).single(),
  ]);
  if (connectionError || !connection) {
    await supabase.from("jobs").update({ google_sync_status: "not_connected", google_sync_error: connectionError?.message ?? null }).eq("business_id", businessId).eq("id", jobId);
    return { ok: false, reason: "not_connected" as const };
  }
  if (jobError || !rawJob) throw new Error(jobError?.message ?? "Travail introuvable");
  const job = rawJob as unknown as JoinedJob;
  try {
    const auth = createGoogleOAuthClient();
    auth.setCredentials({ refresh_token: decryptRefreshToken(connection.encrypted_refresh_token, connection.token_iv, connection.token_tag) });
    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = connection.calendar_id || "primary";
    if (job.status === "cancelled") {
      if (job.google_event_id) await calendar.events.delete({ calendarId, eventId: job.google_event_id });
      await supabase.from("jobs").update({ google_event_id: null, google_sync_status: "synced", google_sync_error: null }).eq("business_id", businessId).eq("id", jobId);
      return { ok: true, action: "deleted" as const };
    }
    const workers = job.job_workers.map((item) => item.workers?.name).filter(Boolean).join(", ");
    const scope = job.service_scope === "both" ? "Intérieur et extérieur" : job.service_scope === "inside" ? "Intérieur" : "Extérieur";
    const requestBody = {
      summary: `LM — ${job.clients?.name ?? "Client"}`,
      location: job.properties ? `${job.properties.address}, ${job.properties.city}, ${job.properties.province}` : undefined,
      description: [`Service : ${scope}`, job.window_count !== null ? `Fenêtres : ${job.window_count}` : null, workers ? `Travailleurs : ${workers}` : null, job.notes].filter(Boolean).join("\n"),
      start: { dateTime: job.starts_at, timeZone: "America/Toronto" }, end: { dateTime: job.ends_at, timeZone: "America/Toronto" },
    };
    const result = job.google_event_id ? await calendar.events.update({ calendarId, eventId: job.google_event_id, requestBody }) : await calendar.events.insert({ calendarId, requestBody });
    await supabase.from("jobs").update({ google_event_id: result.data.id ?? job.google_event_id, google_sync_status: "synced", google_sync_error: null }).eq("business_id", businessId).eq("id", jobId);
    return { ok: true, action: job.google_event_id ? "updated" as const : "created" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Google Calendar";
    await Promise.all([
      supabase.from("jobs").update({ google_sync_status: "error", google_sync_error: message }).eq("business_id", businessId).eq("id", jobId),
      supabase.from("calendar_connections").update({ last_error: message, updated_at: new Date().toISOString() }).eq("business_id", businessId),
    ]);
    return { ok: false, reason: "provider_error" as const, error: message };
  }
}
