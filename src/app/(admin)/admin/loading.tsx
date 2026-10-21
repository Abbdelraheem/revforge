import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFleetLoading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
