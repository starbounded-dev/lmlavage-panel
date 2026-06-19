"use client";

import { Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCad } from "@/lib/format";
import type { AllocationBucket, RevenuePoint } from "@/types/domain";

const revenueConfig = {
  current: { label: "2026", color: "var(--chart-1)" },
  previous: { label: "2025", color: "var(--chart-5)" },
} satisfies ChartConfig;

const allocationColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ChartContainer config={revenueConfig} className="h-64 w-full aspect-auto">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 12, bottom: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}$`} width={44} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCad(Number(value))} />} />
        <Line dataKey="current" type="monotone" stroke="var(--color-current)" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
        <Line dataKey="previous" type="monotone" stroke="var(--color-previous)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}

export function AllocationChart({ buckets }: { buckets: AllocationBucket[] }) {
  const config = Object.fromEntries(
    buckets.map((bucket, index) => [bucket.name, { label: bucket.name, color: allocationColors[index % allocationColors.length] }])
  ) satisfies ChartConfig;

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ChartContainer config={config} className="mx-auto h-52 w-full max-w-64 aspect-square">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => formatCad(Number(value))} />} />
          <Pie data={buckets} dataKey="amount" nameKey="name" innerRadius={52} outerRadius={78} strokeWidth={2} isAnimationActive={false}>
            {buckets.map((bucket, index) => (
              <Cell key={bucket.id} fill={allocationColors[index % allocationColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="flex flex-col gap-3">
        {buckets.map((bucket, index) => (
          <div key={bucket.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: allocationColors[index % allocationColors.length] }} />
            <span>{bucket.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{bucket.percentage}% · {formatCad(bucket.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
