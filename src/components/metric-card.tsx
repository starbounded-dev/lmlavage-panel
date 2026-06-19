import type { LucideIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card size="sm" className="min-h-36 min-w-0 sm:min-h-0">
      <CardHeader className="pb-1">
        <div className="flex flex-col gap-1">
          <CardDescription className="text-xs sm:text-sm">{title}</CardDescription>
          <CardTitle className="metric-number text-xl sm:text-[1.7rem]">{value}</CardTitle>
        </div>
        <CardAction><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="size-5" /></div></CardAction>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
