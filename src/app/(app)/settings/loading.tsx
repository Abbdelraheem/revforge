import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 w-full">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
