import "server-only";

import { requireBusinessId } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type BusinessAccount = {
  id: string;
  email: string;
  role: "owner" | "admin";
  createdAt: string;
  workerId: string | null;
  workerName: string | null;
};

export type AccountManagementData = {
  accounts: BusinessAccount[];
  canManage: boolean;
};

export async function getAccountManagementData(): Promise<AccountManagementData> {
  const { auth, businessId, role } = await requireBusinessId();
  if (role !== "owner") return { accounts: [], canManage: false };
  if (auth.isDemo) {
    return {
      accounts: [{ id: auth.userId, email: auth.email, role: "owner", createdAt: new Date().toISOString(), workerId: null, workerName: null }],
      canManage: true,
    };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("La clé de service Supabase est absente.");

  const [{ data: members, error }, { data: workers, error: workersError }] = await Promise.all([
    admin.from("business_members").select("user_id,role,created_at").eq("business_id", businessId),
    admin.from("workers").select("id,name,user_id").eq("business_id", businessId),
  ]);

  if (error || workersError) throw new Error("Impossible de charger les comptes de l’entreprise.");

  const accounts = await Promise.all(
    (members ?? []).map(async (member) => {
      const { data, error: userError } = await admin.auth.admin.getUserById(member.user_id);
      if (userError || !data.user.email) return null;
      const worker = workers?.find((item) => item.user_id === member.user_id);
      return {
        id: member.user_id as string,
        email: data.user.email,
        role: member.role as "owner" | "admin",
        createdAt: member.created_at as string,
        workerId: worker?.id ?? null,
        workerName: worker?.name ?? null,
      };
    })
  );

  return {
    accounts: accounts
      .filter((account): account is BusinessAccount => account !== null)
      .toSorted((left, right) => left.role === right.role ? left.email.localeCompare(right.email) : left.role === "owner" ? -1 : 1),
    canManage: true,
  };
}
