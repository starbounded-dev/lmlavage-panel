"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CalendarPlusIcon, MapPinnedIcon, ReceiptTextIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import {
  createClientAction,
  createExpenseAction,
  createJobAction,
  createVisitAction,
  type ActionResult,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, Job, Worker } from "@/types/domain";

type DialogFormProps = {
  title: string;
  description: string;
  trigger: React.ReactNode;
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
};

function DialogForm({ title, description, trigger, action, children }: DialogFormProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(result.message);
        form.reset();
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement}>{null}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>{children}</FieldGroup>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewClientDialog() {
  return (
    <DialogForm
      title="Nouveau client"
      description="Ajoutez le contact et sa première adresse de service."
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
          <FieldLabel htmlFor="client-name">Nom</FieldLabel>
          <Input id="client-name" name="name" required />
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
          <FieldLabel htmlFor="client-address">Adresse</FieldLabel>
          <Input id="client-address" name="address" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-city">Ville</FieldLabel>
          <Input id="client-city" name="city" defaultValue="Gatineau" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-province">Province</FieldLabel>
          <Input id="client-province" name="province" defaultValue="QC" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-postal">Code postal</FieldLabel>
          <Input id="client-postal" name="postalCode" />
        </Field>
      </div>
    </DialogForm>
  );
}

export function NewJobDialog({ clients, workers }: { clients: Client[]; workers: Worker[] }) {
  const properties = clients.flatMap((client) =>
    client.properties.map((property) => ({ ...property, clientName: client.name }))
  );

  return (
    <DialogForm
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
                {property.clientName} — {property.address}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="job-start">Début</FieldLabel>
          <Input id="job-start" name="startsAt" type="datetime-local" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="job-end">Fin</FieldLabel>
          <Input id="job-end" name="endsAt" type="datetime-local" required />
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
    </DialogForm>
  );
}

export function NewExpenseDialog({ jobs }: { jobs: Job[] }) {
  return (
    <DialogForm
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
        <Field>
          <FieldLabel htmlFor="expense-subtotal">Sous-total</FieldLabel>
          <Input id="expense-subtotal" name="subtotal" type="number" min="0" step="0.01" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-gst">TPS</FieldLabel>
          <Input id="expense-gst" name="gstAmount" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-qst">TVQ</FieldLabel>
          <Input id="expense-qst" name="qstAmount" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="expense-notes">Notes</FieldLabel>
          <Textarea id="expense-notes" name="notes" />
        </Field>
      </div>
    </DialogForm>
  );
}

export function NewVisitDialog() {
  return (
    <DialogForm
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
    </DialogForm>
  );
}
