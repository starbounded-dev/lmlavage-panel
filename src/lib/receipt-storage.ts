import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_RECEIPT_SIZE_BYTES, RECEIPT_VALIDATION_MESSAGE, resolveReceiptFileType } from "@/lib/receipt-types";

type ParsedReceipt =
  | { ok: true; hasFile: false }
  | { ok: true; hasFile: true; file: File; contentType: string; extension: string }
  | { ok: false; message: string };

function storageClient(fallbackClient: SupabaseClient) {
  return getSupabaseAdminClient() ?? fallbackClient;
}

export function parseReceiptFile(value: FormDataEntryValue | null): ParsedReceipt {
  if (!(value instanceof File) || value.size === 0) return { ok: true, hasFile: false };
  if (value.size > MAX_RECEIPT_SIZE_BYTES) return { ok: false, message: RECEIPT_VALIDATION_MESSAGE };

  const resolved = resolveReceiptFileType(value);
  if (!resolved) return { ok: false, message: RECEIPT_VALIDATION_MESSAGE };

  return {
    ok: true,
    hasFile: true,
    file: value,
    contentType: resolved.contentType,
    extension: resolved.extension,
  };
}

export async function uploadReceiptFile(supabase: SupabaseClient, businessId: string, receipt: Extract<ParsedReceipt, { hasFile: true }>) {
  const path = `${businessId}/${new Date().getFullYear()}/${randomUUID()}.${receipt.extension}`;
  const { error } = await storageClient(supabase)
    .storage
    .from("receipts")
    .upload(path, receipt.file, { contentType: receipt.contentType, upsert: false });

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, path };
}

export async function removeReceiptFile(supabase: SupabaseClient, path: string) {
  await storageClient(supabase).storage.from("receipts").remove([path]);
}
