"use client";

import { PencilIcon } from "lucide-react";
import { updateExpenseAction } from "@/app/actions";
import { ExpenseAmountFields } from "@/components/expense-amount-fields";
import { MutationDialog } from "@/components/mutation-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RECEIPT_ACCEPT, RECEIPT_VALIDATION_MESSAGE } from "@/lib/receipt-types";
import type { Business, Expense, Job, Worker } from "@/types/domain";

export function ExpenseActions({ expense, jobs, business, workers }: { expense: Expense; jobs: Job[]; business: Business; workers: Worker[] }) {
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
          <FieldLabel htmlFor={`expense-purchaser-${expense.id}`}>Acheté par</FieldLabel>
          <NativeSelect id={`expense-purchaser-${expense.id}`} name="purchaserWorkerId" defaultValue={expense.purchaserWorkerId ?? ""} className="w-full">
            <NativeSelectOption value="">Non précisé</NativeSelectOption>
            {workers.filter((worker) => worker.active).map((worker) => <NativeSelectOption key={worker.id} value={worker.id}>{worker.name}</NativeSelectOption>)}
          </NativeSelect>
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
          <Input id={`expense-receipt-${expense.id}`} name="receipt" type="file" accept={RECEIPT_ACCEPT} />
          <FieldDescription>{expense.receiptPath ? `Laisser vide pour conserver le reçu actuel. ${RECEIPT_VALIDATION_MESSAGE}` : RECEIPT_VALIDATION_MESSAGE}</FieldDescription>
        </Field>
        <ExpenseAmountFields idPrefix={`expense-${expense.id}`} business={business} initialSubtotal={expense.subtotal} />
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`expense-notes-${expense.id}`}>Notes</FieldLabel>
          <Textarea id={`expense-notes-${expense.id}`} name="notes" defaultValue={expense.notes ?? ""} />
        </Field>
      </div>
    </MutationDialog>
  );
}
