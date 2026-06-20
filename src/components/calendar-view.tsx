"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frCaLocale from "@fullcalendar/core/locales/fr-ca";
import { formatInTimeZone } from "date-fns-tz";
import type { Job } from "@/types/domain";

export function CalendarView({ jobs, initialDate }: { jobs: Job[]; initialDate: string }) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      locale={frCaLocale}
      initialView="timeGridWeek"
      initialDate={initialDate}
      allDaySlot
      nowIndicator
      height="auto"
      slotMinTime="07:00:00"
      slotMaxTime="20:00:00"
      eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      }}
      buttonText={{ today: "Aujourd’hui", month: "Mois", week: "Semaine", day: "Jour" }}
      events={jobs.map((job) => ({
        id: job.id,
        title: `${job.clientName} · ${job.address.split(",")[0]}`,
        start: job.timeIsSet ? job.startsAt : formatInTimeZone(job.startsAt, "America/Toronto", "yyyy-MM-dd"),
        end: job.timeIsSet ? job.endsAt : undefined,
        allDay: !job.timeIsSet,
        classNames: [`status-${job.status}`, `payment-${job.paymentStatus}`],
      }))}
      eventClick={(event) => {
        window.location.assign(`/travaux?job=${event.event.id}`);
      }}
    />
  );
}
