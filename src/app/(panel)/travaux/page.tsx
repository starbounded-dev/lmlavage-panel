import type { Metadata } from "next";
import { JobActions } from "@/components/job-actions";
import { NewJobDialog } from "@/components/operation-dialogs";
import { PageHeader } from "@/components/page-header";
import { JobStatusBadge, PaymentStatusBadge, SyncStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCad, formatDate, formatServiceScope } from "@/lib/format";
import { getAppData } from "@/lib/repository";

export const metadata: Metadata = { title: "Travaux" };

export default async function JobsPage() {
  const data = await getAppData();
  const jobs = data.jobs.toSorted((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <>
      <PageHeader title="Travaux" description="Planification, réalisation, paiement et suivi client." action={<NewJobDialog clients={data.clients} workers={data.workers} />} />
      <Card>
        <CardHeader><CardTitle>Registre des travaux</CardTitle><CardDescription>{jobs.length} travaux enregistrés.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead>Service</TableHead><TableHead>Statut</TableHead><TableHead>Paiement</TableHead><TableHead>Google</TableHead><TableHead className="text-right">Montant</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell><p className="font-medium">{job.clientName}</p><p className="max-w-56 truncate text-xs text-muted-foreground">{job.address}</p></TableCell>
                  <TableCell><p>{formatDate(job.startsAt)}</p><p className="text-xs text-muted-foreground">{formatDate(job.startsAt, "HH:mm")}–{formatDate(job.endsAt, "HH:mm")}</p></TableCell>
                  <TableCell>{formatServiceScope(job.serviceScope)}{job.windowCount ? <p className="text-xs text-muted-foreground">{job.windowCount} fenêtres</p> : null}</TableCell>
                  <TableCell><JobStatusBadge status={job.status} /></TableCell>
                  <TableCell><PaymentStatusBadge status={job.paymentStatus} /></TableCell>
                  <TableCell><SyncStatusBadge status={job.googleSyncStatus} /></TableCell>
                  <TableCell className="text-right font-mono">{formatCad(job.totalDue + job.tipAmount)}</TableCell>
                  <TableCell><JobActions jobId={job.id} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
