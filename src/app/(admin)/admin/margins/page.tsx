import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { loadMarginReport } from "@/lib/billing/margin-report";
import { env } from "@/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function AdminMarginsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  const params = await searchParams;
  const from = parseDate(typeof params.from === "string" ? params.from : undefined);
  const to = parseDate(typeof params.to === "string" ? params.to : undefined, true);
  const projectId =
    typeof params.projectId === "string" && params.projectId ? params.projectId : undefined;

  const report = await loadMarginReport({ from, to, projectId });
  const query = new URLSearchParams();
  if (typeof params.from === "string" && params.from) query.set("from", params.from);
  if (typeof params.to === "string" && params.to) query.set("to", params.to);
  if (projectId) query.set("projectId", projectId);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">
          Margin Accounting
        </p>
        <h1 className="text-3xl font-serif font-bold text-foreground">Margins</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Revenue from recorded payments, processor fees, real provider cost events, and deferred
          Studio credit liability. Nothing on this page is estimated from a quote or a token guess.
        </p>
      </div>

      {report.alerts.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-2">
          <p className="font-serif font-bold text-destructive">
            {report.alerts.length} margin alert{report.alerts.length === 1 ? "" : "s"}
          </p>
          <ul className="space-y-1 text-sm text-destructive">
            {report.alerts.slice(0, 8).map((alert, index) => (
              <li key={`${alert.projectId}-${alert.kind}-${index}`}>
                {alert.projectName}: {alert.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">From</span>
          <input
            type="date"
            name="from"
            defaultValue={typeof params.from === "string" ? params.from : ""}
            className="h-9 rounded-md border border-border bg-background px-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">To</span>
          <input
            type="date"
            name="to"
            defaultValue={typeof params.to === "string" ? params.to : ""}
            className="h-9 rounded-md border border-border bg-background px-2"
          />
        </label>
        <label className="space-y-1 text-sm min-w-[220px] flex-1">
          <span className="block text-muted-foreground">Project</span>
          <select
            name="projectId"
            defaultValue={projectId || ""}
            className="h-9 w-full rounded-md border border-border bg-background px-2"
          >
            <option value="">All projects</option>
            {report.projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.projectName}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/api/admin/margins/export?${query.toString()}`}>Export CSV</Link>
        </Button>
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ["Revenue", money(report.totals.revenueCents)],
          ["Fees", money(report.totals.feesCents)],
          ["Provider cost", money(report.totals.providerCostCents)],
          ["Contribution", money(report.totals.grossProfitCents)],
          ["Margin", pct(report.totals.marginPct)],
        ].map(([label, value]) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="p-4 space-y-1">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-bold font-mono">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Per project</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-start font-semibold">Project</th>
                  <th className="p-3 text-end font-semibold">Revenue</th>
                  <th className="p-3 text-end font-semibold">Fees</th>
                  <th className="p-3 text-end font-semibold">Provider</th>
                  <th className="p-3 text-end font-semibold">Contribution</th>
                  <th className="p-3 text-end font-semibold">Margin</th>
                  <th className="p-3 text-end font-semibold">Liability</th>
                </tr>
              </thead>
              <tbody>
                {report.projects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No projects are recorded yet.
                    </td>
                  </tr>
                )}
                {report.projects.map((project) => (
                  <tr key={project.projectId} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <Link className="underline decoration-border underline-offset-4" href={`/projects/${project.projectId}`}>
                        {project.projectName}
                      </Link>
                      <p className="font-mono text-sm text-muted-foreground">
                        {project.projectId.slice(0, 8)}
                      </p>
                    </td>
                    <td className="p-3 text-end font-mono">{money(project.revenueCents)}</td>
                    <td className="p-3 text-end font-mono">{money(project.feesCents)}</td>
                    <td className="p-3 text-end font-mono">
                      {money(project.providerCostCents)}
                      <p className="text-sm text-muted-foreground">
                        A {money(project.byStage.analysis)} · B {money(project.byStage.build)} · S{" "}
                        {money(project.byStage.studio)} · P {money(project.byStage.preview)}
                      </p>
                    </td>
                    <td className="p-3 text-end font-mono">{money(project.grossProfitCents)}</td>
                    <td className="p-3 text-end font-mono">
                      <span
                        className={
                          project.marginPct !== null && project.marginPct < env.MARGIN_ALERT_PCT
                            ? "text-destructive font-bold"
                            : ""
                        }
                      >
                        {pct(project.marginPct)}
                      </span>
                    </td>
                    <td className="p-3 text-end font-mono">{money(project.liabilityCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Per day</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="p-3 text-start font-semibold">Day</th>
                  <th className="p-3 text-end font-semibold">Revenue</th>
                  <th className="p-3 text-end font-semibold">Fees</th>
                  <th className="p-3 text-end font-semibold">Provider</th>
                  <th className="p-3 text-end font-semibold">Contribution</th>
                  <th className="p-3 text-end font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {report.days.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No payments or cost events in this range.
                    </td>
                  </tr>
                )}
                {report.days.map((day) => (
                  <tr key={day.day} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono">{day.day}</td>
                    <td className="p-3 text-end font-mono">{money(day.revenueCents)}</td>
                    <td className="p-3 text-end font-mono">{money(day.feesCents)}</td>
                    <td className="p-3 text-end font-mono">{money(day.providerCostCents)}</td>
                    <td className="p-3 text-end font-mono">{money(day.grossProfitCents)}</td>
                    <td className="p-3 text-end font-mono">{pct(day.marginPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Pricing health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border p-3 space-y-1">
              <p className="text-muted-foreground">Studio effective markup</p>
              <p className="text-lg font-mono font-bold">
                {report.pricingHealth.studioEffectiveMarkup === null
                  ? "N/A"
                  : `${report.pricingHealth.studioEffectiveMarkup.toFixed(2)}×`}
              </p>
              <p className="text-muted-foreground">
                Avg charge {report.pricingHealth.studioAverageChargeCents === null ? "N/A" : money(report.pricingHealth.studioAverageChargeCents)} · avg cost{" "}
                {report.pricingHealth.studioAverageCostCents === null ? "N/A" : money(report.pricingHealth.studioAverageCostCents)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 space-y-1">
              <p className="text-muted-foreground">Build cost vs. price</p>
              <p className="text-lg font-mono font-bold">
                {report.pricingHealth.averageBuildCostCents === null
                  ? "N/A"
                  : `${money(report.pricingHealth.averageBuildCostCents)} / ${money(
                      report.pricingHealth.averageBuildPriceCents || 0
                    )}`}
              </p>
              <p className="text-muted-foreground">
                Suggested COST_CAP_RATIO: {report.pricingHealth.suggestedCostCapRatio ?? "N/A"} ·
                suggested STUDIO_MARKUP: {report.pricingHealth.suggestedStudioMarkup ?? "N/A"}
              </p>
            </div>
          </div>
          {report.pricingHealth.notes.map((note) => (
            <p key={note} className="text-muted-foreground">
              {note}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
