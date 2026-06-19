import type { Metadata } from "next";
import { AllocationChart } from "@/components/dashboard-charts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCad } from "@/lib/format";
import { getAppData } from "@/lib/repository";

export const metadata: Metadata = { title: "Répartition" };

export default async function AllocationPage() {
  const data = await getAppData();
  const eligibleRevenue = data.allocationBuckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  return (
    <>
      <PageHeader title="Répartition" description="Partage des revenus de services au moment de l’encaissement." />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card><CardHeader><CardTitle>Répartition actuelle</CardTitle><CardDescription>Base admissible historique : {formatCad(eligibleRevenue)}</CardDescription></CardHeader><CardContent><AllocationChart buckets={data.allocationBuckets} /></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Catégories de partage</CardTitle><CardDescription>Les modifications futures ne changent pas les paiements déjà répartis.</CardDescription></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Pourcentage</TableHead><TableHead className="text-right">Montant historique</TableHead></TableRow></TableHeader>
              <TableBody>{data.allocationBuckets.map((bucket) => <TableRow key={bucket.id}><TableCell className="font-medium">{bucket.name}</TableCell><TableCell><Badge variant="secondary">{bucket.type === "person" ? "Personne" : "Réserve"}</Badge></TableCell><TableCell className="text-right font-mono">{bucket.percentage}%</TableCell><TableCell className="text-right font-mono">{formatCad(bucket.amount)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
