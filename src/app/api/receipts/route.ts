import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessId } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["application/pdf", "pdf"]]);

export async function POST(request: Request) {
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return NextResponse.json({ ok: true, path: "demo/receipt.pdf" });
  const formData = await request.formData();
  const file = formData.get("file");
  const expenseId = z.string().uuid().safeParse(formData.get("expenseId"));
  if (!(file instanceof File) || !expenseId.success || !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Reçu JPG, PNG ou PDF de 10 Mo ou moins requis." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
  const path = `${businessId}/${new Date().getFullYear()}/${randomUUID()}.${allowedTypes.get(file.type)}`;
  const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 422 });
  const { error: updateError } = await supabase.from("expenses").update({ receipt_path: path }).eq("business_id", businessId).eq("id", expenseId.data);
  if (updateError) { await supabase.storage.from("receipts").remove([path]); return NextResponse.json({ error: updateError.message }, { status: 422 }); }
  return NextResponse.json({ ok: true, path });
}
