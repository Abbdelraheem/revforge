"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, ShieldCheck, Sliders, DollarSign, Clock, HelpCircle } from "lucide-react";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1, TierKey } from "@/lib/pricing/engine";

export default function PricingPage() {
  const [estimatedHours, setEstimatedHours] = useState(24);
  const [targetType, setTargetType] = useState<TierKey>("web_app");

  const quoteResult = priceQuote(
    [
      {
        id: "core-architecture",
        name: "Core Architecture Reconstruction",
        tier: targetType,
        estimatedHours,
        selected: true,
      },
    ],
    DEFAULT_PRICING_CONFIG_V1
  );

  const tierCfg = DEFAULT_PRICING_CONFIG_V1.tiers[targetType];
  const rateDollars = tierCfg.hourlyRateCents / 100;
  const humanAgencyCost = Math.round(estimatedHours * rateDollars);
  const platformPrice = quoteResult.totalCents / 100;
  const savings = humanAgencyCost > 0 ? Math.round(((humanAgencyCost - platformPrice) / humanAgencyCost) * 100) : 50;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-7xl mx-auto w-full space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="border-primary/40 text-primary text-sm font-semibold">
            TRANSPARENT BENCHMARKED PRICING
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground font-serif">
            Honest, Scope-Based Pricing Per Project
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Every target is unique. Quotes are calculated directly as <code>hours × market rate × 0.5</code>—benchmarked at 50% of traditional human agency costs, with a complimentary first analysis.
          </p>
        </div>

        {/* Dynamic Pricing Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Complimentary Analysis Box */}
          <Card className="border-border bg-card shadow-sm lg:col-span-1">
            <CardHeader className="pb-3 border-b border-border">
              <Badge variant="outline" className="w-fit text-sm text-primary border-primary/40 font-semibold">
                FIRST ANALYSIS FREE
              </Badge>
              <CardTitle className="text-xl font-bold font-serif">Architectural Analysis</CardTitle>
              <CardDescription className="text-sm">
                Inspect and generate a formal specification for your target
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-extrabold text-foreground font-mono">$0</span>
                <span className="text-sm text-muted-foreground">first run ($5 credit thereafter)</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Full AST disassembly & network trace extraction</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Evidence Ledger (Seen vs. Inferred boundaries)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Itemized complexity quote & milestone schedule</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="border-t border-border pt-4">
              <Link href="/projects/new" className="w-full">
                <Button variant="outline" className="w-full text-sm font-semibold">
                  Start Complimentary Analysis
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Interactive Calculator */}
          <Card className="border-border bg-card shadow-sm lg:col-span-2">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold font-serif">Interactive Scope Estimator</CardTitle>
                  <CardDescription className="text-sm">
                    Formula: hours × rate × 0.5 (integer cents, platform floor applied)
                  </CardDescription>
                </div>
                <Sliders className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Type selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Project Complexity Tier</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "portfolio", label: "Static / Landing", defaultHours: 12 },
                    { id: "web_app", label: "Web Application", defaultHours: 24 },
                    { id: "mobile_app", label: "Mobile Binary", defaultHours: 40 },
                    { id: "enterprise_saas", label: "Complex SaaS", defaultHours: 80 },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTargetType(t.id as TierKey);
                        setEstimatedHours(t.defaultHours);
                      }}
                      className={`p-3 rounded border text-left transition-colors ${
                        targetType === t.id
                          ? "border-primary bg-primary/5 text-primary font-semibold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <div className="text-sm">{t.label}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        ${DEFAULT_PRICING_CONFIG_V1.tiers[t.id as TierKey].hourlyRateCents / 100}/hr market
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-foreground">Estimated Engineering Hours:</span>
                  <span className="font-mono font-bold text-primary">{estimatedHours} hrs</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="160"
                  step="2"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>4 hrs (Minimal)</span>
                  <span>80 hrs (Standard)</span>
                  <span>160 hrs (Large Scope)</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-4 rounded border border-border bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground uppercase">Market Agency Estimate</div>
                  <div className="text-xl font-bold line-through text-muted-foreground font-mono">
                    ${humanAgencyCost}
                  </div>
                  <div className="text-sm text-muted-foreground">{estimatedHours} hrs @ ${rateDollars}/hr</div>
                </div>

                <div className="space-y-1 border-x border-border/60 px-2">
                  <div className="text-sm text-primary font-bold uppercase tracking-wider">Clean-Room Price</div>
                  <div className="text-3xl font-extrabold text-foreground font-mono">
                    ${platformPrice}
                  </div>
                  <div className="text-sm text-muted-foreground">50% market benchmark</div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground uppercase">Estimated Client Savings</div>
                  <div className="text-3xl font-extrabold text-foreground font-mono">~{savings}%</div>
                  <div className="text-sm text-muted-foreground">Delivered via automated build</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-sm text-muted-foreground">
                  Includes full Next.js 15, Drizzle ORM, and verified test suites.
                </div>
                <Link href="/projects/new">
                  <Button className="text-sm font-bold shadow-sm w-full sm:w-auto">
                    <span>Analyze Your Target Now</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Complexity Range Benchmarks */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground font-serif">
              Project Scope Benchmarks
            </h2>
            <p className="text-sm text-muted-foreground">
              Representative examples of dynamic prices generated across different project sizes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Portfolio / Landing Page",
                range: "$29 – $49",
                turnaround: "~3 minutes",
                desc: "Static and SSG sites, marketing pages, design systems, and responsive layouts.",
              },
              {
                title: "Interactive Web App",
                range: "$99 – $149",
                turnaround: "~6 minutes",
                desc: "CRUD workflows, authenticated dashboards, relational database schemas, and REST endpoints.",
              },
              {
                title: "Mobile App (Android APK)",
                range: "$199 – $249",
                turnaround: "~10 minutes",
                desc: "Decompiled DEX bytecode synthesized into clean React Native and TypeScript interfaces.",
              },
              {
                title: "Full SaaS Ecosystem",
                range: "$299 – $499",
                turnaround: "~15 minutes",
                desc: "Multi-tenant routing, worker job queues, relational migrations, and automated test harnesses.",
              },
            ].map((b, idx) => (
              <div key={idx} className="p-5 rounded-lg border border-border bg-card space-y-2">
                <div className="text-sm text-muted-foreground font-mono">Scope Benchmark</div>
                <h3 className="font-bold text-sm text-foreground">{b.title}</h3>
                <div className="text-2xl font-extrabold text-primary font-mono">{b.range}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                <div className="text-sm text-muted-foreground pt-2 border-t border-border">
                  Turnaround: <span className="font-semibold text-foreground">{b.turnaround}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Verification Banner */}
        <div className="p-6 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-bold text-foreground text-sm">Automated Test Verification & Parity Scoring</div>
              <div className="text-muted-foreground text-sm mt-0.5">
                Every generated repository is compiled and verified in an isolated sandbox before delivery. If delivery falls below quality thresholds, platform credits are automatically issued.
              </div>
            </div>
          </div>
          <Link href="/contact" className="shrink-0">
            <Button variant="outline" size="sm" className="text-sm">
              Contact Support
            </Button>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
