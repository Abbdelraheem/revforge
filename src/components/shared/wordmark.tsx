import React from "react";
import { BRAND } from "@/config/brand";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-baseline space-x-1.5 font-bold tracking-tight ${className || ""}`}>
      <span className="font-serif text-lg text-foreground">{BRAND.name}</span>
      <span className="text-sm font-normal text-muted-foreground">clean-room</span>
    </div>
  );
}
