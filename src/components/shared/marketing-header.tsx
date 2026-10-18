"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Terminal, Shield, ArrowRight, Menu, X, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangThemeToggle } from "@/components/shared/lang-theme-toggle";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2.5 rtl:space-x-reverse group">
          <div className="h-8 w-8 rounded border border-primary/30 bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="flex items-baseline space-x-1.5 rtl:space-x-reverse">
            <span className="font-mono text-sm font-bold tracking-tight text-foreground">
              RevForge<span className="text-primary">.ai</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
              v2.4
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center space-x-6 rtl:space-x-reverse text-xs font-medium text-muted-foreground">
          <Link href="/how-it-works" className="hover:text-foreground transition">
            How It Works
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition">
            Pricing
          </Link>
          <Link href="/security" className="hover:text-foreground transition">
            Security & Zero-Trust
          </Link>
          <Link href="/use-cases" className="hover:text-foreground transition">
            Use Cases
          </Link>
          <Link href="/docs" className="hover:text-foreground transition">
            Docs
          </Link>
          <Link href="/changelog" className="hover:text-foreground transition">
            Changelog
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="hidden md:flex items-center space-x-3 rtl:space-x-reverse">
          <LangThemeToggle />
          <Link href="/#triage-console">
            <Button size="sm" className="font-mono text-xs">
              <span>Launch Studio</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="flex md:hidden items-center space-x-2 rtl:space-x-reverse">
          <LangThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-6 py-4 space-y-3 font-mono text-xs">
          <Link
            href="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/security"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            Security & Zero-Trust
          </Link>
          <Link
            href="/use-cases"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            Use Cases
          </Link>
          <Link
            href="/docs"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            Docs
          </Link>
          <div className="pt-2 border-t border-border">
            <Link href="/#triage-console" onClick={() => setMobileMenuOpen(false)}>
              <Button size="sm" className="w-full font-mono text-xs">
                Launch Studio
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
