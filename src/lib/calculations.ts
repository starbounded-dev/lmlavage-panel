import { addMonths } from "date-fns";

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

export function allocationPercentagesForProfile(profile: "standard" | "po_sale") {
  return profile === "po_sale"
    ? [
        { name: "Alexis", percentage: 35 },
        { name: "Guillaume", percentage: 35 },
        { name: "Gaz", percentage: 15 },
        { name: "P-O", percentage: 15 },
      ]
    : [
        { name: "Alexis", percentage: 40 },
        { name: "Guillaume", percentage: 40 },
        { name: "Gaz", percentage: 20 },
        { name: "P-O", percentage: 0 },
      ];
}

export function nextFollowupDate(completedAt: Date, months = 12) {
  return addMonths(completedAt, months);
}
