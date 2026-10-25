import { Skeleton } from "@/components/ui/skeleton";

export default function NewProjectLoading() {
  return (
    <div className="space-y-6 w-full">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
