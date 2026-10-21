import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailsLoading() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
