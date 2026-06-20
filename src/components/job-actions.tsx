"use client";

import { useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import {
  BanIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  cancelJobAction,
  completeJobAction,
  deleteJobAction,
  markJobPaidAction,
  updateJobAction,
} from "@/app/actions";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { MutationDialog } from "@/components/mutation-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, Job, Worker } from "@/types/domain";

type JobActionsProps = {
  job: Job;
  clients: Client[];
  workers: Worker[];
};

export function JobActions({ job, clients, workers }: JobActionsProps) {
  const [pending, startTransition] = useTransition();
  const properties = clients.flatMap((client) =>
    client.properties.map((property) => ({
      ...property,
      clientName: client.name ?? `Client #${client.clientNumber}`,
    }))
  );

  function run(action: (id: string) => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      try {
        const result = await action(job.id);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      } catch {
        toast.error("La mise à jour du travail a échoué.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <MutationDialog
        title={`Modifier le travail de ${job.clientName}`}
        description="Les taxes et l’événement Google seront recalculés après l’enregistrement."
        action={updateJobAction}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Modifier le travail de ${job.clientName}`}>
            <PencilIcon />
          </Button>
        }
      >
        <input type="hidden" name="jobId" value={job.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={`job-property-${job.id}`}>Client et adresse</FieldLabel>
            <NativeSelect id={`job-property-${job.id}`} name="propertyId" defaultValue={job.propertyId} className="w-full" required>
              {properties.map((property) => (
                <NativeSelectOption key={property.id} value={property.id}>
                  {property.clientName} — {property.address ?? "Adresse à confirmer"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`job-start-${job.id}`}>Début</FieldLabel>
            <Input id={`job-start-${job.id}`} name="startsAt" type="datetime-local" defaultValue={formatInTimeZone(job.startsAt, "America/Toronto", "yyyy-MM-dd'T'HH:mm")} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`job-end-${job.id}`}>Fin</FieldLabel>
            <Input id={`job-end-${job.id}`} name="endsAt" type="datetime-local" defaultValue={formatInTimeZone(job.endsAt, "America/Toronto", "yyyy-MM-dd'T'HH:mm")} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`job-scope-${job.id}`}>Service</FieldLabel>
            <NativeSelect id={`job-scope-${job.id}`} name="serviceScope" defaultValue={job.serviceScope} className="w-full">
              <NativeSelectOption value="inside">Intérieur</NativeSelectOption>
              <NativeSelectOption value="outside">Extérieur</NativeSelectOption>
              <NativeSelectOption value="both">Intérieur / extérieur</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`job-seller-${job.id}`}>Vente faite par</FieldLabel>
            <NativeSelect id={`job-seller-${job.id}`} name="sellerWorkerId" defaultValue={job.sellerWorkerId ?? ""} className="w-full" required>
              {workers.filter((worker) => worker.active).map((worker) => (
                <NativeSelectOption key={worker.id} value={worker.id}>{worker.name}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`job-windows-${job.id}`}>Nombre de fenêtres</FieldLabel>
            <Input id={`job-windows-${job.id}`} name="windowCount" type="number" min="0" defaultValue={job.windowCount ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`job-price-${job.id}`}>Prix avant taxes</FieldLabel>
            <Input id={`job-price-${job.id}`} name="serviceSubtotal" type="number" min="0" step="0.01" defaultValue={job.serviceSubtotal} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`job-followup-${job.id}`}>Date de retour suggérée</FieldLabel>
            <Input id={`job-followup-${job.id}`} name="followupDate" type="date" defaultValue={job.followupDate ?? ""} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Travailleurs</FieldLabel>
            <div className="flex flex-wrap gap-4 rounded-lg border p-3">
              {workers.filter((worker) => worker.active).map((worker) => (
                <label key={worker.id} className="flex items-center gap-2 text-sm">
                  <Checkbox name="workerIds" value={worker.id} defaultChecked={job.workerIds.includes(worker.id)} />
                  {worker.name}
                </label>
              ))}
            </div>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={`job-notes-${job.id}`}>Notes</FieldLabel>
            <Textarea id={`job-notes-${job.id}`} name="notes" defaultValue={job.notes ?? ""} />
          </Field>
        </div>
      </MutationDialog>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={pending} />}>
          {pending ? <RefreshCwIcon className="animate-spin" /> : <MoreHorizontalIcon />}
          <span className="sr-only">Changer l’état du travail</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => run(completeJobAction)}>
              <CheckCircle2Icon />
              Marquer terminé
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(markJobPaidAction)}>
              <CircleDollarSignIcon />
              Marquer payé
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => run(cancelJobAction)}>
              <BanIcon />
              Annuler le travail
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmationDialog
        title={`Supprimer le travail de ${job.clientName} ?`}
        description="Cette action supprime aussi sa répartition de paiement. L’événement Google sera retiré avant la suppression."
        itemId={job.id}
        action={deleteJobAction}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Supprimer le travail de ${job.clientName}`}>
            <Trash2Icon />
          </Button>
        }
      />
    </div>
  );
}
