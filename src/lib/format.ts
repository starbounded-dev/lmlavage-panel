import { format, formatDistanceToNowStrict } from "date-fns";
import { frCA } from "date-fns/locale";

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

export function formatDate(value: string | Date, pattern = "d MMM yyyy") {
  return format(new Date(value), pattern, { locale: frCA });
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
