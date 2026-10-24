import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFunnelLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-6 w-52 rounded-full" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}
