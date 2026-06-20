"use client";

import { CalendarPlusIcon, MapPinnedIcon, ReceiptTextIcon, UserPlusIcon } from "lucide-react";
import {
  createClientAction,
  createExpenseAction,
  createJobAction,
  createVisitAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpenseAmountFields } from "@/components/expense-amount-fields";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MutationDialog } from "@/components/mutation-dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Business, Client, Job, Worker } from "@/types/domain";

export function NewClientDialog({ nextClientNumber }: { nextClientNumber: number }) {
  return (
    <MutationDialog
      title="Nouveau client"
      description="Seul le numéro client est obligatoire. Les autres informations peuvent être ajoutées plus tard."
      action={createClientAction}
      trigger={
        <Button>
          <UserPlusIcon data-icon="inline-start" />
          Nouveau client
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="client-number">Numéro client</FieldLabel>
          <Input id="client-number" name="clientNumber" type="number" min="1" defaultValue={nextClientNumber} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-name">Nom (facultatif)</FieldLabel>
          <Input id="client-name" name="name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-phone">Téléphone</FieldLabel>
          <Input id="client-phone" name="phone" type="tel" />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="client-email">Courriel</FieldLabel>
          <Input id="client-email" name="email" type="email" />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="client-address">Adresse (facultative)</FieldLabel>
          <Input id="client-address" name="address" />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-city">Ville</FieldLabel>
          <Input id="client-city" name="city" />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-province">Province</FieldLabel>
          <Input id="client-province" name="province" maxLength={3} />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-postal">Code postal</FieldLabel>
          <Input id="client-postal" name="postalCode" />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="client-notes">Notes</FieldLabel>
          <Textarea id="client-notes" name="notes" />
        </Field>
      </div>
    </MutationDialog>
  );
}

export function NewJobDialog({ clients, workers }: { clients: Client[]; workers: Worker[] }) {
  const properties = clients.flatMap((client) =>
    client.properties.map((property) => ({ ...property, clientName: client.name ?? `Client #${client.clientNumber}` }))
  );

  return (
    <MutationDialog
      title="Nouveau travail"
      description="Planifiez l’intervention; le calendrier Google sera synchronisé ensuite."
      action={createJobAction}
      trigger={
        <Button>
          <CalendarPlusIcon data-icon="inline-start" />
          Nouveau travail
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="job-property">Client et adresse</FieldLabel>
          <NativeSelect id="job-property" name="propertyId" className="w-full" required>
            <NativeSelectOption value="">Choisir une propriété</NativeSelectOption>
            {properties.map((property) => (
              <NativeSelectOption key={property.id} value={property.id}>
                {property.clientName} — {property.address ?? "Adresse à confirmer"}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="job-date">Date du travail</FieldLabel>
          <Input id="job-date" name="jobDate" type="date" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="job-start-time">Heure de début (facultative)</FieldLabel>
          <Input id="job-start-time" name="startTime" type="time" />
        </Field>
        <Field>
          <FieldLabel htmlFor="job-end-time">Heure de fin (facultative)</FieldLabel>
          <Input id="job-end-time" name="endTime" type="time" />
          <FieldDescription>Indiquez les deux heures ou laissez les deux champs vides.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="job-scope">Service</FieldLabel>
          <NativeSelect id="job-scope" name="serviceScope" className="w-full" defaultValue="both">
            <NativeSelectOption value="inside">Intérieur</NativeSelectOption>
            <NativeSelectOption value="outside">Extérieur</NativeSelectOption>
            <NativeSelectOption value="both">Intérieur / extérieur</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="job-seller">Vente faite par</FieldLabel>
          <NativeSelect id="job-seller" name="sellerWorkerId" className="w-full" required>
            <NativeSelectOption value="">Choisir le vendeur</NativeSelectOption>
            {workers.filter((worker) => worker.active).map((worker) => (
              <NativeSelectOption key={worker.id} value={worker.id}>{worker.name}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="job-windows">Nombre de fenêtres</FieldLabel>
          <Input id="job-windows" name="windowCount" type="number" min="0" />
        </Field>
        <Field>
          <FieldLabel htmlFor="job-price">Prix avant taxes</FieldLabel>
          <Input id="job-price" name="serviceSubtotal" type="number" min="0" step="0.01" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="job-followup">Date de retour suggérée</FieldLabel>
          <Input id="job-followup" name="followupDate" type="date" />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>Travailleurs</FieldLabel>
          <div className="flex flex-wrap gap-4 rounded-lg border p-3">
            {workers.filter((worker) => worker.active).map((worker) => (
              <label key={worker.id} className="flex items-center gap-2 text-sm">
                <Checkbox name="workerIds" value={worker.id} />
                {worker.name}
              </label>
            ))}
          </div>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="job-notes">Notes</FieldLabel>
          <Textarea id="job-notes" name="notes" />
        </Field>
      </div>
    </MutationDialog>
  );
}

export function NewExpenseDialog({ jobs, business }: { jobs: Job[]; business: Business }) {
  return (
    <MutationDialog
      title="Nouvelle dépense"
      description="Ajoutez une dépense d’entreprise et ses taxes."
      action={createExpenseAction}
      trigger={
        <Button>
          <ReceiptTextIcon data-icon="inline-start" />
          Nouvelle dépense
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="expense-date">Date</FieldLabel>
          <Input id="expense-date" name="date" type="date" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-vendor">Fournisseur</FieldLabel>
          <Input id="expense-vendor" name="vendor" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-category">Catégorie</FieldLabel>
          <Input id="expense-category" name="category" list="expense-categories" defaultValue="Fournitures" required />
          <datalist id="expense-categories">{['Fournitures', 'Équipement', 'Carburant', 'Véhicule', 'Assurance', 'Marketing', 'Autre'].map((category) => <option key={category} value={category} />)}</datalist>
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-method">Mode de paiement</FieldLabel>
          <Input id="expense-method" name="paymentMethod" />
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-job">Travail lié (facultatif)</FieldLabel>
          <NativeSelect id="expense-job" name="jobId" className="w-full" defaultValue="">
            <NativeSelectOption value="">Aucun travail</NativeSelectOption>
            {jobs.map((job) => <NativeSelectOption key={job.id} value={job.id}>{job.clientName} — {job.address}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-receipt">Reçu (facultatif)</FieldLabel>
          <Input id="expense-receipt" name="receipt" type="file" accept="image/jpeg,image/png,application/pdf" />
        </Field>
        <ExpenseAmountFields idPrefix="new-expense" business={business} />
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="expense-notes">Notes</FieldLabel>
          <Textarea id="expense-notes" name="notes" />
        </Field>
      </div>
    </MutationDialog>
  );
}

export function NewVisitDialog() {
  return (
    <MutationDialog
      title="Nouvelle rue visitée"
      description="Consignez une tournée de prospection porte-à-porte."
      action={createVisitAction}
      trigger={
        <Button>
          <MapPinnedIcon data-icon="inline-start" />
          Ajouter une rue
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="visit-street">Rue</FieldLabel>
          <Input id="visit-street" name="street" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="visit-city">Ville</FieldLabel>
          <Input id="visit-city" name="city" defaultValue="Gatineau" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="visit-date">Date de visite</FieldLabel>
          <Input id="visit-date" name="visitedAt" type="date" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="visit-outcome">Résultat</FieldLabel>
          <NativeSelect id="visit-outcome" name="outcome" className="w-full" defaultValue="Rue visitée">
            <NativeSelectOption value="Rue visitée">Rue visitée</NativeSelectOption>
            <NativeSelectOption value="Clients obtenus">Clients obtenus</NativeSelectOption>
            <NativeSelectOption value="Clients obtenus et à revenir">Clients obtenus et à revenir</NativeSelectOption>
            <NativeSelectOption value="À revisiter">À revisiter</NativeSelectOption>
            <NativeSelectOption value="Aucun intérêt">Aucun intérêt</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="visit-revisit">Date de retour</FieldLabel>
          <Input id="visit-revisit" name="revisitDate" type="date" />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="visit-notes">Notes</FieldLabel>
          <Textarea id="visit-notes" name="notes" />
        </Field>
      </div>
    </MutationDialog>
  );
}
