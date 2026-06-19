import type { Metadata } from "next";
import { CalendarLazy } from "@/components/calendar-lazy";
import { NewJobDialog } from "@/components/operation-dialogs";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getAppData } from "@/lib/repository";

export const metadata: Metadata = { title: "Calendrier" };

export default async function CalendarPage() {
  const data = await getAppData();
  const initialDate = data.business.id === "demo-business" ? "2026-06-18" : new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Calendrier"
        description="Planifiez les travaux et gardez Google Calendar à jour depuis une seule source."
        action={<NewJobDialog clients={data.clients} workers={data.workers} />}
      />
      <Card>
        <CardContent className="p-3 sm:p-5">
          <CalendarLazy jobs={data.jobs} initialDate={initialDate} />
        </CardContent>
      </Card>
    </>
  );
}
