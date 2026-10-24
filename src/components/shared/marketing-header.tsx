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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Name (Typographic Only, No Logo Icon) */}
        <Link href="/" className="flex flex-col group focus-visible:outline-none">
          <span className="font-bold text-lg sm:text-xl tracking-tight text-foreground font-serif group-hover:text-primary transition-colors">
            {BRAND.name}
          </span>
          <span className="text-sm text-muted-foreground font-medium -mt-0.5">
            Clean-Room Systems
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-6 xl:space-x-7 text-sm font-semibold text-muted-foreground">
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
        <div className="hidden lg:flex items-center space-x-3">
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
        <div className="flex lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-card px-6 py-4 space-y-3">
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
