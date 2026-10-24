import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { BRAND } from "@/config/brand";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/20 text-sm font-sans">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand Col */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center">
            <span className="font-bold text-foreground text-base font-serif">{BRAND.name}</span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
            Independent software architecture reconstruction, technical scoping, and clean-room source code generation platform.
          </p>
          <div className="text-sm text-muted-foreground">
            Isolated Sandbox Workers | Complete IP Ownership
          </div>
        </div>

        {/* Product Col */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">Platform</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/how-it-works" className="hover:text-foreground transition">
                Pipeline Stages
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground transition">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/use-cases" className="hover:text-foreground transition">
                Use Cases
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-foreground transition">
                Analysis Studio
              </Link>
            </li>
          </ul>
        </div>

        {/* Engineering Col */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">Engineering</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/security" className="hover:text-foreground transition">
                Security Controls
              </Link>
            </li>
            <li>
              <Link href="/docs" className="hover:text-foreground transition">
                Technical Docs
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-foreground transition">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-foreground transition">
                Engineering Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Governance Col */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">Governance</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/terms" className="hover:text-foreground transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-foreground transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/clean-room-ip-policy" className="hover:text-foreground transition">
                Clean-Room IP Policy
              </Link>
            </li>
            <li>
              <Link href="/acceptable-use" className="hover:text-foreground transition">
                Acceptable Use Policy
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="hover:text-foreground transition">
                Refund Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
        <div>© 2026 {BRAND.companyLegalName}. All rights reserved.</div>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <span>Billing Gateway: Paddle Verified</span>
          <span className="text-muted-foreground/40">|</span>
          <Link href="/status" className="hover:text-foreground transition">
            Platform Status
          </Link>
        </div>
      </div>
    </footer>
  );
}
