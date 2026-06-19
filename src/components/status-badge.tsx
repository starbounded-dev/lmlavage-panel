import { Badge } from "@/components/ui/badge";
import type { JobStatus, PaymentStatus, SyncStatus } from "@/types/domain";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const labels: Record<JobStatus, string> = {
    scheduled: "Planifié",
    completed: "Terminé",
    cancelled: "Annulé",
  };
  const variant = status === "cancelled" ? "destructive" : status === "completed" ? "secondary" : "outline";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={status === "paid" ? "default" : "outline"}>{status === "paid" ? "Payé" : "Impayé"}</Badge>;
}

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const labels: Record<SyncStatus, string> = {
    not_connected: "Non connecté",
    pending: "À synchroniser",
    synced: "Synchronisé",
    error: "Erreur",
  };
  return <Badge variant={status === "error" ? "destructive" : "secondary"}>{labels[status]}</Badge>;
}
