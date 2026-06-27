import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessId } from "@/lib/auth";
import { parseReceiptFile, removeReceiptFile, uploadReceiptFile } from "@/lib/receipt-storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return NextResponse.json({ ok: true, path: "demo/receipt.pdf" });

  const formData = await request.formData();
  const receipt = parseReceiptFile(formData.get("file"));
  const expenseId = z.string().uuid().safeParse(formData.get("expenseId"));
  if (!expenseId.success || !receipt.ok || !receipt.hasFile) {
    return NextResponse.json({ error: receipt.ok ? "Reçu requis." : receipt.message }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });

  const upload = await uploadReceiptFile(supabase, businessId, receipt);
  if (!upload.ok) return NextResponse.json({ error: upload.message }, { status: 422 });

  const { error } = await supabase
    .from("expenses")
    .update({ receipt_path: upload.path })
    .eq("business_id", businessId)
    .eq("id", expenseId.data);

  if (error) {
    await removeReceiptFile(supabase, upload.path);
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ ok: true, path: upload.path });
}
