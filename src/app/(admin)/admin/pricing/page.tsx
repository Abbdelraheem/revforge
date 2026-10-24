import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { systemDb } from "@/db";
import { pricingConfig } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  let activeConfig: any = null;
  try {
    const [row] = await systemDb
      .select()
      .from(pricingConfig)
      .orderBy(desc(pricingConfig.version))
      .limit(1);
    activeConfig = row;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[AdminPricingPage] Local database offline, using default config.");
    } else {
      throw err;
    }
  }

  const tiers = activeConfig?.tiers || {};

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">
          Pricing Algorithm
        </p>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Dynamic Pricing Engine Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Active pricing version v{activeConfig?.version ?? 1} enforcing integer cent billing (factor: {(activeConfig?.factorBp ?? 5000) / 10000}).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif">Formula & Coefficients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-mono font-bold">v{activeConfig?.version ?? 1}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Discount Factor:</span>
              <span className="font-mono font-bold">{(activeConfig?.factorBp ?? 5000) / 10000} (50%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Hours / Feature:</span>
              <span className="font-mono font-bold">{activeConfig?.maxHoursPerFeature ?? 200} hrs</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif">Market Hourly Benchmarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {Object.entries(tiers).map(([k, t]: [string, any]) => (
              <div key={k} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}:</span>
                <span className="font-mono font-bold">
                  ${t.hourlyRateCents / 100}/hr (floor: ${t.minOrderCents / 100})
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
