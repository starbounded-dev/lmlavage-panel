import { NextResponse } from "next/server";
import { requireBusinessId } from "@/lib/auth";
import { syncJobToGoogle } from "@/lib/google/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return NextResponse.json({ ok: false, reason: "demo" }, { status: 409 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
  const { jobId } = await context.params;
  const result = await syncJobToGoogle(supabase, businessId, jobId);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
