"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { deleteVisitAction, updateVisitAction } from "@/app/actions";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { MutationDialog } from "@/components/mutation-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CanvassingVisit } from "@/types/domain";

export function VisitActions({ visit }: { visit: CanvassingVisit }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <MutationDialog
        title="Modifier la visite"
        description="Mettez à jour le résultat, les notes ou la date de retour."
        action={updateVisitAction}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${visit.street}`}>
            <PencilIcon />
          </Button>
        }
      >
        <input type="hidden" name="visitId" value={visit.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`visit-street-${visit.id}`}>Rue</FieldLabel>
            <Input id={`visit-street-${visit.id}`} name="street" defaultValue={visit.street} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`visit-city-${visit.id}`}>Ville</FieldLabel>
            <Input id={`visit-city-${visit.id}`} name="city" defaultValue={visit.city} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`visit-date-${visit.id}`}>Date de visite</FieldLabel>
            <Input id={`visit-date-${visit.id}`} name="visitedAt" type="date" defaultValue={visit.visitedAt} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`visit-outcome-${visit.id}`}>Résultat</FieldLabel>
            <NativeSelect id={`visit-outcome-${visit.id}`} name="outcome" defaultValue={visit.outcome} className="w-full">
              <NativeSelectOption value="Rue visitée">Rue visitée</NativeSelectOption>
              <NativeSelectOption value="Clients obtenus">Clients obtenus</NativeSelectOption>
              <NativeSelectOption value="Clients obtenus et à revenir">Clients obtenus et à revenir</NativeSelectOption>
              <NativeSelectOption value="À revisiter">À revisiter</NativeSelectOption>
              <NativeSelectOption value="Aucun intérêt">Aucun intérêt</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`visit-revisit-${visit.id}`}>Date de retour</FieldLabel>
            <Input id={`visit-revisit-${visit.id}`} name="revisitDate" type="date" defaultValue={visit.revisitDate ?? ""} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={`visit-notes-${visit.id}`}>Notes</FieldLabel>
            <Textarea id={`visit-notes-${visit.id}`} name="notes" defaultValue={visit.notes ?? ""} />
          </Field>
        </div>
      </MutationDialog>
      <DeleteConfirmationDialog
        title={`Retirer ${visit.street} ?`}
        description="La visite et sa date de retour seront supprimées définitivement."
        itemId={visit.id}
        action={deleteVisitAction}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Retirer ${visit.street}`}>
            <Trash2Icon />
          </Button>
        }
      />
    </div>
  );
}
