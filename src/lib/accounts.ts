import "server-only";

import { requireBusinessId } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type BusinessAccount = {
  id: string;
  email: string;
  role: "owner" | "admin";
  createdAt: string;
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
      accounts: [{ id: auth.userId, email: auth.email, role: "owner", createdAt: new Date().toISOString() }],
      canManage: true,
    };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("La clé de service Supabase est absente.");

  const { data: members, error } = await admin
    .from("business_members")
    .select("user_id,role,created_at")
    .eq("business_id", businessId);

  if (error) throw new Error("Impossible de charger les comptes de l’entreprise.");

  const accounts = await Promise.all(
    (members ?? []).map(async (member) => {
      const { data, error: userError } = await admin.auth.admin.getUserById(member.user_id);
      if (userError || !data.user.email) return null;
      return {
        id: member.user_id as string,
        email: data.user.email,
        role: member.role as "owner" | "admin",
        createdAt: member.created_at as string,
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
