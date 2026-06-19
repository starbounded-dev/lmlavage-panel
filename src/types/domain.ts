export type JobStatus = "scheduled" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid";
export type ServiceScope = "inside" | "outside" | "both";
export type SyncStatus = "not_connected" | "pending" | "synced" | "error";
export type AllocationBucketType = "person" | "reserve";
export type SalesSplitProfile = "standard" | "po_sale";

export type Business = {
  id: string;
  name: string;
  currency: "CAD";
  timezone: "America/Toronto";
  gstEnabled: boolean;
  qstEnabled: boolean;
  gstRate: number;
  qstRate: number;
  defaultFollowupMonths: number;
  digestEmail: string | null;
};

export type Property = {
  id: string;
  clientId: string;
  address: string;
  city: string;
  province: string;
  postalCode: string | null;
};

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  needsReview: boolean;
  properties: Property[];
};

export type Worker = {
  id: string;
  name: string;
  active: boolean;
  salesSplitProfile: SalesSplitProfile;
};

export type Job = {
  id: string;
  clientId: string;
  propertyId: string;
  clientName: string;
  address: string;
  startsAt: string;
  endsAt: string;
  status: JobStatus;
  paymentStatus: PaymentStatus;
  serviceScope: ServiceScope;
  windowCount: number | null;
  serviceSubtotal: number;
  gstAmount: number;
  qstAmount: number;
  totalDue: number;
  tipAmount: number;
  paidAt: string | null;
  paymentMethod: string | null;
  followupDate: string | null;
  notes: string | null;
  workerIds: string[];
  sellerWorkerId: string | null;
  sellerName: string | null;
  googleSyncStatus: SyncStatus;
};

export type Expense = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  subtotal: number;
  gstAmount: number;
  qstAmount: number;
  total: number;
  paymentMethod: string | null;
  notes: string | null;
  receiptPath: string | null;
};

export type CanvassingVisit = {
  id: string;
  street: string;
  city: string;
  visitedAt: string;
  outcome: string;
  notes: string | null;
  revisitDate: string | null;
};

export type AllocationBucket = {
  id: string;
  name: string;
  type: AllocationBucketType;
  percentage: number;
  poSalePercentage: number;
  amount: number;
};

export type RevenuePoint = {
  month: string;
  current: number;
  previous: number;
};

export type AppData = {
  business: Business;
  clients: Client[];
  workers: Worker[];
  jobs: Job[];
  expenses: Expense[];
  canvassingVisits: CanvassingVisit[];
  allocationBuckets: AllocationBucket[];
  revenueSeries: RevenuePoint[];
};
