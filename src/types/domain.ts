export type JobStatus = "scheduled" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid";
export type ServiceScope = "inside" | "outside" | "both";
export type SyncStatus = "not_connected" | "pending" | "synced" | "error";
export type AllocationBucketType = "person" | "reserve";
export type SalesSplitProfile =
  | "legacy_standard"
  | "alexis_sale"
  | "guillaume_sale"
  | "po_sale"
  | "split_alexis_guillaume";
export type MapCoordinate = [latitude: number, longitude: number];

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
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Client = {
  id: string;
  clientNumber: number;
  name: string | null;
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
  userId: string | null;
};

export type Job = {
  id: string;
  clientId: string;
  propertyId: string;
  clientName: string;
  address: string;
  startsAt: string;
  endsAt: string;
  timeIsSet: boolean;
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
  salesSplitProfile: SalesSplitProfile;
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
  purchaserWorkerId: string | null;
  purchaserName: string | null;
  notes: string | null;
  jobId: string | null;
  receiptPath: string | null;
};

export type CanvassingVisit = {
  id: string;
  street: string;
  city: string;
  visitedAt: string | null;
  outcome: string;
  notes: string | null;
  revisitDate: string | null;
  startAddress: string | null;
  endAddress: string | null;
  routeCoordinates: MapCoordinate[];
};

export type AllocationBucket = {
  id: string;
  name: string;
  type: AllocationBucketType;
  percentage: number;
  alexisSalePercentage: number;
  guillaumeSalePercentage: number;
  poSalePercentage: number;
  splitSalePercentage: number;
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
