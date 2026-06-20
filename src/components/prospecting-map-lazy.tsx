"use client";

import dynamic from "next/dynamic";
import type { ProspectingMapProps } from "@/components/prospecting-map";
import { Skeleton } from "@/components/ui/skeleton";

const ProspectingMap = dynamic(
  () => import("@/components/prospecting-map").then((module) => module.ProspectingMap),
  { ssr: false, loading: () => <Skeleton className="h-[28rem] w-full rounded-xl lg:h-[36rem]" /> }
);

export function ProspectingMapLazy(props: ProspectingMapProps) {
  return <ProspectingMap {...props} />;
}
