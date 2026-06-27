"use client";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cleanerPairOptions, salesSplitOptions, serializeWorkerIds } from "@/lib/sales-splits";
import type { Job, Worker } from "@/types/domain";

type JobAssignmentFieldsProps = {
  workers: Worker[];
  job?: Pick<Job, "id" | "salesSplitProfile" | "workerIds">;
};

export function JobAssignmentFields({ workers, job }: JobAssignmentFieldsProps) {
  const saleOptions = salesSplitOptions(workers, job?.salesSplitProfile);
  const cleanerOptions = cleanerPairOptions(workers, job?.workerIds);
  const defaultSaleProfile =
    job?.salesSplitProfile ??
    saleOptions.find((option) => option.value === "split_alexis_guillaume")?.value ??
    saleOptions[0]?.value ??
    "split_alexis_guillaume";
  const defaultCleanerValue =
    job?.workerIds && job.workerIds.length > 0
      ? serializeWorkerIds(job.workerIds)
      : cleanerOptions[0]?.value ?? "";

  return (
    <>
      <Field>
        <FieldLabel htmlFor={job ? `job-sale-${job.id}` : "job-sale"}>Vente faite par</FieldLabel>
        <NativeSelect
          id={job ? `job-sale-${job.id}` : "job-sale"}
          name="salesSplitProfile"
          className="w-full"
          defaultValue={defaultSaleProfile}
          required
        >
          {saleOptions.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>Ce choix calcule seulement la répartition du prix du contrat, pas le pourboire.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={job ? `job-cleaners-${job.id}` : "job-cleaners"}>Nettoyé par</FieldLabel>
        <NativeSelect
          id={job ? `job-cleaners-${job.id}` : "job-cleaners"}
          name="cleanerWorkerIds"
          className="w-full"
          defaultValue={defaultCleanerValue}
          required
        >
          {cleanerOptions.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>Le pourboire est divisé également entre ces personnes.</FieldDescription>
      </Field>
    </>
  );
}
