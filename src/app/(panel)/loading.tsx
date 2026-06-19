import { Skeleton } from "@/components/ui/skeleton";

export default function PanelLoading() {
  return <div className="flex flex-col gap-4"><Skeleton className="h-12 w-64" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}</div><Skeleton className="h-[520px] w-full" /></div>;
}
