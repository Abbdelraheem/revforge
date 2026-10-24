"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { AuthSession } from "@/lib/auth";
import { BRAND } from "@/config/brand";
import { BrandLogo } from "@/components/shared/brand-logo";
import { logoutAction } from "@/server/actions/auth";
import { cn } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/projects/new", label: "New analysis", icon: PlusCircle },
  { href: "/billing", label: "Billing & credits", icon: CreditCard },
  { href: "/team", label: "Team", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/projects") {
    return (
      pathname === "/projects" ||
      (pathname.startsWith("/projects/") && !pathname.startsWith("/projects/new"))
    );
  }
  if (href === "/projects/new") return pathname === "/projects/new";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function Navigation({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Workspace navigation" className="flex-1 space-y-1 px-3 py-4">
      {PRIMARY_NAV.map((item) => {
        const active = isCurrent(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {isAdmin && (
        <div className="pt-3">
          <p className="px-3 pb-2 font-mono text-sm uppercase tracking-wider text-muted-foreground">
            Platform
          </p>
          <Link
            href="/admin"
            onClick={onNavigate}
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              pathname.startsWith("/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Admin console</span>
          </Link>
        </div>
      )}
    </nav>
  );
}

function AccountCard({ session }: { session: AuthSession }) {
  const displayName = session.user.name || session.user.email;
  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-sm font-semibold text-foreground"
        >
          {initials(session.user.name, session.user.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{session.workspace.name}</p>
        </div>
      </div>
      <form action={logoutAction} className="mt-1">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </form>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${BRAND.name} workspace home`}
    >
      <span className={cn("font-serif text-lg font-bold tracking-tight", compact && "text-base")}>
        {BRAND.name}
      </span>
    </Link>
  );
}

export function AppShell({
  session,
  children,
}: {
  session: AuthSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isStudio = /\/projects\/[^/]+\/studio\/?$/.test(pathname);
  const isAdmin = session.user.platformRole === "superadmin";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  if (isStudio) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <a
        href="#main-content"
        className="skip-link rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
      >
        Skip to main content
      </a>

      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-e border-border bg-card/60 lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:flex-col">
          <div className="flex h-16 items-center border-b border-border px-5">
            <Brand />
          </div>
          <Navigation pathname={pathname} isAdmin={isAdmin} />
          <AccountCard session={session} />
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6 lg:hidden">
            <Brand compact />
            <button
              type="button"
              aria-label="Open workspace navigation"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1200px] px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close workspace navigation"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            className="absolute inset-y-0 start-0 flex w-[min(20rem,88vw)] flex-col border-e border-border bg-background shadow-xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Brand />
              <button
                type="button"
                aria-label="Close workspace navigation"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Navigation
              pathname={pathname}
              isAdmin={isAdmin}
              onNavigate={() => setMobileOpen(false)}
            />
            <AccountCard session={session} />
          </div>
        </div>
      )}
    </div>
  );
}
