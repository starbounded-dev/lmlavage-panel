import type { Metadata } from "next";
import Link from "next/link";
import { isAfter, isSameDay, startOfDay } from "date-fns";
import { BellRingIcon, CalendarDaysIcon, CircleDollarSignIcon, ReceiptTextIcon } from "lucide-react";
import { AllocationChart, RevenueChart } from "@/components/dashboard-charts";
import { MetricCard } from "@/components/metric-card";
import { NewJobDialog } from "@/components/operation-dialogs";
import { PageHeader } from "@/components/page-header";
import { PaymentStatusBadge } from "@/components/status-badge";
import { WeeklySchedule } from "@/components/weekly-schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAppData } from "@/lib/repository";
import { formatCad, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const data = await getAppData();
  const referenceDate = data.business.id === "demo-business" ? new Date("2026-06-18T12:00:00-04:00") : new Date();
  const paidJobs = data.jobs.filter((job) => job.paymentStatus === "paid");
  const collected = paidJobs.reduce((total, job) => total + job.totalDue + job.tipAmount, 0);
  const tips = paidJobs.reduce((total, job) => total + job.tipAmount, 0);
  const upcoming = data.jobs.filter(
    (job) => job.status === "scheduled" && isAfter(new Date(job.startsAt), startOfDay(referenceDate))
  );
  const reminders = data.jobs
    .filter((job) => job.followupDate)
    .toSorted((a, b) => (a.followupDate ?? "").localeCompare(b.followupDate ?? ""));
  const expenseTotal = data.expenses.reduce((total, expense) => total + expense.total, 0);
  const todayJobs = data.jobs.filter((job) => isSameDay(new Date(job.startsAt), referenceDate));
  const unpaidCompleted = data.jobs.filter(
    (job) => job.status === "completed" && job.paymentStatus === "unpaid"
  );

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={`${formatDate(referenceDate, "EEEE d MMMM yyyy")} · Aperçu des opérations`}
        action={<NewJobDialog clients={data.clients} workers={data.workers} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          title="Total encaissé"
          value={formatCad(collected)}
          description={`${formatCad(collected - tips)} en services · ${formatCad(tips)} en pourboires`}
          icon={CircleDollarSignIcon}
        />
        <MetricCard
          title="Travaux à venir"
          value={String(upcoming.length)}
          description="Planifiés au calendrier"
          icon={CalendarDaysIcon}
        />
        <MetricCard
          title="Rappels à faire"
          value={String(reminders.length)}
          description="Dates de retour enregistrées"
          icon={BellRingIcon}
        />
        <MetricCard
          title="Dépenses"
          value={formatCad(expenseTotal)}
          description={`${data.expenses.length} écritures comptabilisées`}
          icon={ReceiptTextIcon}
        />
      </div>

      <Card className="mt-4 md:hidden" size="sm">
        <CardHeader><CardTitle>Aujourd’hui</CardTitle><CardDescription>{todayJobs.length} travaux au programme.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {todayJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0"><p className="text-sm font-medium">{job.timeIsSet ? formatDate(job.startsAt, "HH:mm") : "Heure à confirmer"} · {job.clientName}</p><p className="truncate text-xs text-muted-foreground">{job.address}</p></div>
              <PaymentStatusBadge status={job.paymentStatus} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4 hidden overflow-hidden md:flex">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Horaire de la semaine</CardTitle>
            <CardDescription>Travaux planifiés, terminés et synchronisés.</CardDescription>
          </div>
          <Button render={<Link href="/calendrier" />} nativeButton={false} variant="outline" size="sm">
            Voir le calendrier
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <WeeklySchedule jobs={data.jobs} referenceDate={referenceDate} />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.85fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Revenus mensuels</CardTitle>
            <CardDescription>Revenus de services encaissés, hors taxes et pourboires.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>À relancer</CardTitle>
            <CardDescription>Prochaines dates de retour suggérées.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {reminders.slice(0, 5).map((job, index) => (
              <div key={job.id}>
                {index > 0 ? <Separator className="mb-3" /> : null}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.clientName}</p>
                    <p className="truncate text-xs text-muted-foreground">{job.address}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-primary">
                    {job.followupDate ? formatDate(job.followupDate, "d MMM yyyy") : "—"}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des paiements</CardTitle>
            <CardDescription>Pourcentages figés sur les revenus de services payés.</CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationChart buckets={data.allocationBuckets} />
          </CardContent>
        </Card>
      </div>

      <div className="hidden">
        <Card>
          <CardHeader>
            <CardTitle>Aujourd’hui</CardTitle>
            <CardDescription>{todayJobs.length} travaux au programme.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {todayJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{job.clientName}</p>
                  <p className="text-xs text-muted-foreground">{job.timeIsSet ? formatDate(job.startsAt, "HH:mm") : "Heure à confirmer"} · {job.address}</p>
                </div>
                <PaymentStatusBadge status={job.paymentStatus} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Paiements en attente</CardTitle>
            <CardDescription>Travaux terminés qui restent à encaisser.</CardDescription>
          </CardHeader>
          <CardContent>
            {unpaidCompleted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun paiement en retard.</p>
            ) : (
              unpaidCompleted.map((job) => <p key={job.id}>{job.clientName}</p>)
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
