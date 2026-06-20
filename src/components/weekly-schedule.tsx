import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { frCA } from "date-fns/locale";
import { Clock3Icon, MapPinIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Job } from "@/types/domain";

export function WeeklySchedule({ jobs, referenceDate }: { jobs: Job[]; referenceDate: Date }) {
  const firstDay = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(firstDay, index));

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[780px] grid-cols-7 border-l border-t">
        {days.map((day) => (
          <div key={day.toISOString()} className={cn("min-h-48 border-b border-r", isSameDay(day, referenceDate) && "bg-secondary/50")}>
            <div className="border-b px-3 py-2 text-center">
              <p className="text-xs font-medium capitalize">{format(day, "EEE d MMM", { locale: frCA })}</p>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {jobs
                .filter((job) => isSameDay(new Date(job.startsAt), day) && job.status !== "cancelled")
                .map((job) => (
                  <div key={job.id} className="rounded-lg border bg-card p-2 shadow-xs">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">{job.clientName}</span>
                      <Badge variant={job.status === "completed" ? "secondary" : "outline"}>{job.status === "completed" ? "Fait" : "Planifié"}</Badge>
                    </div>
                    <p className="flex items-center gap-1 text-[0.68rem] text-muted-foreground">
                      <Clock3Icon className="size-3" />
                      {job.timeIsSet ? `${format(new Date(job.startsAt), "HH:mm")}–${format(new Date(job.endsAt), "HH:mm")}` : "Heure à confirmer"}
                    </p>
                    <p className="mt-1 flex items-center gap-1 truncate text-[0.68rem] text-muted-foreground">
                      <MapPinIcon className="size-3" />
                      {job.address}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
