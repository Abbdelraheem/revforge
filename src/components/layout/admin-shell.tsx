"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BRAND } from "@/config/brand";
import { cn } from "@/components/ui/button";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/margins", label: "Margins" },
  { href: "/admin/jobs", label: "Build jobs" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/funnel", label: "Funnel" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/abuse", label: "Abuse" },
  { href: "/admin/pricing", label: "Pricing" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  displayName,
  email,
  children,
}: {
  displayName: string;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-[100dvh] bg-background">
      <a
        href="#main-content"
        className="skip-link rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
      >
        Skip to admin content
      </a>

      <header className="border-b border-border bg-card/70">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/admin"
              className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`${BRAND.name} admin home`}
            >
              <span className="font-serif text-lg font-bold tracking-tight">{BRAND.name}</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold uppercase text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowLeft className="h-4 w-4" />
              Workspace
            </Link>
            <p className="truncate text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{displayName}</span>
              <span className="hidden sm:inline"> · {email}</span>
            </p>
          </div>
        </div>

        <nav
          aria-label="Administration navigation"
          className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-4 pb-2 sm:px-6"
        >
          {ADMIN_NAV.map((item) => {
            const active = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
    </div>
  );
}
