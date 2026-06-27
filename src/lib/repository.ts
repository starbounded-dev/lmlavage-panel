import "server-only";

import { demoData } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/env";
import { mapCoordinateFromDatabase, mapRouteFromDatabase } from "@/lib/map-geometry";
import { salesSplitLabel } from "@/lib/sales-splits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireBusinessId } from "@/lib/auth";
import type {
  AllocationBucket,
  AppData,
  Business,
  CanvassingVisit,
  Client,
  Expense,
  Job,
  Property,
  ProspectHouse,
  RevenuePoint,
  Worker,
} from "@/types/domain";

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function boolean(value: unknown) {
  return value === true;
}

function deriveRevenueSeries(jobs: Job[]): RevenuePoint[] {
  const months = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
  const currentYear = new Date().getFullYear();

  return months.map((month, index) => {
    const amountForYear = (year: number) =>
      jobs
        .filter((job) => {
          const paidDate = job.paidAt ? new Date(job.paidAt) : null;
          return (
            paidDate &&
            paidDate.getFullYear() === year &&
            paidDate.getMonth() === index &&
            job.paymentStatus === "paid"
          );
        })
        .reduce((total, job) => total + job.serviceSubtotal, 0);

    return {
      month,
      current: amountForYear(currentYear),
      previous: amountForYear(currentYear - 1),
    };
  });
}

export async function getAppData(): Promise<AppData> {
  if (isDemoMode()) {
    return demoData;
  }

  const { businessId } = await requireBusinessId();
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase n’est pas configuré.");
  }

  const [
    businessResult,
    clientsResult,
    propertiesResult,
    workersResult,
    jobsResult,
    jobWorkersResult,
    expensesResult,
    visitsResult,
    prospectHousesResult,
    bucketsResult,
    allocationsResult,
  ] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).single(),
    supabase.from("clients").select("*").eq("business_id", businessId).order("client_number"),
    supabase.from("properties").select("*").eq("business_id", businessId),
    supabase.from("workers").select("*").eq("business_id", businessId).order("name"),
    supabase.from("jobs").select("*").eq("business_id", businessId).order("starts_at", { ascending: false }),
    supabase.from("job_workers").select("*").eq("business_id", businessId),
    supabase.from("expenses").select("*").eq("business_id", businessId).order("expense_date", { ascending: false }),
    supabase
      .from("canvassing_visits")
      .select("*")
      .eq("business_id", businessId)
      .order("visited_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("prospecting_houses")
      .select("*")
      .eq("business_id", businessId)
      .order("visited_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("allocation_buckets").select("*").eq("business_id", businessId).eq("active", true).order("sort_order"),
    supabase.from("payment_allocations").select("*").eq("business_id", businessId),
  ]);

  const results = [
    businessResult,
    clientsResult,
    propertiesResult,
    workersResult,
    jobsResult,
    jobWorkersResult,
    expensesResult,
    visitsResult,
    prospectHousesResult,
    bucketsResult,
    allocationsResult,
  ];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const businessRow = businessResult.data as Row;
  const business: Business = {
    id: text(businessRow.id),
    name: text(businessRow.name, "LM Lavage de Vitres"),
    currency: "CAD",
    timezone: "America/Toronto",
    gstEnabled: boolean(businessRow.gst_enabled),
    qstEnabled: boolean(businessRow.qst_enabled),
    gstRate: number(businessRow.gst_rate),
    qstRate: number(businessRow.qst_rate),
    defaultFollowupMonths: number(businessRow.default_followup_months) || 12,
    digestEmail: nullableText(businessRow.digest_email),
  };

  const properties: Property[] = rows(propertiesResult.data).map((row) => ({
    id: text(row.id),
    clientId: text(row.client_id),
    address: nullableText(row.address),
    city: nullableText(row.city),
    province: nullableText(row.province),
    postalCode: nullableText(row.postal_code),
    latitude: mapCoordinateFromDatabase(row.latitude, row.longitude)?.[0] ?? null,
    longitude: mapCoordinateFromDatabase(row.latitude, row.longitude)?.[1] ?? null,
  }));

  const clients: Client[] = rows(clientsResult.data).map((row) => ({
    id: text(row.id),
    clientNumber: number(row.client_number),
    name: nullableText(row.name),
    phone: nullableText(row.phone),
    email: nullableText(row.email),
    notes: nullableText(row.notes),
    needsReview: boolean(row.needs_review),
    properties: properties.filter((property) => property.clientId === text(row.id)),
  }));

  const workers: Worker[] = rows(workersResult.data).map((row) => ({
    id: text(row.id),
    name: text(row.name),
    active: boolean(row.active),
    salesSplitProfile: text(row.sales_split_key, text(row.sales_split_profile, "legacy_standard")) as Worker["salesSplitProfile"],
    userId: nullableText(row.user_id),
  }));

  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const propertyMap = new Map(properties.map((property) => [property.id, property]));
  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));
  const jobWorkerRows = rows(jobWorkersResult.data);
  const jobs: Job[] = rows(jobsResult.data).map((row) => {
    const client = clientMap.get(text(row.client_id));
    const property = propertyMap.get(text(row.property_id));

    return {
      id: text(row.id),
      clientId: text(row.client_id),
      propertyId: text(row.property_id),
      clientName: client?.name ?? `Client #${client?.clientNumber ?? "?"}`,
      address: property
        ? [property.address, property.city].filter(Boolean).join(", ") || "Adresse à confirmer"
        : "Adresse à confirmer",
      startsAt: text(row.starts_at),
      endsAt: text(row.ends_at),
      timeIsSet: row.time_is_set !== false,
      status: text(row.status, "scheduled") as Job["status"],
      paymentStatus: text(row.payment_status, "unpaid") as Job["paymentStatus"],
      serviceScope: text(row.service_scope, "outside") as Job["serviceScope"],
      windowCount: row.window_count === null ? null : number(row.window_count),
      serviceSubtotal: number(row.service_subtotal),
      gstAmount: number(row.gst_amount),
      qstAmount: number(row.qst_amount),
      totalDue: number(row.total_due),
      tipAmount: number(row.tip_amount),
      paidAt: nullableText(row.paid_at),
      paymentMethod: nullableText(row.payment_method),
      followupDate: nullableText(row.followup_date),
      notes: nullableText(row.notes),
      workerIds: jobWorkerRows
        .filter((link) => text(link.job_id) === text(row.id))
        .map((link) => text(link.worker_id)),
      sellerWorkerId: nullableText(row.seller_worker_id),
      sellerName: workerMap.get(text(row.seller_worker_id))?.name ?? salesSplitLabel(text(row.sales_split_key, "legacy_standard") as Job["salesSplitProfile"]),
      salesSplitProfile: text(row.sales_split_key, "legacy_standard") as Job["salesSplitProfile"],
      googleSyncStatus: text(row.google_sync_status, "not_connected") as Job["googleSyncStatus"],
    };
  });

  const expenses: Expense[] = rows(expensesResult.data).map((row) => ({
    id: text(row.id),
    date: text(row.expense_date),
    vendor: text(row.vendor),
    category: text(row.category),
    subtotal: number(row.subtotal),
    gstAmount: number(row.gst_amount),
    qstAmount: number(row.qst_amount),
    total: number(row.total),
    paymentMethod: nullableText(row.payment_method),
    purchaserWorkerId: nullableText(row.purchaser_worker_id),
    purchaserName: workerMap.get(text(row.purchaser_worker_id))?.name ?? null,
    notes: nullableText(row.notes),
    jobId: nullableText(row.job_id),
    receiptPath: nullableText(row.receipt_path),
  }));

  const canvassingVisits: CanvassingVisit[] = rows(visitsResult.data).map((row) => ({
    id: text(row.id),
    street: text(row.street),
    city: text(row.city),
    visitedAt: nullableText(row.visited_at),
    outcome: text(row.outcome),
    notes: nullableText(row.notes),
    revisitDate: nullableText(row.revisit_date),
    startAddress: nullableText(row.start_address),
    endAddress: nullableText(row.end_address),
    routeCoordinates: mapRouteFromDatabase(row.route_coordinates),
  }));

  const prospectHouses: ProspectHouse[] = rows(prospectHousesResult.data).map((row) => {
    const coordinate = mapCoordinateFromDatabase(row.latitude, row.longitude);

    return {
      id: text(row.id),
      address: text(row.address, "Adresse à confirmer"),
      city: text(row.city, "Gatineau"),
      province: text(row.province, "QC"),
      postalCode: nullableText(row.postal_code),
      status: text(row.status, "no_answer") as ProspectHouse["status"],
      visitedAt: nullableText(row.visited_at),
      revisitDate: nullableText(row.revisit_date),
      notes: nullableText(row.notes),
      latitude: coordinate?.[0] ?? null,
      longitude: coordinate?.[1] ?? null,
      createdClientId: nullableText(row.created_client_id),
      createdPropertyId: nullableText(row.created_property_id),
    };
  });

  const allocationRows = rows(allocationsResult.data);
  const allocationBuckets: AllocationBucket[] = rows(bucketsResult.data).map((row) => ({
    id: text(row.id),
    name: text(row.name),
    type: text(row.bucket_type, "person") as AllocationBucket["type"],
    percentage: number(row.percentage),
    alexisSalePercentage: number(row.alexis_sale_percentage),
    guillaumeSalePercentage: number(row.guillaume_sale_percentage),
    poSalePercentage: number(row.po_sale_percentage),
    splitSalePercentage: number(row.split_sale_percentage),
    amount: allocationRows
      .filter((allocation) => text(allocation.bucket_id) === text(row.id))
      .reduce((total, allocation) => total + number(allocation.amount), 0),
  }));

  return {
    business,
    clients,
    workers,
    jobs,
    expenses,
    canvassingVisits,
    prospectHouses,
    allocationBuckets,
    revenueSeries: deriveRevenueSeries(jobs),
  };
}
