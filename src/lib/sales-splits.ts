import type { SalesSplitProfile, Worker } from "@/types/domain";

export const SALES_SPLIT_PROFILES = [
  "legacy_standard",
  "alexis_sale",
  "guillaume_sale",
  "po_sale",
  "split_alexis_guillaume",
] as const satisfies readonly SalesSplitProfile[];

export const ACTIVE_SALES_SPLIT_PROFILES = [
  "alexis_sale",
  "guillaume_sale",
  "po_sale",
  "split_alexis_guillaume",
] as const satisfies readonly SalesSplitProfile[];

export const SALES_SPLIT_LABELS: Record<SalesSplitProfile, string> = {
  legacy_standard: "Historique Alexis/Guillaume",
  alexis_sale: "Alexis",
  guillaume_sale: "Guillaume",
  po_sale: "P-O",
  split_alexis_guillaume: "Split Alexis + Guillaume",
};

export const SALES_SPLIT_PERCENTAGES: Record<SalesSplitProfile, Array<{ name: string; percentage: number }>> = {
  legacy_standard: [
    { name: "Alexis", percentage: 40 },
    { name: "Guillaume", percentage: 40 },
    { name: "Gaz", percentage: 20 },
    { name: "P-O", percentage: 0 },
    { name: "Produits", percentage: 0 },
  ],
  alexis_sale: [
    { name: "Alexis", percentage: 50 },
    { name: "Guillaume", percentage: 35 },
    { name: "Gaz", percentage: 15 },
    { name: "P-O", percentage: 0 },
    { name: "Produits", percentage: 0 },
  ],
  guillaume_sale: [
    { name: "Alexis", percentage: 35 },
    { name: "Guillaume", percentage: 50 },
    { name: "Gaz", percentage: 15 },
    { name: "P-O", percentage: 0 },
    { name: "Produits", percentage: 0 },
  ],
  po_sale: [
    { name: "Alexis", percentage: 35 },
    { name: "Guillaume", percentage: 35 },
    { name: "Gaz", percentage: 15 },
    { name: "P-O", percentage: 15 },
    { name: "Produits", percentage: 0 },
  ],
  split_alexis_guillaume: [
    { name: "Alexis", percentage: 40 },
    { name: "Guillaume", percentage: 40 },
    { name: "Gaz", percentage: 15 },
    { name: "P-O", percentage: 0 },
    { name: "Produits", percentage: 5 },
  ],
};

type WorkerRole = "alexis" | "guillaume" | "po";

const WORKER_ROLE_LABELS: Record<WorkerRole, string> = {
  alexis: "Alexis",
  guillaume: "Guillaume",
  po: "P-O",
};

const PROFILE_BY_WORKER_ROLE: Record<WorkerRole, SalesSplitProfile> = {
  alexis: "alexis_sale",
  guillaume: "guillaume_sale",
  po: "po_sale",
};

function normalizeWorkerName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function roleForWorker(worker: Pick<Worker, "name" | "salesSplitProfile">): WorkerRole | null {
  if (worker.salesSplitProfile === "alexis_sale") return "alexis";
  if (worker.salesSplitProfile === "guillaume_sale") return "guillaume";
  if (worker.salesSplitProfile === "po_sale") return "po";

  const normalized = normalizeWorkerName(worker.name);
  if (normalized === "alexis" || normalized === "alex") return "alexis";
  if (normalized === "guillaume" || normalized === "guigui") return "guillaume";
  if (normalized === "po" || normalized === "poo") return "po";
  return null;
}

export function findWorkerForSalesSplit(workers: Worker[], profile: SalesSplitProfile) {
  return workers.find((worker) => {
    const role = roleForWorker(worker);
    return role ? PROFILE_BY_WORKER_ROLE[role] === profile : false;
  }) ?? null;
}

export function salesSplitLabel(profile: SalesSplitProfile) {
  return SALES_SPLIT_LABELS[profile] ?? SALES_SPLIT_LABELS.legacy_standard;
}

export function salesSplitOptions(workers: Worker[], selectedProfile?: SalesSplitProfile | null) {
  const activeWorkers = workers.filter((worker) => worker.active);
  const options: Array<{ value: SalesSplitProfile; label: string }> = [];

  for (const role of ["alexis", "guillaume", "po"] as const) {
    const worker = activeWorkers.find((item) => roleForWorker(item) === role);
    if (worker) {
      options.push({ value: PROFILE_BY_WORKER_ROLE[role], label: worker.name || WORKER_ROLE_LABELS[role] });
    }
  }

  const hasAlexis = activeWorkers.some((worker) => roleForWorker(worker) === "alexis");
  const hasGuillaume = activeWorkers.some((worker) => roleForWorker(worker) === "guillaume");
  if (hasAlexis && hasGuillaume) {
    options.push({ value: "split_alexis_guillaume", label: SALES_SPLIT_LABELS.split_alexis_guillaume });
  }

  if (selectedProfile && !options.some((option) => option.value === selectedProfile)) {
    options.push({ value: selectedProfile, label: salesSplitLabel(selectedProfile) });
  }

  return options;
}

export function serializeWorkerIds(workerIds: string[]) {
  return [...new Set(workerIds.filter(Boolean))].toSorted().join(",");
}

export function parseWorkerIdList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function cleanerPairOptions(workers: Worker[], selectedWorkerIds: string[] = []) {
  const activeWorkers = workers.filter((worker) => worker.active);
  const workerByRole = new Map<WorkerRole, Worker>();
  for (const worker of activeWorkers) {
    const role = roleForWorker(worker);
    if (role) workerByRole.set(role, worker);
  }

  const pairs: Array<[WorkerRole, WorkerRole]> = [
    ["alexis", "guillaume"],
    ["alexis", "po"],
    ["guillaume", "po"],
  ];

  const options = pairs.flatMap(([left, right]) => {
    const leftWorker = workerByRole.get(left);
    const rightWorker = workerByRole.get(right);
    if (!leftWorker || !rightWorker) return [];
    return [{
      value: serializeWorkerIds([leftWorker.id, rightWorker.id]),
      label: `${leftWorker.name} + ${rightWorker.name}`,
    }];
  });

  const selectedValue = serializeWorkerIds(selectedWorkerIds);
  if (selectedValue && !options.some((option) => option.value === selectedValue)) {
    const names = selectedWorkerIds
      .map((workerId) => workers.find((worker) => worker.id === workerId)?.name)
      .filter((name): name is string => Boolean(name));
    options.push({
      value: selectedValue,
      label: names.length > 0 ? `Actuel : ${names.join(" + ")}` : "Sélection actuelle",
    });
  }

  return options;
}
