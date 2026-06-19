"use client";

import { useState } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import type { WorkbookPreview } from "@/lib/import/workbook";
import { formatCad } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ExcelImporter() {
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  async function previewFile(formData: FormData) {
    setPending(true);
    setComplete(false);
    try {
      const response = await fetch("/api/import/excel/preview", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPreview(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import impossible");
    } finally {
      setPending(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setPending(true);
    try {
      const response = await fetch("/api/import/excel/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: preview.fingerprint, preview }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setComplete(true);
      toast.success("Import terminé sans doublons.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import impossible");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader><CardTitle>Choisir le classeur source</CardTitle></CardHeader>
        <CardContent>
          <form action={previewFile} className="space-y-5">
            <Field>
              <FieldLabel htmlFor="workbook">Fichier Excel</FieldLabel>
              <Input id="workbook" name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
              <FieldDescription>L’import est transactionnel; un même fichier ne peut pas être importé deux fois.</FieldDescription>
            </Field>
            <Button type="submit" disabled={pending}><UploadIcon />{pending ? "Analyse…" : "Prévisualiser"}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Contrôles attendus</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>5 clients, propriétés et travaux payés</p><p>600,00 $ de services + 30,00 $ de pourboires</p><p>3 dépenses totalisant 294,05 $</p><p>5 rues prospectées et 4 parts de répartition</p>
        </CardContent>
      </Card>
      {preview && <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheetIcon />Aperçu validé</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[['Travaux', preview.jobs.length], ['Revenus', formatCad(preview.totals.serviceRevenue)], ['Pourboires', formatCad(preview.totals.tips)], ['Dépenses', formatCad(preview.totals.expenses)], ['Rues', preview.streets.length]].map(([label,value]) => <div key={label} className="rounded-xl bg-muted p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
        </div>
        {preview.warnings.length > 0 && <Alert><AlertTriangleIcon /><AlertTitle>Révision requise</AlertTitle><AlertDescription>{preview.warnings.map((warning) => <p key={warning}>{warning}</p>)}</AlertDescription></Alert>}
        {complete ? <Alert><CheckCircle2Icon /><AlertTitle>Import terminé</AlertTitle><AlertDescription>Les données ont été enregistrées et rapprochées.</AlertDescription></Alert> : <Button onClick={commit} disabled={pending}>Confirmer et importer</Button>}
      </CardContent></Card>}
    </div>
  );
}
