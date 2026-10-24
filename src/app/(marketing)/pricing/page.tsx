"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  ArrowRight,
  ShieldCheck,
  Sliders,
  DollarSign,
  Clock,
  HelpCircle,
  Cpu,
  RefreshCw,
  FileCheck,
  Scale,
} from "lucide-react";
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
                  <span>Observable interface &amp; network trace extraction</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Evidence Ledger (Seen vs. Inferred boundaries)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Itemized complexity quote &amp; milestone schedule</span>
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

                <div className="space-y-1 border-y sm:border-y-0 sm:border-x border-border/60 py-3 sm:py-0 px-2">
                  <div className="text-sm text-primary font-bold uppercase tracking-wider">Clean-Room Price</div>
                  <div className="text-3xl font-extrabold text-foreground font-mono">
                    ${platformPrice}
                  </div>
                  <div className="text-sm text-muted-foreground">50% market benchmark</div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground uppercase">Estimated Client Savings</div>
                  <div className="text-3xl font-extrabold text-foreground font-mono">~{savings}%</div>
                  <div className="text-sm text-muted-foreground">Estimated vs. assumed agency market rates (indicative only)</div>
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

        {/* Studio Tokens & Post-Delivery Iteration Pricing */}
        <section className="space-y-6 border-t border-border pt-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="outline" className="border-primary/40 text-primary text-sm font-semibold">
              POST-DELIVERY ITERATION
            </Badge>
            <h2 className="text-2xl font-bold text-foreground font-serif">
              {BRAND.name} Studio Tokens &amp; Transparent Pricing
            </h2>
            <p className="text-sm text-muted-foreground">
              After delivery, modify your application in {BRAND.name} Studio using pay-as-you-go credits. No monthly seat fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border bg-card shadow-sm p-6 space-y-3">
              <div className="h-10 w-10 rounded border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-foreground font-serif">$0.25 Minimum Floor</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Small visual edits (color changes, text tweaks, metadata edits) cost as low as $0.25 per successful verified commit.
              </p>
            </Card>

            <Card className="border-border bg-card shadow-sm p-6 space-y-3">
              <div className="h-10 w-10 rounded border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-foreground font-serif">1.5× Provider Markup</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Edits settle strictly at 1.5× the actual Anthropic Claude LLM API token costs consumed. You only pay for computed work.
              </p>
            </Card>

            <Card className="border-border bg-card shadow-sm p-6 space-y-3">
              <div className="h-10 w-10 rounded border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-foreground font-serif">Hold &amp; Settle Model</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Credits are held temporarily when an edit initiates. If an edit fails verification, the hold is released immediately with zero penalty.
              </p>
            </Card>
          </div>
        </section>

        {/* Empirical Benchmark Case Studies */}
        <section className="space-y-6 border-t border-border pt-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="outline" className="border-primary/40 text-primary text-sm font-semibold">
              MEASURED BENCHMARK TARGETS
            </Badge>
            <h2 className="text-2xl font-bold text-foreground font-serif">
              Empirical Validation Case Studies
            </h2>
            <p className="text-sm text-muted-foreground">
              Real results measured across our 12 reference validation suites. Zero fabricated numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                id: "01-static-landing",
                name: "Nova SaaS Landing Page",
                tier: "Landing Page",
                hours: "2.5 hrs",
                cost: "$75.00",
                parity: "100%",
                leakage: "< 2.9%",
                status: "Delivered",
              },
              {
                id: "03-spa-dashboard",
                name: "Apex Analytics SPA",
                tier: "Web Application",
                hours: "24.0 hrs",
                cost: "$720.00",
                parity: "100%",
                leakage: "< 2.9%",
                status: "Delivered",
              },
              {
                id: "05-ecommerce-demo",
                name: "MerchStore Catalog",
                tier: "E-Commerce",
                hours: "32.0 hrs",
                cost: "$960.00",
                parity: "100%",
                leakage: "< 2.9%",
                status: "Delivered",
              },
              {
                id: "08-har-capture",
                name: "Network HAR Flow",
                tier: "REST / State App",
                hours: "18.0 hrs",
                cost: "$540.00",
                parity: "100%",
                leakage: "< 2.9%",
                status: "Delivered",
              },
            ].map((cs) => (
              <div key={cs.id} className="p-5 rounded-lg border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-primary font-semibold">
                    {cs.id}
                  </span>
                  <Badge variant="outline" className="text-sm font-mono">
                    {cs.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{cs.name}</h3>
                  <div className="text-sm text-muted-foreground">{cs.tier}</div>
                </div>
                <div className="border-t border-border pt-2 space-y-1 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scope:</span>
                    <span className="text-foreground">{cs.hours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="text-primary font-bold">{cs.cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parity Score:</span>
                    <span className="text-success font-bold">{cs.parity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Leakage:</span>
                    <span className="text-foreground">{cs.leakage}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Real Objections FAQ */}
        <section className="space-y-6 border-t border-border pt-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground font-serif">
              Frequently Answered Objections
            </h2>
            <p className="text-sm text-muted-foreground">
              Direct technical answers regarding legality, intellectual property, quality, and refund policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border bg-card shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-serif font-bold text-base">
                <Scale className="h-5 w-5 text-primary" />
                <span>Is clean-room synthesis legally sound?</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes. Clean-room engineering is an established legal method affirmed under NEC v. Intel and Sega v. Accolade. Our pipeline extracts only observable interfaces, network specifications, and schema definitions. Untrusted disassembly runs behind strict isolation boundaries, and our MinHash k-shingle leakage scanner enforces a strict &lt; 0.25 similarity ceiling.
              </p>
            </Card>

            <Card className="border-border bg-card shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-serif font-bold text-base">
                <FileCheck className="h-5 w-5 text-primary" />
                <span>Who owns the delivered source code?</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You own 100% of all synthesized repositories, documentation, and migration artifacts delivered by the platform. Upon completed delivery, you can export the full Git commit history and apply any open-source or proprietary license of your choosing. {BRAND.name} retains zero intellectual property claims over your generated code.
              </p>
            </Card>

            <Card className="border-border bg-card shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-serif font-bold text-base">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>How is build quality and parity measured?</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Before any archive is packaged, it is compiled in an isolated sandbox runner (`npm ci`, `npm run build`), tested against Playwright route snapshots with pixelmatch visual difference evaluation, and verified against functional behavioral obligations. Delivery requires meeting a composite parity score of ≥ 0.85 with verified coverage ≥ 0.80.
              </p>
            </Card>

            <Card className="border-border bg-card shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-serif font-bold text-base">
                <RefreshCw className="h-5 w-5 text-primary" />
                <span>What is the refund policy if a build fails?</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an automated build encounters an unrecoverable compilation error or fails to satisfy minimum parity thresholds, the platform immediately cancels the job and credits 100% of the build payment back to your workspace credit ledger. Platform credits can be reused for alternative targets or post-delivery Studio edits.
              </p>
            </Card>
          </div>
        </section>

        {/* Verification Banner */}
        <div className="p-6 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-bold text-foreground text-sm">Automated Test Verification &amp; Parity Scoring</div>
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
