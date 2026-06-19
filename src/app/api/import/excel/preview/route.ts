import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { parseLmWorkbook } from "@/lib/import/workbook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xlsx") || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Utilisez un fichier XLSX de 10 Mo ou moins." }, { status: 400 });
  }
  try {
    return NextResponse.json(await parseLmWorkbook(Buffer.from(await file.arrayBuffer())));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Lecture impossible" }, { status: 422 });
  }
}
