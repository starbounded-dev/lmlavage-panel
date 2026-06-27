"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  CircleGaugeIcon,
  LogOutIcon,
  MapPinnedIcon,
  MoreHorizontalIcon,
  ReceiptTextIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import { signOutAction } from "@/app/actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: CircleGaugeIcon },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDaysIcon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/travaux", label: "Travaux", icon: BriefcaseBusinessIcon },
  { href: "/prospection", label: "Prospection", icon: MapPinnedIcon },
  { href: "/prospection-mobile", label: "Terrain mobile", icon: MapPinnedIcon },
  { href: "/depenses", label: "Dépenses", icon: ReceiptTextIcon },
  { href: "/repartition", label: "Répartition", icon: ChartPieIcon },
  { href: "/parametres", label: "Paramètres", icon: SettingsIcon },
] as const;

const mobileNavigation = [
  { href: "/tableau-de-bord", label: "Aperçu", icon: CircleGaugeIcon },
  { href: "/travaux", label: "Travaux", icon: BriefcaseBusinessIcon },
  { href: "/prospection-mobile", label: "Terrain", icon: MapPinnedIcon },
  { href: "/depenses", label: "Dépenses", icon: ReceiptTextIcon },
] as const;

export function AppShell({ children, isDemo }: { children: React.ReactNode; isDemo: boolean }) {
  const pathname = usePathname();

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "13.5rem",
      } as React.CSSProperties}
    >
      <Sidebar collapsible="offcanvas" className="border-0">
        <SidebarHeader className="items-center px-5 py-6">
          <Link href="/tableau-de-bord" aria-label="LM Lavage de Vitres — Tableau de bord">
            <Image
              src="/lm-logo.png"
              alt="LM Lavage de Vitres"
              width={160}
              height={120}
              className="h-auto w-36"
              priority
            />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        size="lg"
                        tooltip={item.label}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          {isDemo ? (
            <p className="rounded-md border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/75">
              Mode démonstration local
            </p>
          ) : null}
          <ThemeToggle />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              <LogOutIcon data-icon="inline-start" />
              Déconnexion
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 pb-20 md:pb-0">
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[2.5rem_1fr_2.5rem] items-center border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground md:hidden">
          <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
          <Link href="/tableau-de-bord" className="justify-self-center"><Image src="/lm-logo.png" alt="LM Lavage de Vitres" width={160} height={72} className="h-16 w-auto" /></Link>
          <ThemeToggle compact />
          <span className="sr-only">Navigation mobile</span>
        </header>
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>

      <nav className="fixed inset-x-2 bottom-3 z-50 flex h-16 items-center justify-around rounded-2xl bg-sidebar px-1 text-sidebar-foreground shadow-xl md:hidden">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[0.65rem]",
                active && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <Link href="/parametres" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[0.65rem]">
          <MoreHorizontalIcon className="size-5" />
          Plus
        </Link>
      </nav>
    </SidebarProvider>
  );
}
