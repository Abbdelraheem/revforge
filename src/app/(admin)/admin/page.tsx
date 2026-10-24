import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import {
  Activity,
  ArrowRight,
  Banknote,
  CheckCircle2,
  FolderGit2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { systemDb } from "@/db";
import {
  auditLog,
  buildJobs,
  projects,
  users,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { loadMarginReport, EMPTY_MARGIN_REPORT } from "@/lib/billing/margin-report";
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

function statusVariant(status: string): "default" | "secondary" | "destructive" | "success" {
  if (status === "delivered" || status === "delivered_partial") return "success";
  if (status === "build_failed") return "destructive";
  if (status === "building" || status === "verifying") return "default";
  return "secondary";
}

export default async function AdminOverviewPage() {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    redirect("/login");
  }

  let projectCounts = [{ count: 0 }];
  let workspaceCounts = [{ count: 0 }];
  let userCounts = [{ count: 0 }];
  let memberCounts = [{ count: 0 }];
  let jobStatusRows: Array<{ status: string; count: number }> = [];
  let recentJobs: any[] = [];
  let recentAudit: any[] = [];
  let margin = EMPTY_MARGIN_REPORT;

  try {
    const res = await Promise.all([
      systemDb.select({ count: sql<number>`count(*)::int` }).from(projects),
      systemDb.select({ count: sql<number>`count(*)::int` }).from(workspaces),
      systemDb.select({ count: sql<number>`count(*)::int` }).from(users),
      systemDb.select({ count: sql<number>`count(*)::int` }).from(workspaceMembers),
      systemDb
        .select({
          status: buildJobs.status,
          count: sql<number>`count(*)::int`,
        })
        .from(buildJobs)
        .groupBy(buildJobs.status),
      systemDb
        .select({
          id: buildJobs.id,
          status: buildJobs.status,
          stage: buildJobs.stage,
          attempt: buildJobs.attempt,
          parityScore: buildJobs.parityScore,
          spentCents: buildJobs.spentCents,
          costCapCents: buildJobs.costCapCents,
          heartbeatAt: buildJobs.heartbeatAt,
          createdAt: buildJobs.createdAt,
          projectName: projects.name,
        })
        .from(buildJobs)
        .leftJoin(projects, sql`${projects.id} = ${buildJobs.projectId}`)
        .orderBy(desc(buildJobs.createdAt))
        .limit(8),
      systemDb
        .select({
          id: auditLog.id,
          action: auditLog.action,
          resourceType: auditLog.resourceType,
          resourceId: auditLog.resourceId,
          actorType: auditLog.actorType,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(8),
      loadMarginReport(),
    ]);

    [
      projectCounts,
      workspaceCounts,
      userCounts,
      memberCounts,
      jobStatusRows,
      recentJobs,
      recentAudit,
      margin,
    ] = res;
  } catch (err: any) {
    if (process.env.NODE_ENV !== "development") {
      throw err;
    }
  }

  const statusCounts = new Map<string, number>(jobStatusRows.map((row) => [row.status, row.count]));
  const activeJobs = ["queued", "building", "verifying"].reduce(
    (sum, status) => sum + (statusCounts.get(status) ?? 0),
    0
  );
  const deliveredJobs =
    (statusCounts.get("delivered") ?? 0) + (statusCounts.get("delivered_partial") ?? 0);
  const failedJobs = statusCounts.get("build_failed") ?? 0;

  const stats = [
    {
      label: "Projects",
      value: String(projectCounts[0]?.count ?? 0),
      detail: `${workspaceCounts[0]?.count ?? 0} workspaces, ${memberCounts[0]?.count ?? 0} memberships`,
      icon: FolderGit2,
    },
    {
      label: "Active build jobs",
      value: String(activeJobs),
      detail: `${deliveredJobs} delivered, ${failedJobs} failed`,
      icon: Activity,
    },
    {
      label: "Registered users",
      value: String(userCounts[0]?.count ?? 0),
      detail: "All platform accounts",
      icon: Users,
    },
    {
      label: "Contribution",
      value: money(margin.totals.grossProfitCents),
      detail: `${money(margin.totals.revenueCents)} recorded revenue (${pct(margin.totals.marginPct)})`,
      icon: Banknote,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 font-sans sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Platform Administration
          </p>
          <h1 className="font-serif text-2xl font-bold text-foreground">Operating overview</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Counts, build health, and contribution are read from persisted platform rows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="text-sm">
            <Link href="/admin/margins">
              Open margin report
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" className="text-sm">
            <Link href="/admin/jobs">Build jobs</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-sm">
            <Link href="/admin/funnel">Funnel</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-sm">
            <Link href="/admin/support">Support</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border bg-card shadow-sm">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{stat.label}</span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="font-mono text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {margin.alerts.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4" role="status">
          <p className="font-serif font-bold text-destructive">
            {margin.alerts.length} margin alert{margin.alerts.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-sm text-destructive">
            Open the margin report for the measured project detail and cost-cap rows.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-border bg-card shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border pb-3">
            <CardTitle className="font-serif text-base">Recent build jobs</CardTitle>
            <Link
              href="/admin/jobs"
              className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentJobs.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No build jobs have run yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="p-3 text-start font-medium">Project</th>
                      <th className="p-3 text-start font-medium">Status</th>
                      <th className="p-3 text-start font-medium">Stage</th>
                      <th className="p-3 text-start font-medium">Parity</th>
                      <th className="p-3 text-start font-medium">Spent</th>
                      <th className="p-3 text-start font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/10">
                        <td className="p-3">
                          <Link
                            href={`/admin/jobs?id=${job.id}`}
                            className="font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            {job.projectName ?? job.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="p-3">
                          <Badge variant={statusVariant(job.status)} className="capitalize">
                            {job.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-sm text-muted-foreground">{job.stage}</td>
                        <td className="p-3 font-mono text-sm">
                          {job.parityScore !== null ? pct(job.parityScore * 100) : "N/A"}
                        </td>
                        <td className="p-3 font-mono text-sm text-muted-foreground">
                          {job.spentCents !== null ? money(job.spentCents) : "N/A"}
                        </td>
                        <td className="p-3 font-mono text-sm text-muted-foreground">
                          <time dateTime={job.createdAt.toISOString()}>
                            {job.createdAt.toLocaleDateString()}
                          </time>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border pb-3">
            <CardTitle className="font-serif text-base">Recent audit events</CardTitle>
            <Link
              href="/admin/audit"
              className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentAudit.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No audit events are recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentAudit.map((entry) => (
                  <li key={entry.id} className="space-y-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="break-words font-mono text-sm font-semibold text-foreground">
                        {entry.action}
                      </p>
                      <Badge variant="outline" className="shrink-0">
                        {entry.actorType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.resourceType} · {entry.resourceId.slice(0, 12)}
                    </p>
                    <p className="font-mono text-sm text-muted-foreground">
                      <time dateTime={entry.createdAt.toISOString()}>
                        {entry.createdAt.toLocaleString()}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Admin pages use the system database role. Customer pages keep tenant-scoped RLS.
            </p>
          </div>
          <Link
            href="/admin/audit"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <CheckCircle2 className="h-4 w-4" />
            Inspect audit log
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
