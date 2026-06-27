import type { ProspectHouseStatus } from "@/types/domain";

export const PROSPECT_HOUSE_STATUSES = [
  "no_answer",
  "revisit",
  "interested",
  "client_obtained",
  "do_not_revisit",
] as const;

export const PROSPECT_HOUSE_STATUS_META: Record<
  ProspectHouseStatus,
  { label: string; shortLabel: string; color: string; className: string; marker: { color: string; fillColor: string } }
> = {
  no_answer: {
    label: "Visitée, aucune réponse",
    shortLabel: "Aucune réponse",
    color: "Rouge",
    className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    marker: { color: "#991b1b", fillColor: "#ef4444" },
  },
  revisit: {
    label: "À revenir",
    shortLabel: "À revenir",
    color: "Jaune",
    className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    marker: { color: "#a16207", fillColor: "#eab308" },
  },
  interested: {
    label: "Intéressé",
    shortLabel: "Intéressé",
    color: "Orange",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    marker: { color: "#c2410c", fillColor: "#f97316" },
  },
  client_obtained: {
    label: "Client obtenu",
    shortLabel: "Client",
    color: "Vert",
    className: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300",
    marker: { color: "#166534", fillColor: "#22c55e" },
  },
  do_not_revisit: {
    label: "Refus / ne pas revisiter",
    shortLabel: "Refus",
    color: "Gris",
    className: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    marker: { color: "#52525b", fillColor: "#a1a1aa" },
  },
};

export function isProspectHouseStatus(value: string): value is ProspectHouseStatus {
  return PROSPECT_HOUSE_STATUSES.includes(value as ProspectHouseStatus);
}
