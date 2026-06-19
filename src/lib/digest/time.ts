import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const QUEBEC_TIMEZONE = "America/Toronto";

export function getQuebecClock(now = new Date()) {
  return { date: formatInTimeZone(now, QUEBEC_TIMEZONE, "yyyy-MM-dd"), hour: Number(formatInTimeZone(now, QUEBEC_TIMEZONE, "H")) };
}

export function quebecDayBounds(localDate: string) {
  return {
    start: fromZonedTime(`${localDate}T00:00:00`, QUEBEC_TIMEZONE).toISOString(),
    end: fromZonedTime(`${localDate}T23:59:59.999`, QUEBEC_TIMEZONE).toISOString(),
  };
}
