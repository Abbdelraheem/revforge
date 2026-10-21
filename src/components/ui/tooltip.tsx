"use client";

import * as React from "react";
import { cn } from "./button";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.type as any).displayName === "TooltipContent") {
          return visible ? child : null;
        }
        return child;
      })}
    </div>
  );
}

export function TooltipTrigger({
  children,
  asChild,
  className,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  return <span className={className}>{children}</span>;
}

export function TooltipContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
TooltipContent.displayName = "TooltipContent";
