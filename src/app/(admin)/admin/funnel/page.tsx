import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFunnelMetrics, getCohortMetrics } from "@/lib/analytics/funnel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminFunnelPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const [funnelSteps, cohorts] = await Promise.all([
    getFunnelMetrics(),
    getCohortMetrics(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">
          Conversion and Retention
        </p>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Conversion Funnel &amp; Cohort Telemetry
        </h1>
        <p className="text-sm text-muted-foreground">
          Privacy-friendly first-party event tracking from initial marketing visit to repeat clean-room orders.
        </p>
      </div>

      {/* Funnel Pipeline Steps */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-serif flex items-center justify-between">
            <span>End-to-End Pipeline Conversion</span>
            <span className="text-sm font-mono text-muted-foreground font-normal">
              8 Milestones
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {funnelSteps.map((step, idx) => (
              <div
                key={step.stage}
                className="p-4 rounded border border-border bg-background space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-muted-foreground">
                      Step 0{idx + 1}
                    </span>
                    <Badge variant="outline" className="font-mono text-sm">
                      {step.conversionFromFirstPct}% total
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mt-1">
                    {step.label}
                  </h3>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <div className="text-2xl font-bold font-mono text-primary">
                    {step.count.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {idx === 0
                      ? "Top of funnel"
                      : `${step.conversionFromPreviousPct}% from step 0${idx}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cohort Retention & Repurchase Table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-serif">
            Weekly Acquisition &amp; Repurchase Cohorts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cohorts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No cohort history recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="p-3 text-start font-semibold">Cohort Week</th>
                    <th className="p-3 text-start font-semibold">Active Visitors / Signups</th>
                    <th className="p-3 text-start font-semibold">Converted (Paid)</th>
                    <th className="p-3 text-start font-semibold">Paid Conversion Rate</th>
                    <th className="p-3 text-start font-semibold">Repurchased</th>
                    <th className="p-3 text-end font-semibold">Repurchase Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr
                      key={c.cohortWeek}
                      className="border-b border-border last:border-0 hover:bg-muted/10 font-mono"
                    >
                      <td className="p-3 font-semibold text-foreground">
                        {c.cohortWeek}
                      </td>
                      <td className="p-3 text-foreground">{c.signups}</td>
                      <td className="p-3 text-foreground">{c.paidCount}</td>
                      <td className="p-3 text-primary font-bold">
                        {c.conversionPct}%
                      </td>
                      <td className="p-3 text-foreground">{c.repurchaseCount}</td>
                      <td className="p-3 text-end font-bold text-foreground">
                        {c.repurchasePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
