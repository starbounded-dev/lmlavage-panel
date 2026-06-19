import { AppShell } from "@/components/app-shell";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  return <AppShell isDemo={auth.isDemo}>{children}</AppShell>;
}
