import React from "react";
import { BRAND } from "@/config/brand";

export function BrandLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={BRAND.name}
    >
      {/* Precision Geometric Forge Monogram */}
      <path
        d="M6 8L16 2L26 8V24L16 30L6 24V8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        className="text-foreground"
      />
      <path
        d="M16 2V16M16 16L26 8M16 16L6 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        className="text-foreground opacity-60"
      />
      <path
        d="M16 16V30M16 16L26 24M16 16L6 24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        className="text-primary"
      />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" className="text-primary" />
    </svg>
  );
}
