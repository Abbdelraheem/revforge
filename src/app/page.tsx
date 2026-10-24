import React from "react";
import Link from "next/link";
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Code2,
  Database,
  Terminal,
  Cpu,
  Layers,
  FileCode,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { PricingCalculator } from "@/components/shared/pricing-calculator";
import { MiniTriageDemo } from "@/components/shared/mini-triage-demo";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main className="flex-1 space-y-24 pb-20">
        {/* Hero Section */}
        <section className="pt-20 pb-12 px-6 max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center space-x-2 border border-primary/30 bg-primary/5 px-3 py-1 rounded text-sm font-mono text-primary">
            <span>Clean-Room Architecture &bull; Next.js 15 Synthesis</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground max-w-5xl mx-auto leading-tight font-serif">
            Clean-Room Reverse Engineering &amp; Reconstruction
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Deconstruct any live web application, mobile APK, or native binary into verified architecture boundaries, an Evidence Ledger, and production Next.js 15 source code. Transparent pricing calculated at 50% of traditional human agency costs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="text-sm font-bold h-12 px-7 shadow-sm">
              <Link href="/projects/new">
                <span>Start Free Analysis</span>
                <ArrowRight className="ms-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-sm font-semibold h-12 px-6">
              <Link href="/how-it-works">
                <span>Explore 8-Stage Pipeline</span>
              </Link>
            </Button>
          </div>

          {/* Telemetry Strip */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-mono text-muted-foreground">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>Runtime: Sandboxed Container Runner</span>
            </div>
            <span className="hidden sm:inline">&bull;</span>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Security: Pinned Safe Fetch</span>
            </div>
            <span className="hidden sm:inline">&bull;</span>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              <span>Billing: Verified Webhooks</span>
            </div>
          </div>
        </section>

        {/* Live Interactive Mini-Triage Demo */}
        <section id="triage-console" className="py-16 px-6 bg-muted/20 border-y border-border">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="text-sm uppercase tracking-widest text-primary font-bold">
                Interactive Inspection
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-serif">
                Test Static Inspection & Scope Quoting
              </h2>
              <p className="text-sm sm:text-sm text-muted-foreground max-w-xl mx-auto">
                Enter any public URL or repository. We evaluate observable interfaces and estimate clean-room scope without copying private code.
              </p>
            </div>

            <MiniTriageDemo />
          </div>
        </section>

        {/* 8-Stage Clean-Room Methodology */}
        <section className="py-8 px-6 max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-sm uppercase tracking-widest text-primary font-bold">
              Rigorous Isolation Protocol
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif">
              8-Stage Clean-Room Pipeline
            </h2>
            <p className="text-sm sm:text-sm text-muted-foreground">
              Strict isolation decoupling empirical observation from clean-room synthesis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm font-sans">
            {[
              { step: "01", name: "Target Ingestion", desc: "Magic-byte validation, secure storage, and pre-DNS SSRF security filter." },
              { step: "02", name: "Static Triage", desc: "Automated scanning of ASTs, routes, symbols, and exported manifest interfaces." },
              { step: "03", name: "Evidence Ledger", desc: "Partitioning into Seen (empirical), Inferred (data flow), and Unknown (server-side)." },
              { step: "04", name: "Dynamic Quote", desc: "Algorithmic computation with hours × rate × 0.5 formula and category price floors." },
              { step: "05", name: "Webhook Verification", desc: "Verified HMAC-SHA256 signature check before enqueuing sandbox job." },
              { step: "06", name: "Sandboxed Extractor", desc: "Isolated container extractor execution with strict compute quotas and non-root user." },
              { step: "07", name: "Clean Synthesis", desc: "Independent creation of Next.js 15, Drizzle ORM, and TypeScript codebase from specs." },
              { step: "08", name: "Verified Release", desc: "Automated verification test suite and signed delivery package." },
            ].map((st) => (
              <div key={st.step} className="p-5 rounded-lg border border-border bg-card space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground font-mono">
                  <span className="text-primary font-bold">{st.step}</span>
                  <span className="text-sm uppercase">Stage</span>
                </div>
                <h3 className="font-bold text-foreground text-sm font-serif">{st.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dynamic Scope Calculator Section */}
        <section className="py-16 px-6 bg-muted/20 border-y border-border">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <div className="text-sm uppercase tracking-widest text-primary font-bold">
                Transparent Scope Quoting
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-serif">
                50% Market Benchmark Pricing Formula
              </h2>
              <p className="text-sm sm:text-sm text-muted-foreground max-w-xl mx-auto">
                No recurring subscription lock-in. You pay on-demand based on the actual scope and architectural complexity required by your target.
              </p>
            </div>

            <PricingCalculator />
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
