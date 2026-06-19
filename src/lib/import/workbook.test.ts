import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLmWorkbook } from "@/lib/import/workbook";

describe("migration du classeur LM", () => {
  it("rapproche exactement les données historiques", async () => {
    const preview = await parseLmWorkbook(await readFile(join(process.cwd(), "Window Cleaning buisness (LM Lavages de Vitres).xlsx")));
    expect(preview.jobs).toHaveLength(5);
    expect(preview.expenses).toHaveLength(3);
    expect(preview.streets).toHaveLength(5);
    expect(preview.allocations).toHaveLength(4);
    expect(preview.totals).toEqual({ serviceRevenue: 600, tips: 30, collected: 630, expenses: 294.05, allocationPercentage: 100 });
    expect(preview.jobs.find((job) => job.needsReview)?.clientName).toBe("Client à confirmer");
    expect(preview.warnings.some((warning) => warning.includes("non attribués"))).toBe(true);
    expect(preview.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
