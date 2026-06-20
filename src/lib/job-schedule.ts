import { fromZonedTime } from "date-fns-tz";

export function resolveJobSchedule(jobDate: string, startTime: string, endTime: string) {
  if (Boolean(startTime) !== Boolean(endTime)) {
    return { ok: false, error: "Indiquez les deux heures ou laissez les deux champs vides." } as const;
  }

  const timeIsSet = Boolean(startTime && endTime);
  const start = fromZonedTime(`${jobDate}T${startTime || "12:00"}`, "America/Toronto");
  const end = fromZonedTime(`${jobDate}T${endTime || "13:00"}`, "America/Toronto");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, error: "La date ou les heures sont invalides." } as const;
  }
  if (end <= start) {
    return { ok: false, error: "L’heure de fin doit suivre l’heure de début la même journée." } as const;
  }
  return { ok: true, start, end, timeIsSet } as const;
}
