import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveryLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header skeleton */}
      <div className="space-y-3 border-b border-border pb-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Parity scorecard skeleton */}
      <div className="rounded-lg border border-border p-6 space-y-4 bg-card">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <Skeleton className="h-20 rounded-md" />
          <Skeleton className="h-20 rounded-md" />
          <Skeleton className="h-20 rounded-md" />
          <Skeleton className="h-20 rounded-md" />
        </div>
      </div>

      {/* Export options grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>

      {/* Deploy guide skeleton */}
      <div className="rounded-lg border border-border p-6 space-y-4 bg-card">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-32 rounded-md" />
      </div>
    </div>
  );
}
