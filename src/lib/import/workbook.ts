import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

export type ImportedJob = {
  sourceRow: number;
  clientName: string;
  needsReview: boolean;
  address: string;
  serviceScope: "inside" | "outside" | "both";
  serviceRevenue: number;
  tip: number;
  completedOn: string;
  followupDate: string | null;
};

export type ImportedExpense = {
  sourceRow: number;
  vendor: string;
  date: string;
  total: number;
};

export type ImportedStreet = {
  sourceRow: number;
  street: string;
  city: string;
};

export type ImportedAllocation = {
  sourceRow: number;
  name: string;
  percentage: number;
};

export type WorkbookPreview = {
  fingerprint: string;
  jobs: ImportedJob[];
  expenses: ImportedExpense[];
  streets: ImportedStreet[];
  allocations: ImportedAllocation[];
  totals: {
    serviceRevenue: number;
    tips: number;
    collected: number;
    expenses: number;
    allocationPercentage: number;
  };
  warnings: string[];
};

function textValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined) {
      return textValue(value.result as ExcelJS.CellValue);
    }
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value) return String(value.text);
  }
  return String(value).trim();
}

function numberValue(value: ExcelJS.CellValue): number {
  const raw = textValue(value).replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: ExcelJS.CellValue): string | null {
  const raw = textValue(value);
  if (!raw || raw.toLowerCase() === "non") return null;
  const date = new Date(raw);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function parseLmWorkbook(buffer: Buffer): Promise<WorkbookPreview> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Le classeur ne contient aucune feuille.");

  const jobs: ImportedJob[] = [];
  for (let rowNumber = 16; rowNumber <= 33; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const address = textValue(row.getCell(2).value);
    if (!address) continue;
    const rawName = textValue(row.getCell(4).value);
    const rawScope = textValue(row.getCell(6).value).toLowerCase();
    jobs.push({
      sourceRow: rowNumber,
      clientName: rawName === "?" || !rawName ? "Client à confirmer" : rawName,
      needsReview: rawName === "?" || !rawName,
      address,
      serviceScope: rawScope.includes("in") && rawScope.includes("out") ? "both" : rawScope.includes("in") ? "inside" : "outside",
      serviceRevenue: roundMoney(numberValue(row.getCell(8).value)),
      tip: roundMoney(numberValue(row.getCell(10).value)),
      completedOn: dateValue(row.getCell(11).value) ?? "2026-01-01",
      followupDate: dateValue(row.getCell(13).value),
    });
  }

  const expenses: ImportedExpense[] = [];
  for (let rowNumber = 2; rowNumber <= 11; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const label = textValue(row.getCell(1).value);
    const total = roundMoney(numberValue(row.getCell(2).value));
    if (!label || total <= 0) continue;
    const dateMatch = label.match(/\((\d{4}-\d{2}-\d{2})\)\s*$/);
    expenses.push({
      sourceRow: rowNumber,
      vendor: label.replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, "").trim(),
      date: dateMatch?.[1] ?? "2026-01-01",
      total,
    });
  }

  const streets: ImportedStreet[] = [];
  for (let rowNumber = 2; rowNumber <= 11; rowNumber += 1) {
    const raw = textValue(sheet.getRow(rowNumber).getCell(5).value);
    if (!raw) continue;
    const match = raw.match(/^(.*?)\s*\(\s*([^,]+),\s*QC\s*\)\s*$/i);
    streets.push({ sourceRow: rowNumber, street: (match?.[1] ?? raw).trim(), city: (match?.[2] ?? "Gatineau").trim() });
  }

  const allocations: ImportedAllocation[] = [];
  for (let rowNumber = 42; rowNumber <= 45; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const name = textValue(row.getCell(1).value).replace(/^P-O\s*$/i, "P-O");
    if (!name) continue;
    allocations.push({ sourceRow: rowNumber, name, percentage: numberValue(row.getCell(2).value) * 100 });
  }

  const serviceRevenue = roundMoney(jobs.reduce((sum, job) => sum + job.serviceRevenue, 0));
  const tips = roundMoney(jobs.reduce((sum, job) => sum + job.tip, 0));
  const expenseTotal = roundMoney(expenses.reduce((sum, expense) => sum + expense.total, 0));
  const allocationPercentage = roundMoney(allocations.reduce((sum, allocation) => sum + allocation.percentage, 0));
  const warnings = jobs.filter((job) => job.needsReview).map((job) => `Ligne ${job.sourceRow}: le nom du client doit être confirmé.`);
  warnings.push("Les travaux historiques utilisent la règle 40 % Alexis, 40 % Guillaume, 20 % gaz et 0 % P-O.");
  if (tips > 0) warnings.push(`${tips.toFixed(2)} $ de pourboires historiques sont non attribués et doivent être révisés.`);

  return {
    fingerprint: createHash("sha256").update(buffer).digest("hex"),
    jobs,
    expenses,
    streets,
    allocations,
    totals: { serviceRevenue, tips, collected: roundMoney(serviceRevenue + tips), expenses: expenseTotal, allocationPercentage },
    warnings,
  };
}
