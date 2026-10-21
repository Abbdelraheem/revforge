import * as React from "react";
import { cn } from "./button";

export function Progress({
  value = 0,
  className,
  ...props
}: {
  value?: number;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
