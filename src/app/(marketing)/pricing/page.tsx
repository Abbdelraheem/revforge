"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, ShieldCheck, Sliders, DollarSign, Clock, HelpCircle } from "lucide-react";

export default function PricingPage() {
  // Dynamic Scope Estimator State
  const [estimatedHours, setEstimatedHours] = useState(24);
  const [targetType, setTargetType] = useState<"portfolio" | "web_app" | "mobile_app" | "enterprise_saas">("web_app");

  // Dynamic calculation matching src/lib/pricing/pricing-engine.ts
  const getDynamicQuote = (type: string, hours: number) => {
    let rate = 65; // standard web app agency hourly rate
    if (type === "portfolio") rate = 45;
    else if (type === "mobile_app") rate = 85;
    else if (type === "enterprise_saas") rate = 110;

    const standardAgencyCost = hours * rate;
    // Platform is 50% of standard agency human cost
    const rawTargetPrice = standardAgencyCost * 0.5;

    // Clean psychological rounding
    let cleanPrice = 99;
    if (rawTargetPrice <= 35) cleanPrice = 29;
    else if (rawTargetPrice <= 65) cleanPrice = 49;
    else if (rawTargetPrice <= 120) cleanPrice = 99;
    else if (rawTargetPrice <= 180) cleanPrice = 149;
    else if (rawTargetPrice <= 300) cleanPrice = 249;
    else cleanPrice = 499;

    return {
      cleanPrice,
      standardAgencyCost,
      savings: Math.round(((standardAgencyCost - cleanPrice) / standardAgencyCost) * 100),
    };
  };

  const currentQuote = getDynamicQuote(targetType, estimatedHours);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-7xl mx-auto w-full space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="border-primary/40 text-primary text-xs font-semibold">
            DYNAMIC SCOPE QUOTING
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Dynamic, Need-Based Pricing Per Project
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Every software target is unique. We calculate custom project pricing based on real architectural scope—with 100% free initial triage for every target.
          </p>
        </div>

        {/* Dynamic Pricing Engine Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Free Triage Box */}
          <Card className="border-border bg-card shadow-sm lg:col-span-1">
            <CardHeader className="pb-3 border-b border-border">
              <Badge variant="outline" className="w-fit text-[10px] text-primary border-primary/40 font-semibold">
                ALWAYS FREE
              </Badge>
              <CardTitle className="text-xl font-bold text-foreground mt-1">
                Static Triage & Audit
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Run safe static analysis on any target URL or binary before committing to rebuild.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs text-muted-foreground">
              <div className="text-3xl font-extrabold text-foreground font-mono">$0</div>
              <ul className="space-y-2.5">
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Full architecture boundary extraction</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Detected tech stack fingerprinting</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Evidence Ledger categorization (Seen / Inferred)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Itemized project quote calculation</span>
                </li>
              </ul>
              <Link href="/dashboard" className="block pt-2">
                <Button variant="outline" className="w-full text-xs font-semibold">
                  <span>Start Free Analysis</span>
                  <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Dynamic Estimator Box */}
          <Card className="border-primary/40 bg-card shadow-md ring-1 ring-primary/20 lg:col-span-2">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex justify-between items-center">
                <Badge variant="default" className="text-[10px] font-semibold">
                  LIVE DYNAMIC ESTIMATOR
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">Custom Paddle Invoice</span>
              </div>
              <CardTitle className="text-xl font-bold text-foreground mt-1">
                Need-Based Reconstruction Quote
              </CardTitle>
              <CardDescription className="text-xs">
                Prices adjust automatically based on project scope, API routes, and database complexity.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Target Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Select Target Category:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  {[
                    { id: "portfolio", label: "Landing / Static" },
                    { id: "web_app", label: "Web App (CRUD)" },
                    { id: "mobile_app", label: "Mobile APK" },
                    { id: "enterprise_saas", label: "Full SaaS Platform" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetType(t.id as any)}
                      className={`p-2.5 rounded border text-center transition ${
                        targetType === t.id
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border bg-background hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">Estimated Human Developer Effort:</span>
                  <span className="text-primary font-mono font-bold">{estimatedHours} Hours</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={80}
                  step={4}
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Simple Scope (8 hrs)</span>
                  <span>Medium Scope (36 hrs)</span>
                  <span>Enterprise Scope (80+ hrs)</span>
                </div>
              </div>

              {/* Output Result Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg border border-border bg-muted/20 text-center font-mono">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase">RevForge Dynamic Quote</div>
                  <div className="text-3xl font-extrabold text-primary">${currentQuote.cleanPrice}</div>
                  <div className="text-[10px] text-muted-foreground">Paddle Checkout Link</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase">Human Agency Equivalent</div>
                  <div className="text-2xl font-bold text-muted-foreground line-through">
                    ${currentQuote.standardAgencyCost}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Traditional Retainer</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase">Total Client Savings</div>
                  <div className="text-3xl font-extrabold text-emerald-600">~{currentQuote.savings}%</div>
                  <div className="text-[10px] text-muted-foreground">Delivered in Minutes</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-muted-foreground">
                  Includes full Next.js 15, Drizzle ORM, and 100% test pass guarantee.
                </div>
                <Link href="/dashboard">
                  <Button className="text-xs font-bold shadow-sm w-full sm:w-auto">
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
            <h2 className="text-2xl font-bold text-foreground">
              Real-World Project Scope Benchmarks
            </h2>
            <p className="text-xs text-muted-foreground">
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
                range: "$149 – $249",
                turnaround: "~10 minutes",
                desc: "Decompiled DEX bytecode synthesized into clean React Native and TypeScript interfaces.",
              },
              {
                title: "Full SaaS Ecosystem",
                range: "$249 – $499",
                turnaround: "~15 minutes",
                desc: "Multi-tenant routing, worker job queues, relational migrations, and automated test harnesses.",
              },
            ].map((b, idx) => (
              <div key={idx} className="p-5 rounded-lg border border-border bg-card space-y-2">
                <div className="text-xs text-muted-foreground font-mono">Scope Benchmark</div>
                <h3 className="font-bold text-sm text-foreground">{b.title}</h3>
                <div className="text-2xl font-extrabold text-primary font-mono">{b.range}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                <div className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                  Turnaround: <span className="font-semibold text-foreground">{b.turnaround}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Guarantee Banner */}
        <div className="p-6 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-bold text-foreground text-sm">100% Automated Test Pass Guarantee</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                Every generated repository is compiled and executed against automated verification tests before release. If compilation fails, an automatic refund is processed via Paddle.
              </div>
            </div>
          </div>
          <Link href="/contact" className="shrink-0">
            <Button variant="outline" size="sm" className="text-xs">
              Contact Sales
            </Button>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
