import "server-only";
import { Resend } from "resend";
import { formatInTimeZone } from "date-fns-tz";
import { QUEBEC_TIMEZONE } from "@/lib/digest/time";

type DigestJob = { starts_at: string; service_subtotal: number | string; followup_date?: string | null; clients: { name: string } | null; properties: { address: string } | null };

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

function jobList(jobs: DigestJob[], empty: string, withTime = false) {
  if (jobs.length === 0) return `<p style="color:#64748b">${empty}</p>`;
  return `<ul>${jobs.map((job) => `<li style="margin:8px 0"><strong>${escapeHtml(job.clients?.name ?? "Client")}</strong> — ${escapeHtml(job.properties?.address ?? "Adresse à confirmer")}${withTime ? `, ${formatInTimeZone(job.starts_at, QUEBEC_TIMEZONE, "HH:mm")}` : ""}</li>`).join("")}</ul>`;
}

export function buildDigestHtml(input: { businessName: string; localDate: string; today: DigestJob[]; reminders: DigestJob[]; unpaid: DigestJob[] }) {
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0b1f3a"><div style="background:#0b2d55;padding:20px;border-radius:16px 16px 0 0;color:white"><h1 style="margin:0;font-size:22px">Résumé quotidien — ${escapeHtml(input.businessName)}</h1><p style="margin:6px 0 0;color:#bfe9ff">${input.localDate}</p></div><div style="padding:22px;border:1px solid #dbe5ef;border-top:0"><h2 style="font-size:17px">Travaux d’aujourd’hui</h2>${jobList(input.today, "Aucun travail aujourd’hui.", true)}<h2 style="font-size:17px;margin-top:24px">Retours dus ou en retard</h2>${jobList(input.reminders, "Aucun rappel à traiter.")}<h2 style="font-size:17px;margin-top:24px">Travaux terminés non payés</h2>${jobList(input.unpaid, "Aucun paiement en attente.")}</div></div>`;
}

export async function sendDigestEmail(input: { to: string; businessName: string; localDate: string; today: DigestJob[]; reminders: DigestJob[]; unpaid: DigestJob[]; idempotencyKey: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Resend n’est pas configuré.");
  return new Resend(apiKey).emails.send({ from, to: input.to, subject: `LM — résumé du ${input.localDate}`, html: buildDigestHtml(input) }, { idempotencyKey: input.idempotencyKey });
}
