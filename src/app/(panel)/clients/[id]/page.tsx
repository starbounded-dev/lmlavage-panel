import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { ClientActions } from "@/components/client-actions";
import { PageHeader } from "@/components/page-header";
import { JobStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCad, formatDate, formatServiceScope } from "@/lib/format";
import { getAppData } from "@/lib/repository";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, data] = await Promise.all([params, getAppData()]);
  const client = data.clients.find((item) => item.id === id);
  if (!client) notFound();
  const jobs = data.jobs.filter((job) => job.clientId === client.id);

  return (
    <>
      <Button render={<Link href="/clients" />} nativeButton={false} variant="ghost" className="mb-4">
        <ArrowLeftIcon data-icon="inline-start" />
        Retour aux clients
      </Button>
      <PageHeader
        title={client.name ?? `Client #${client.clientNumber}`}
        description={`Client #${client.clientNumber} · dossier, propriétés et historique complet.`}
        action={<ClientActions client={client} />}
      />
      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Coordonnées</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="flex items-center gap-2"><PhoneIcon className="size-4 text-muted-foreground" />{client.phone ?? "Aucun téléphone"}</p>
              <p className="flex items-center gap-2"><MailIcon className="size-4 text-muted-foreground" />{client.email ?? "Aucun courriel"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Propriétés</CardTitle><CardDescription>Adresses de service liées à ce client.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {client.properties.map((property) => (
                <div key={property.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                  <MapPinIcon className="mt-0.5 size-4 text-primary" />
                  {[property.address, property.city, property.province].filter(Boolean).join(", ") || "Adresse à confirmer"}
                </div>
              ))}
              {client.properties.length === 0 ? <p className="text-sm text-muted-foreground">Aucune adresse pour le moment.</p> : null}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Historique des travaux</CardTitle><CardDescription>{jobs.length} intervention{jobs.length === 1 ? "" : "s"}.</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Service</TableHead><TableHead>Statut</TableHead><TableHead>Paiement</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{formatDate(job.startsAt)}</TableCell>
                    <TableCell>{formatServiceScope(job.serviceScope)}</TableCell>
                    <TableCell><JobStatusBadge status={job.status} /></TableCell>
                    <TableCell><PaymentStatusBadge status={job.paymentStatus} /></TableCell>
                    <TableCell className="text-right font-mono">{formatCad(job.totalDue + job.tipAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
