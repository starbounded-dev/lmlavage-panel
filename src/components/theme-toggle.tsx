"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon-sm" : "default"}
      className={compact ? undefined : "w-full justify-start"}
      aria-label="Changer le thème clair ou sombre"
      disabled={!mounted}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon data-icon="inline-start" className="hidden dark:block" />
      <MoonIcon data-icon="inline-start" className="dark:hidden" />
      {compact ? <span className="sr-only">Changer le thème</span> : <span>Thème clair / sombre</span>}
    </Button>
  );
}
