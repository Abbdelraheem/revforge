"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevForgeLogo } from "@/components/shared/revforge-logo";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="h-9 w-9 rounded-md border border-border bg-muted/40 flex items-center justify-center text-foreground group-hover:border-primary/50 transition">
            <RevForgeLogo className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground font-mono">
              RevForge
            </span>
            <span className="text-[10px] text-muted-foreground font-medium -mt-1">
              Architecture Reconstruction
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold text-muted-foreground">
          <Link href="/how-it-works" className="hover:text-foreground transition">
            How It Works
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition">
            Dynamic Pricing
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
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              <User className="h-3.5 w-3.5 me-1.5" />
              <span>Sign In</span>
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="text-xs font-semibold shadow-sm">
              <span>Start Free Triage</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-2">
          <Link href="/dashboard">
            <Button size="sm" className="text-xs">
              Studio
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-label="Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background p-6 space-y-4">
          <nav className="flex flex-col space-y-3 text-sm font-semibold">
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Dynamic Pricing
            </Link>
            <Link
              href="/security"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Security & Compliance
            </Link>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Documentation
            </Link>
            <div className="pt-3 border-t border-border flex flex-col space-y-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full text-xs">
                  Sign In
                </Button>
              </Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full text-xs">
                  Start Free Triage
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
