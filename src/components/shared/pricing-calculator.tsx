"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1 } from "@/lib/pricing/engine";
import { DEFAULT_PRICING_TIERS, TierId } from "@/lib/pricing/tiers";
import { centsToCreditsDisplay } from "@/config/pricing";
import { BRAND } from "@/config/brand";

export function PricingCalculator() {
  const [estimatedHours, setEstimatedHours] = useState(24);
  const [tier, setTier] = useState<TierId>("web_app");

  const tierDef = DEFAULT_PRICING_TIERS[tier];
  if (!tierDef) {
    return (
      <Card className="border-border bg-card p-6 text-center text-muted-foreground">
        Pricing tier unavailable.
      </Card>
    );
  }

  const quote = priceQuote(
    [
      {
        id: "target-spec",
        name: "Target Architecture Reconstruction",
        tier,
        estimatedHours,
        selected: true,
      },
    ],
    DEFAULT_PRICING_CONFIG_V1
  );

  const flatPriceUsd = tierDef.priceCents / 100;
  const flatCredits = centsToCreditsDisplay(tierDef.priceCents);
  const tierCfg = DEFAULT_PRICING_CONFIG_V1.tiers[tier];
  const rateDollars = tierCfg ? tierCfg.hourlyRateCents / 100 : 60;
  const humanAgencyCost = Math.round(estimatedHours * rateDollars);
  const savings =
    humanAgencyCost > flatPriceUsd
      ? Math.round(((humanAgencyCost - flatPriceUsd) / humanAgencyCost) * 100)
      : 0;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4 font-sans text-sm">
          <div className="flex justify-between items-center">
            <label className="font-bold text-foreground text-sm">Target Complexity Tier:</label>
            <span className="font-mono text-primary font-bold">{tierDef.name.toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { id: "portfolio", label: "Portfolio / Landing", hrs: 12 },
              { id: "web_app", label: "Web App", hrs: 24 },
              { id: "mobile_app", label: "Mobile Binary", hrs: 48 },
              { id: "enterprise_saas", label: "Full SaaS", hrs: 160 },
            ].map((t) => {
              const def = DEFAULT_PRICING_TIERS[t.id as TierId];
              const pUsd = def ? def.priceCents / 100 : 0;
              const creds = def ? centsToCreditsDisplay(def.priceCents) : 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTier(t.id as TierId);
                    setEstimatedHours(t.hrs);
                  }}
                  className={`p-2.5 rounded border text-left transition-colors ${
                    tier === t.id
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/20"
                  }`}
                >
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-sm font-mono text-primary font-bold mt-0.5">
                    ${pUsd} ({creds.toLocaleString()} Credits)
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label htmlFor="pricing-calculator-hours" className="font-semibold text-foreground">
                Estimated Engineering Hours:
              </label>
              <span className="font-mono font-bold text-primary">{estimatedHours} hrs</span>
            </div>
            <input
              id="pricing-calculator-hours"
              type="range"
              min={4}
              max={160}
              step={2}
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border font-mono text-center">
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-1">
            <div className="text-sm text-primary font-bold uppercase">Direct Clone Price</div>
            <div className="text-3xl font-extrabold text-foreground">${flatPriceUsd}</div>
            <div className="text-sm text-muted-foreground font-mono">
              {flatCredits.toLocaleString()} Credits
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-background space-y-1">
            <div className="text-sm text-muted-foreground uppercase">Agency Hours Benchmark</div>
            <div className="text-2xl font-bold text-muted-foreground line-through">
              ${humanAgencyCost}
            </div>
            <div className="text-sm text-muted-foreground">
              {estimatedHours} hrs @ ${rateDollars}/hr assumption
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-background space-y-1">
            <div className="text-sm text-muted-foreground uppercase">Cost Comparison Difference</div>
            <div className="text-3xl font-extrabold text-success">
              {savings > 0 ? `~${savings}%` : "0%"}
            </div>
            <div className="text-sm text-muted-foreground">Direct clone vs agency assumption</div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button asChild className="text-sm font-bold shadow-sm">
            <Link href="/projects/new">
              <span>Start Free Architectural Analysis</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
