import React from "react";
import Link from "next/link";
import { Terminal, Shield } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card/40 text-xs font-mono">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand Col */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="h-6 w-6 rounded border border-primary/40 bg-primary/10 flex items-center justify-center text-primary">
              <Terminal className="h-3 w-3" />
            </div>
            <span className="font-bold text-foreground">RevForge AI</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-sm font-sans">
            Autonomous Clean-Room Reverse Engineering & Technical Scoping Platform. Built with zero-shell sandboxing, gVisor container isolation, and cryptographically verified billing.
          </p>
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-[11px] text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Zero-Trust Architecture • Non-Root Sandboxing</span>
          </div>
        </div>

        {/* Product Col */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">Product</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/how-it-works" className="hover:text-foreground transition">
                Pipeline
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground transition">
                Pricing Engine
              </Link>
            </li>
            <li>
              <Link href="/use-cases" className="hover:text-foreground transition">
                Use Cases
              </Link>
            </li>
            <li>
              <Link href="/changelog" className="hover:text-foreground transition">
                Changelog
              </Link>
            </li>
            <li>
              <Link href="/design-system" className="hover:text-foreground transition">
                Design System
              </Link>
            </li>
          </ul>
        </div>

        {/* Security & Docs */}
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
                Documentation
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-foreground transition">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-foreground transition">
                Support & Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Governance */}
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
              <Link href="/acceptable-use" className="hover:text-foreground transition">
                Acceptable Use
              </Link>
            </li>
            <li>
              <Link href="/clean-room-ip-policy" className="hover:text-foreground transition">
                Clean-Room IP Policy
              </Link>
            </li>
            <li>
              <Link href="/dmca" className="hover:text-foreground transition">
                DMCA / Takedown
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground">
        <div>© 2026 RevForge AI Inc. All rights reserved.</div>
        <div className="flex items-center space-x-4 rtl:space-x-reverse mt-2 sm:mt-0">
          <span>Status: All Systems Operational</span>
          <span>•</span>
          <span>Latency: &lt;14ms</span>
        </div>
      </div>
    </footer>
  );
}
