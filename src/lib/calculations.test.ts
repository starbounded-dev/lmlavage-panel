import { describe, expect, it } from "vitest";
import { calculateAllocationSnapshot, calculateTaxes, nextFollowupDate } from "@/lib/calculations";

describe("calculs financiers", () => {
  it("laisse les taxes désactivées par défaut", () => {
    expect(calculateTaxes(100, { gstEnabled: false, qstEnabled: false, gstRate: 0.05, qstRate: 0.09975 })).toEqual({ gst: 0, qst: 0, total: 100 });
  });

  it("calcule les taxes du Québec au cent près", () => {
    expect(calculateTaxes(100, { gstEnabled: true, qstEnabled: true, gstRate: 0.05, qstRate: 0.09975 })).toEqual({ gst: 5, qst: 9.98, total: 114.98 });
  });

  it("refuse une répartition qui ne totalise pas 100 %", () => {
    expect(() => calculateAllocationSnapshot(600, [{ name: "Alexis", percentage: 35 }])).toThrow(/100/);
  });

  it("répartit seulement les revenus de service et exclut les pourboires", () => {
    const result = calculateAllocationSnapshot(600, [
      { name: "Alexis", percentage: 35 }, { name: "Guillaume", percentage: 35 },
      { name: "Gaz", percentage: 15 }, { name: "P-O", percentage: 15 },
    ]);
    expect(result.map(({ amount }) => amount)).toEqual([210, 210, 90, 90]);
    expect(result.reduce((sum, item) => sum + item.amount, 0)).toBe(600);
  });

  it("conserve le total malgré les arrondis", () => {
    const result = calculateAllocationSnapshot(10, [{ name: "A", percentage: 33.33 }, { name: "B", percentage: 33.33 }, { name: "C", percentage: 33.34 }]);
    expect(result.reduce((sum, item) => sum + item.amount, 0)).toBe(10);
  });

  it("propose un retour 12 mois plus tard", () => {
    expect(nextFollowupDate(new Date("2026-05-30T12:00:00Z"), 12).toISOString().slice(0, 10)).toBe("2027-05-30");
  });
});
