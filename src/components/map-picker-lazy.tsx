"use client";

import dynamic from "next/dynamic";
import type { MapPickerProps } from "@/components/map-picker";
import { Skeleton } from "@/components/ui/skeleton";

const MapPicker = dynamic(() => import("@/components/map-picker").then((module) => module.MapPicker), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-lg" />,
});

export function MapPickerLazy(props: MapPickerProps) {
  return <MapPicker {...props} />;
}
