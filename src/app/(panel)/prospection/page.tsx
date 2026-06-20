import type { Metadata } from "next";
import { NewVisitDialog } from "@/components/operation-dialogs";
import { VisitActions } from "@/components/visit-actions";
import { PageHeader } from "@/components/page-header";
import { ProspectingMapLazy } from "@/components/prospecting-map-lazy";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { getAppData } from "@/lib/repository";

export const metadata: Metadata = { title: "Prospection" };

export default async function ProspectingPage() {
  const data = await getAppData();
  const clientLocations = data.clients.flatMap((client) =>
    client.properties.flatMap((property) =>
      property.latitude != null && property.longitude != null
        ? [{
            id: property.id,
            label: client.name ?? `Client #${client.clientNumber}`,
            address: [property.address, property.city].filter(Boolean).join(", ") || "Adresse à confirmer",
            coordinate: [property.latitude, property.longitude] as [number, number],
          }]
        : []
    )
  );
  const mappedVisits = data.canvassingVisits.filter((visit) => visit.routeCoordinates.length > 1).length;
  return (
    <>
      <PageHeader title="Prospection" description="Portions de rues parcourues, maisons clientes et dates prévues pour revenir." action={<NewVisitDialog />} />
      <Card>
        <CardHeader>
          <CardTitle>Carte de Gatineau</CardTitle>
          <CardDescription>{mappedVisits} portion{mappedVisits !== 1 ? "s" : ""} tracée{mappedVisits !== 1 ? "s" : ""} en rouge · {clientLocations.length} maison{clientLocations.length !== 1 ? "s" : ""} cliente{clientLocations.length !== 1 ? "s" : ""} en vert.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProspectingMapLazy visits={data.canvassingVisits} clients={clientLocations} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Rues visitées</CardTitle><CardDescription>{data.canvassingVisits.length} secteurs consignés à Gatineau.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Rue</TableHead><TableHead>Portion</TableHead><TableHead>Ville</TableHead><TableHead>Visite</TableHead><TableHead>Résultat</TableHead><TableHead>Retour prévu</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {data.canvassingVisits.map((visit) => (
                <TableRow key={visit.id}><TableCell className="font-medium capitalize">{visit.street}</TableCell><TableCell className="min-w-52">{visit.startAddress && visit.endAddress ? `${visit.startAddress} → ${visit.endAddress}` : "Rue entière / non précisé"}</TableCell><TableCell>{visit.city}</TableCell><TableCell>{visit.visitedAt ? formatDate(visit.visitedAt) : "À confirmer"}</TableCell><TableCell><Badge variant={visit.outcome.includes("Clients obtenus") ? "default" : "secondary"}>{visit.outcome}</Badge></TableCell><TableCell>{visit.revisitDate ? formatDate(visit.revisitDate) : "À confirmer"}</TableCell><TableCell><VisitActions visit={visit} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
