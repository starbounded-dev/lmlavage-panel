"use client";

import { PencilIcon } from "lucide-react";
import { updateExpenseAction } from "@/app/actions";
import { MutationDialog } from "@/components/mutation-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Expense, Job } from "@/types/domain";

export function ExpenseActions({ expense, jobs }: { expense: Expense; jobs: Job[] }) {
  return (
    <MutationDialog
      title={`Modifier ${expense.vendor}`}
      description="Corrigez les montants ou téléversez un nouveau reçu pour remplacer l’ancien."
      action={updateExpenseAction}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Modifier la dépense ${expense.vendor}`}>
          <PencilIcon />
        </Button>
      }
    >
      <input type="hidden" name="expenseId" value={expense.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`expense-date-${expense.id}`}>Date</FieldLabel>
          <Input id={`expense-date-${expense.id}`} name="date" type="date" defaultValue={expense.date} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`expense-vendor-${expense.id}`}>Fournisseur</FieldLabel>
          <Input id={`expense-vendor-${expense.id}`} name="vendor" defaultValue={expense.vendor} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`expense-category-${expense.id}`}>Catégorie</FieldLabel>
          <Input id={`expense-category-${expense.id}`} name="category" defaultValue={expense.category} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`expense-method-${expense.id}`}>Mode de paiement</FieldLabel>
          <Input id={`expense-method-${expense.id}`} name="paymentMethod" defaultValue={expense.paymentMethod ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`expense-job-${expense.id}`}>Travail lié</FieldLabel>
          <NativeSelect id={`expense-job-${expense.id}`} name="jobId" defaultValue={expense.jobId ?? ""} className="w-full">
            <NativeSelectOption value="">Aucun travail</NativeSelectOption>
            {jobs.map((job) => <NativeSelectOption key={job.id} value={job.id}>{job.clientName} — {job.address}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`expense-receipt-${expense.id}`}>Nouveau reçu</FieldLabel>
          <Input id={`expense-receipt-${expense.id}`} name="receipt" type="file" accept="image/jpeg,image/png,application/pdf" />
          <FieldDescription>{expense.receiptPath ? "Laisser vide pour conserver le reçu actuel." : "JPG, PNG ou PDF, maximum 10 Mo."}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`expense-subtotal-${expense.id}`}>Sous-total</FieldLabel>
          <Input id={`expense-subtotal-${expense.id}`} name="subtotal" type="number" min="0" step="0.01" defaultValue={expense.subtotal} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`expense-gst-${expense.id}`}>TPS</FieldLabel>
          <Input id={`expense-gst-${expense.id}`} name="gstAmount" type="number" min="0" step="0.01" defaultValue={expense.gstAmount} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`expense-qst-${expense.id}`}>TVQ</FieldLabel>
          <Input id={`expense-qst-${expense.id}`} name="qstAmount" type="number" min="0" step="0.01" defaultValue={expense.qstAmount} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`expense-notes-${expense.id}`}>Notes</FieldLabel>
          <Textarea id={`expense-notes-${expense.id}`} name="notes" defaultValue={expense.notes ?? ""} />
        </Field>
      </div>
    </MutationDialog>
  );
}
