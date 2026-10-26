import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { systemDb } from "@/db";
import { pricingConfig, pricingTiers, tierCostStats } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_PRICING_TIERS, checkCostFloor, TierId } from "@/lib/pricing/tiers";
import { env } from "@/env";

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

  const dbPricingTiers = await systemDb
    .select()
    .from(pricingTiers)
    .catch(() => []);

  const stats = await systemDb
    .select()
    .from(tierCostStats)
    .where(eq(tierCostStats.modelProfile, "launch"))
    .catch(() => []);

  const belowFloorTiers: string[] = [];
  for (const tierId of Object.keys(DEFAULT_PRICING_TIERS) as TierId[]) {
    const tierDef = DEFAULT_PRICING_TIERS[tierId];
    const stat = stats.find((s) => s.tier === tierId);
    if (stat) {
      const check = checkCostFloor({
        priceCents: tierDef.priceCents,
        projectedCostP90Cents: stat.p90CostCents,
      });
      if (!check.allowed) {
        belowFloorTiers.push(`${tierDef.name} ($${tierDef.priceCents / 100} < floor $${check.costFloorCents / 100})`);
      }
    }
  }

  const isTestProfile = env.MODEL_PROFILE === "test";

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 p-4 font-sans sm:p-6 lg:p-8">
      {isTestProfile && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 font-bold text-amber-800">
          TEST PROFILE — not representative. Model costs and margins shown here reflect cheap experimentation providers and must not be used for customer pricing, quality claims, or launch decisions.
        </div>
      )}

      {belowFloorTiers.length > 0 && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 font-bold text-destructive">
          COST FLOOR GUARD ALERT: The following pricing tiers are priced below the minimum measured cost floor ({belowFloorTiers.join("; ")}). Checkout will refuse sales for these tiers without explicit admin override.
        </div>
      )}

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

      {/* Admin Pricing Tiers & Caps Table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Flat Clone Pricing Tiers &amp; Scope Caps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-mono">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2">Tier ID</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Price (USD)</th>
                  <th className="py-2">Max Screens</th>
                  <th className="py-2">Max Entities</th>
                  <th className="py-2">Max Integrations</th>
                  <th className="py-2">Max Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {Object.values(DEFAULT_PRICING_TIERS).map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 font-bold text-primary">{t.id}</td>
                    <td className="py-2">{t.name}</td>
                    <td className="py-2 font-bold">${t.priceCents / 100}</td>
                    <td className="py-2">{t.maxScreens}</td>
                    <td className="py-2">{t.maxEntities}</td>
                    <td className="py-2">{t.maxIntegrations}</td>
                    <td className="py-2">{t.maxHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
