import { addMonths } from "date-fns";
import { SALES_SPLIT_PERCENTAGES } from "@/lib/sales-splits";
import type { SalesSplitProfile } from "@/types/domain";

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateTaxes(
  subtotal: number,
  settings: {
    gstEnabled: boolean;
    qstEnabled: boolean;
    gstRate: number;
    qstRate: number;
  }
) {
  const gst = settings.gstEnabled ? roundMoney(subtotal * settings.gstRate) : 0;
  const qst = settings.qstEnabled ? roundMoney(subtotal * settings.qstRate) : 0;

  return {
    gst,
    qst,
    total: roundMoney(subtotal + gst + qst),
  };
}

export function calculateIncludedTaxes(
  total: number,
  settings: {
    gstEnabled: boolean;
    qstEnabled: boolean;
    gstRate: number;
    qstRate: number;
  }
) {
  const combinedRate =
    (settings.gstEnabled ? settings.gstRate : 0) +
    (settings.qstEnabled ? settings.qstRate : 0);

  if (combinedRate === 0) {
    return { subtotal: roundMoney(total), gst: 0, qst: 0, total: roundMoney(total) };
  }

  const divisor = 1 + combinedRate;
  const gst = settings.gstEnabled ? roundMoney((total * settings.gstRate) / divisor) : 0;
  const qst = settings.qstEnabled ? roundMoney((total * settings.qstRate) / divisor) : 0;
  const subtotal = roundMoney(total - gst - qst);

  return { subtotal, gst, qst, total: roundMoney(total) };
}

export function calculateAllocationSnapshot(
  eligibleServiceRevenue: number,
  buckets: Array<{ name: string; percentage: number }>
) {
  const percentageTotal = roundMoney(
    buckets.reduce((total, bucket) => total + bucket.percentage, 0)
  );

  if (percentageTotal !== 100) {
    throw new Error("Les pourcentages de répartition doivent totaliser 100 %.");
  }

  let allocated = 0;
  return buckets.map((bucket, index) => {
    const amount = index === buckets.length - 1
      ? roundMoney(eligibleServiceRevenue - allocated)
      : roundMoney(eligibleServiceRevenue * (bucket.percentage / 100));
    allocated = roundMoney(allocated + amount);
    return { ...bucket, amount };
  });
}

export function allocationPercentagesForProfile(profile: SalesSplitProfile) {
  return SALES_SPLIT_PERCENTAGES[profile] ?? SALES_SPLIT_PERCENTAGES.legacy_standard;
}

export function nextFollowupDate(completedAt: Date, months = 12) {
  return addMonths(completedAt, months);
}
