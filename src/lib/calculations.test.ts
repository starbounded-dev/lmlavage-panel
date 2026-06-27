import { describe, expect, it } from "vitest";
import {
  allocationPercentagesForProfile,
  calculateAllocationSnapshot,
  calculateIncludedTaxes,
  calculateTaxes,
  nextFollowupDate,
} from "@/lib/calculations";

describe("calculs financiers", () => {
  it("laisse les taxes désactivées par défaut", () => {
    expect(calculateTaxes(100, { gstEnabled: false, qstEnabled: false, gstRate: 0.05, qstRate: 0.09975 })).toEqual({ gst: 0, qst: 0, total: 100 });
  });

  it("calcule les taxes du Québec au cent près", () => {
    expect(calculateTaxes(100, { gstEnabled: true, qstEnabled: true, gstRate: 0.05, qstRate: 0.09975 })).toEqual({ gst: 5, qst: 9.98, total: 114.98 });
  });

  it("extrait les taxes d'un total taxes incluses", () => {
    expect(calculateIncludedTaxes(114.98, { gstEnabled: true, qstEnabled: true, gstRate: 0.05, qstRate: 0.09975 })).toEqual({
      subtotal: 100,
      gst: 5,
      qst: 9.98,
      total: 114.98,
    });
  });

  it("conserve le total lorsque les taxes sont désactivées", () => {
    expect(calculateIncludedTaxes(42.35, { gstEnabled: false, qstEnabled: false, gstRate: 0.05, qstRate: 0.09975 })).toEqual({
      subtotal: 42.35,
      gst: 0,
      qst: 0,
      total: 42.35,
    });
  });

  it("refuse une répartition qui ne totalise pas 100 %", () => {
    expect(() => calculateAllocationSnapshot(600, [{ name: "Alexis", percentage: 35 }])).toThrow(/100/);
  });

  it("utilise 35/35/15/15/0 lorsque P-O fait la vente", () => {
    const result = calculateAllocationSnapshot(600, allocationPercentagesForProfile("po_sale"));
    expect(result.map(({ amount }) => amount)).toEqual([210, 210, 90, 90, 0]);
    expect(result.reduce((sum, item) => sum + item.amount, 0)).toBe(600);
  });

  it("utilise 50/35/15 lorsqu'Alexis fait la vente", () => {
    const result = calculateAllocationSnapshot(600, allocationPercentagesForProfile("alexis_sale"));
    expect(result.map(({ amount }) => amount)).toEqual([300, 210, 90, 0, 0]);
    expect(result.reduce((sum, item) => sum + item.amount, 0)).toBe(600);
  });

  it("utilise 35/50/15 lorsque Guillaume fait la vente", () => {
    const result = calculateAllocationSnapshot(600, allocationPercentagesForProfile("guillaume_sale"));
    expect(result.map(({ amount }) => amount)).toEqual([210, 300, 90, 0, 0]);
    expect(result.reduce((sum, item) => sum + item.amount, 0)).toBe(600);
  });

  it("utilise 40/40/15/5 lorsque Alexis et Guillaume split la vente", () => {
    const result = calculateAllocationSnapshot(600, allocationPercentagesForProfile("split_alexis_guillaume"));
    expect(result.map(({ amount }) => amount)).toEqual([240, 240, 90, 0, 30]);
    expect(result.reduce((sum, item) => sum + item.amount, 0)).toBe(600);
  });

  it("conserve 40/40/20/0/0 pour l'historique", () => {
    const result = calculateAllocationSnapshot(600, allocationPercentagesForProfile("legacy_standard"));
    expect(result.map(({ amount }) => amount)).toEqual([240, 240, 120, 0, 0]);
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
