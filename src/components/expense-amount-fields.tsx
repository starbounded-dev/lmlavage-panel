"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { calculateIncludedTaxes, calculateTaxes } from "@/lib/calculations";
import { formatCad } from "@/lib/format";
import type { Business } from "@/types/domain";

type ExpenseAmountFieldsProps = {
  idPrefix: string;
  business: Business;
  initialSubtotal?: number;
};

export function ExpenseAmountFields({ idPrefix, business, initialSubtotal = 0 }: ExpenseAmountFieldsProps) {
  const [mode, setMode] = useState<"subtotal" | "total">("subtotal");
  const [amount, setAmount] = useState(initialSubtotal ? String(initialSubtotal) : "");
  const numericAmount = Number(amount) || 0;
  const settings = {
    gstEnabled: business.gstEnabled,
    qstEnabled: business.qstEnabled,
    gstRate: business.gstRate,
    qstRate: business.qstRate,
  };
  const calculated = mode === "subtotal"
    ? { subtotal: numericAmount, ...calculateTaxes(numericAmount, settings) }
    : calculateIncludedTaxes(numericAmount, settings);

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-amount-mode`}>Type de montant</FieldLabel>
        <NativeSelect
          id={`${idPrefix}-amount-mode`}
          name="amountMode"
          value={mode}
          onChange={(event) => setMode(event.target.value as "subtotal" | "total")}
          className="w-full"
        >
          <NativeSelectOption value="subtotal">Sous-total avant taxes</NativeSelectOption>
          <NativeSelectOption value="total">Total taxes incluses</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-amount`}>
          {mode === "subtotal" ? "Sous-total" : "Total payé"}
        </FieldLabel>
        <Input
          id={`${idPrefix}-amount`}
          name="amount"
          type="number"
          min="0"
          max="1000000"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <FieldDescription>
          {business.gstEnabled || business.qstEnabled
            ? "Les taxes actives sont calculées automatiquement."
            : "Les taxes sont désactivées dans les paramètres de l’entreprise."}
        </FieldDescription>
      </Field>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-2 sm:grid-cols-4">
        <p><span className="block text-xs text-muted-foreground">Sous-total</span><span className="font-mono font-medium">{formatCad(calculated.subtotal)}</span></p>
        <p><span className="block text-xs text-muted-foreground">TPS</span><span className="font-mono font-medium">{formatCad(calculated.gst)}</span></p>
        <p><span className="block text-xs text-muted-foreground">TVQ</span><span className="font-mono font-medium">{formatCad(calculated.qst)}</span></p>
        <p><span className="block text-xs text-muted-foreground">Total</span><span className="font-mono font-semibold text-primary">{formatCad(calculated.total)}</span></p>
      </div>
    </div>
  );
}
