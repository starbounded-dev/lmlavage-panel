import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessId } from "@/lib/auth";
import { downloadReceiptFile, parseReceiptFile, removeReceiptFile, uploadReceiptFile } from "@/lib/receipt-storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function contentTypeFromPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    pdf: "application/pdf",
  }[extension ?? ""] ?? "application/octet-stream";
}

function safeReceiptFileName(path: string) {
  return path.split("/").pop()?.replace(/["\r\n]/g, "") || "recu";
}

export async function GET(request: Request) {
  const { businessId, auth } = await requireBusinessId();
  if (auth.isDemo) return NextResponse.json({ error: "Aucun reçu en mode démonstration." }, { status: 404 });

  const url = new URL(request.url);
  const parsedPath = z.string().min(1).safeParse(url.searchParams.get("path"));
  if (!parsedPath.success) {
    return NextResponse.json({ error: "Chemin de reçu requis." }, { status: 400 });
  }

  const receiptPath = parsedPath.data;
  if (!receiptPath.startsWith(`${businessId}/`)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .select("id")
    .eq("business_id", businessId)
    .eq("receipt_path", receiptPath)
    .maybeSingle();

  if (expenseError) return NextResponse.json({ error: expenseError.message }, { status: 422 });
  if (!expense) return NextResponse.json({ error: "Reçu introuvable." }, { status: 404 });

  const download = await downloadReceiptFile(supabase, receiptPath);
  if (!download.ok) return NextResponse.json({ error: download.message }, { status: 404 });

  const contentType = download.file.type || contentTypeFromPath(receiptPath);
  const fileName = safeReceiptFileName(receiptPath);

  return new NextResponse(download.file.stream(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Length": String(download.file.size),
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

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
