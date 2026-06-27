import { format, formatDistanceToNowStrict, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { frCA } from "date-fns/locale";

export const QUEBEC_TIMEZONE = "America/Toronto";

export const cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

export const integerFormatter = new Intl.NumberFormat("fr-CA", {
  maximumFractionDigits: 0,
});

export function formatCad(value: number) {
  return cadFormatter.format(value);
}

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(value: string | Date, pattern = "d MMM yyyy") {
  if (typeof value === "string" && dateOnlyPattern.test(value)) {
    return format(parse(value, "yyyy-MM-dd", new Date()), pattern, { locale: frCA });
  }

  return formatInTimeZone(value, QUEBEC_TIMEZONE, pattern, { locale: frCA });
}

export function dateKeyInQuebec(value: string | Date) {
  if (typeof value === "string" && dateOnlyPattern.test(value)) {
    return value;
  }

  return formatInTimeZone(value, QUEBEC_TIMEZONE, "yyyy-MM-dd");
}

export function formatRelativeDate(value: string | Date) {
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: frCA,
  });
}

export function formatServiceScope(scope: "inside" | "outside" | "both") {
  return {
    inside: "Intérieur",
    outside: "Extérieur",
    both: "Intérieur / extérieur",
  }[scope];
}
