"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { BrandLogo } from "@/components/shared/brand-logo";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="h-9 w-9 rounded-md border border-border bg-muted/40 flex items-center justify-center text-foreground group-hover:border-primary/50 transition">
            <BrandLogo className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground font-serif">
              {BRAND.name}
            </span>
            <span className="text-sm text-muted-foreground font-medium -mt-1">
              Clean-Room Systems
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-sm font-semibold text-muted-foreground">
          <Link href="/how-it-works" className="hover:text-foreground transition">
            How It Works
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition">
            Pricing
          </Link>
          <Link href="/security" className="hover:text-foreground transition">
            Security & Compliance
          </Link>
          <Link href="/use-cases" className="hover:text-foreground transition">
            Use Cases
          </Link>
          <Link href="/docs" className="hover:text-foreground transition">
            Documentation
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="hidden md:flex items-center space-x-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-sm font-semibold">
              <User className="h-3.5 w-3.5 me-1.5" />
              <span>Sign In</span>
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="text-sm font-semibold shadow-sm">
              <span>Start Free Triage</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-6 py-4 space-y-3">
          <Link
            href="/how-it-works"
            className="block text-sm font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            How It Works
          </Link>
          <Link
            href="/pricing"
            className="block text-sm font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/security"
            className="block text-sm font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Security & Compliance
          </Link>
          <Link
            href="/use-cases"
            className="block text-sm font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Use Cases
          </Link>
          <Link
            href="/docs"
            className="block text-sm font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Documentation
          </Link>
          <div className="pt-2 border-t border-border flex flex-col space-y-2">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full text-sm">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full text-sm">
                Start Free Triage
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
