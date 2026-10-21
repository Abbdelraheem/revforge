import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
