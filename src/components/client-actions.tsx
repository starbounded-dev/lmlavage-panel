"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { deleteClientAction, updateClientAction } from "@/app/actions";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { MutationDialog } from "@/components/mutation-dialog";
import { MapPickerLazy } from "@/components/map-picker-lazy";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/types/domain";

export function ClientActions({ client }: { client: Client }) {
  const property = client.properties[0];
  const clientLabel = client.name ?? `Client #${client.clientNumber}`;

  return (
    <div className="flex items-center gap-2">
      <MutationDialog
        title={`Modifier ${clientLabel}`}
        description="Seul le numéro client est obligatoire. Cette adresse correspond à la propriété principale."
        action={updateClientAction}
        trigger={
          <Button variant="outline" size="sm">
            <PencilIcon data-icon="inline-start" />
            Modifier
          </Button>
        }
      >
        <input type="hidden" name="clientId" value={client.id} />
        <input type="hidden" name="propertyId" value={property?.id ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`client-number-${client.id}`}>Numéro client</FieldLabel>
            <Input id={`client-number-${client.id}`} name="clientNumber" type="number" min="1" defaultValue={client.clientNumber} required />
          </Field>
          <Field>
            <FieldLabel htmlFor={`client-name-${client.id}`}>Nom</FieldLabel>
            <Input id={`client-name-${client.id}`} name="name" defaultValue={client.name ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`client-phone-${client.id}`}>Téléphone</FieldLabel>
            <Input id={`client-phone-${client.id}`} name="phone" type="tel" defaultValue={client.phone ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`client-email-${client.id}`}>Courriel</FieldLabel>
            <Input id={`client-email-${client.id}`} name="email" type="email" defaultValue={client.email ?? ""} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={`client-address-${client.id}`}>Adresse principale</FieldLabel>
            <Input id={`client-address-${client.id}`} name="address" defaultValue={property?.address ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`client-city-${client.id}`}>Ville</FieldLabel>
            <Input id={`client-city-${client.id}`} name="city" defaultValue={property?.city ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`client-province-${client.id}`}>Province</FieldLabel>
            <Input id={`client-province-${client.id}`} name="province" maxLength={3} defaultValue={property?.province ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`client-postal-${client.id}`}>Code postal</FieldLabel>
            <Input id={`client-postal-${client.id}`} name="postalCode" defaultValue={property?.postalCode ?? ""} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Maison sur la carte (facultatif)</FieldLabel>
            <FieldDescription>Le marqueur vert sera visible dans la carte de prospection.</FieldDescription>
            <MapPickerLazy
              name="propertyCoordinates"
              mode="point"
              initialCoordinates={property?.latitude != null && property.longitude != null ? [[property.latitude, property.longitude]] : []}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={`client-notes-${client.id}`}>Notes</FieldLabel>
            <Textarea id={`client-notes-${client.id}`} name="notes" defaultValue={client.notes ?? ""} />
          </Field>
        </div>
      </MutationDialog>

      <DeleteConfirmationDialog
        title={`Supprimer ${clientLabel} ?`}
        description="Cette action est définitive. La suppression sera bloquée si des travaux sont encore associés au client."
        itemId={client.id}
        action={deleteClientAction}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${clientLabel}`}>
            <Trash2Icon />
          </Button>
        }
      />
    </div>
  );
}
