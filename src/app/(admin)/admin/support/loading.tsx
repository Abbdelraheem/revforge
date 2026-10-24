import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSupportLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-6 w-56 rounded-full" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <div className="lg:col-span-7">
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
