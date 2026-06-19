"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@/types/domain";

const LazyCalendar = dynamic(
  () => import("@/components/calendar-view").then((module) => module.CalendarView),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[720px] w-full" />,
  }
);

export function CalendarLazy({ jobs, initialDate }: { jobs: Job[]; initialDate: string }) {
  return <LazyCalendar jobs={jobs} initialDate={initialDate} />;
}
