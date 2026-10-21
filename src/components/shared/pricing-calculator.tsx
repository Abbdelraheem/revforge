"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sliders } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1, TierKey } from "@/lib/pricing/engine";
import { BRAND } from "@/config/brand";

export function PricingCalculator() {
  const [estimatedHours, setEstimatedHours] = useState(24);
  const [tier, setTier] = useState<TierKey>("web_app");

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

  const tierCfg = DEFAULT_PRICING_CONFIG_V1.tiers[tier];
  const rateDollars = tierCfg.hourlyRateCents / 100;
  const humanAgencyCost = Math.round(estimatedHours * rateDollars);
  const platformPrice = quote.totalCents / 100;
  const savings = humanAgencyCost > 0 ? Math.round(((humanAgencyCost - platformPrice) / humanAgencyCost) * 100) : 50;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4 font-sans text-sm">
          <div className="flex justify-between items-center">
            <label className="font-bold text-foreground text-sm">Target Complexity Tier:</label>
            <span className="font-mono text-primary font-bold">{tier.replace(/_/g, " ").toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "portfolio", label: "Portfolio / Landing", hrs: 12 },
              { id: "web_app", label: "Web App", hrs: 24 },
              { id: "mobile_app", label: "Mobile Binary", hrs: 40 },
              { id: "enterprise_saas", label: "Full SaaS", hrs: 80 },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTier(t.id as TierKey);
                  setEstimatedHours(t.hrs);
                }}
                className={`p-2.5 rounded border text-left transition-colors ${
                  tier === t.id
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/20"
                }`}
              >
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-sm text-muted-foreground">
                  ${DEFAULT_PRICING_CONFIG_V1.tiers[t.id as TierKey].hourlyRateCents / 100}/hr
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-foreground">Estimated Engineering Hours:</label>
              <span className="font-mono font-bold text-primary">{estimatedHours} hrs</span>
            </div>
            <input
              type="range"
              min={4}
              max={160}
              step={2}
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>4 hrs</span>
              <span>80 hrs</span>
              <span>160 hrs</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border font-mono text-center">
          <div className="p-4 rounded-lg border border-border bg-background space-y-1">
            <div className="text-sm text-muted-foreground uppercase">{BRAND.name} Price</div>
            <div className="text-3xl font-extrabold text-foreground">${platformPrice}</div>
            <div className="text-sm text-muted-foreground">50% of Market Benchmark</div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-background space-y-1">
            <div className="text-sm text-muted-foreground uppercase">Market Agency Estimate</div>
            <div className="text-2xl font-bold text-muted-foreground line-through">${humanAgencyCost}</div>
            <div className="text-sm text-muted-foreground">{estimatedHours} hrs @ ${rateDollars}/hr</div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-background space-y-1">
            <div className="text-sm text-muted-foreground uppercase">Estimated Client Savings</div>
            <div className="text-3xl font-extrabold text-primary">~{savings}%</div>
            <div className="text-sm text-muted-foreground">Automated Pipeline</div>
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
