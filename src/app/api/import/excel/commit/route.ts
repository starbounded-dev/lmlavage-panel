import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessId } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/), preview: z.record(z.string(), z.unknown()) });

export async function POST(request: Request) {
  const { businessId, auth } = await requireBusinessId();
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Aperçu invalide" }, { status: 400 });
  if (auth.isDemo) return NextResponse.json({ ok: true, imported: { jobs: 5, expenses: 3, streets: 5 }, demo: true });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
  const { data, error } = await supabase.rpc("import_lm_workbook", {
    p_business_id: businessId,
    p_fingerprint: parsed.data.fingerprint,
    p_payload: parsed.data.preview,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ ok: true, result: data });
}
