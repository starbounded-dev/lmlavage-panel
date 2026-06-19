import "server-only";

import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthContext = {
  userId: string;
  email: string;
  isDemo: boolean;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  if (isDemoMode()) {
    return {
      userId: "demo-owner",
      email: "proprietaire@lm-lavage.ca",
      isDemo: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return { userId: user.id, email: user.email, isDemo: false };
}

export async function requireAuth() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/connexion");
  }
  return auth;
}

export async function requireBusinessId() {
  const auth = await requireAuth();
  if (auth.isDemo) {
    return { auth, businessId: "demo-business" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Configuration Supabase absente.");
  }

  const { data, error } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", auth.userId)
    .eq("role", "owner")
    .single();

  if (error || !data) {
    throw new Error("Accès à l’entreprise refusé.");
  }

  return { auth, businessId: data.business_id as string };
}
