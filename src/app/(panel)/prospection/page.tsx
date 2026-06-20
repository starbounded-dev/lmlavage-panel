import type { Metadata } from "next";
import { NewVisitDialog } from "@/components/operation-dialogs";
import { VisitActions } from "@/components/visit-actions";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { getAppData } from "@/lib/repository";

export const metadata: Metadata = { title: "Prospection" };

export default async function ProspectingPage() {
  const data = await getAppData();
  return (
    <>
      <PageHeader title="Prospection" description="Rues déjà parcourues et dates prévues pour revenir." action={<NewVisitDialog />} />
      <Card>
        <CardHeader><CardTitle>Rues visitées</CardTitle><CardDescription>{data.canvassingVisits.length} secteurs consignés à Gatineau.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Rue</TableHead><TableHead>Ville</TableHead><TableHead>Visite</TableHead><TableHead>Résultat</TableHead><TableHead>Retour prévu</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {data.canvassingVisits.map((visit) => (
                <TableRow key={visit.id}><TableCell className="font-medium capitalize">{visit.street}</TableCell><TableCell>{visit.city}</TableCell><TableCell>{formatDate(visit.visitedAt)}</TableCell><TableCell><Badge variant={visit.outcome.includes("Clients obtenus") ? "default" : "secondary"}>{visit.outcome}</Badge></TableCell><TableCell>{visit.revisitDate ? formatDate(visit.revisitDate) : "—"}</TableCell><TableCell><VisitActions visit={visit} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
