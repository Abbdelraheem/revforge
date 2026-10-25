import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { systemDb } from "@/db";
import { pricingConfig } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface PricedTier {
  hourlyRateCents: number;
  minOrderCents: number;
}

export default async function AdminPricingPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const [activeConfig] = await systemDb
    .select()
    .from(pricingConfig)
    .orderBy(desc(pricingConfig.version))
    .limit(1);

  const tiers = (activeConfig?.tiers ?? {}) as Record<string, PricedTier>;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 p-4 font-sans sm:p-6 lg:p-8">
      <div className="space-y-2 border-b border-border pb-4">
        <Badge variant="outline" className="border-primary/40 text-sm text-primary">
          PRICING ALGORITHM
        </Badge>
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          Dynamic Pricing Engine Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeConfig
            ? `Active pricing version v${activeConfig.version}, read from the pricing_config table.`
            : "No pricing configuration row is recorded. Default values are not substituted."}
        </p>
      </div>

      {activeConfig ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-base">Formula &amp; Coefficients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-mono font-bold">v{activeConfig.version}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Discount factor:</span>
                <span className="font-mono font-bold">
                  {activeConfig.factorBp / 10000} ({activeConfig.factorBp / 100}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max hours / feature:</span>
                <span className="font-mono font-bold">{activeConfig.maxHoursPerFeature} hrs</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-base">Market hourly benchmarks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {Object.entries(tiers).length === 0 ? (
                <p className="text-muted-foreground">No tier rows are stored in this config.</p>
              ) : (
                Object.entries(tiers).map(([key, tier]) => (
                  <div
                    key={key}
                    className="flex justify-between border-b border-border pb-1.5 last:border-0"
                  >
                    <span className="capitalize text-muted-foreground">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="font-mono font-bold">
                      ${tier.hourlyRateCents / 100}/hr (floor: ${tier.minOrderCents / 100})
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="space-y-2 p-6">
            <p className="font-semibold text-foreground">Pricing configuration is empty</p>
            <p className="text-sm text-muted-foreground">
              Insert a real row in <code className="font-mono">pricing_config</code> before relying
              on this page. The admin view does not invent a fallback version.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
