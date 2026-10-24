import { Skeleton } from "@/components/ui/skeleton";

export default function StudioLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Studio Header Skeleton */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      {/* Main 3-Column Studio Workspace Skeleton */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Chat / Prompt & Edits History (3 cols) */}
        <div className="lg:col-span-3 border-e border-border p-4 flex flex-col justify-between space-y-4 bg-muted/5">
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
          <div className="space-y-2 pt-4 border-t border-border">
            <Skeleton className="h-20 w-full rounded-md" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        </div>

        {/* Center: Live Preview Viewport (6 cols) */}
        <div className="lg:col-span-6 flex flex-col bg-background p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex space-x-2">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
          <div className="flex-1 rounded-md border border-border bg-muted/10 p-6 flex flex-col items-center justify-center space-y-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>

        {/* Right: Inspector Tabs (Code, Tests, Parity) (3 cols) */}
        <div className="lg:col-span-3 border-s border-border p-4 space-y-4 bg-muted/5">
          <div className="flex space-x-2 border-b border-border pb-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
