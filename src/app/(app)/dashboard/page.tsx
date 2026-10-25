import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FolderGit2,
  Cpu,
  Coins,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Terminal,
  Activity,
  Layers,
  FileCode,
  ShieldCheck,
  Eye,
  Users,
} from "lucide-react";
import { withTenant } from "@/db/tenant";
import { projects, buildJobs, creditsLedger } from "@/db/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/config/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const workspaceId = session.workspace.id;
  const user = session.user;

  let workspaceProjects: any[] = [];
  let projectCount = 0;
  let activeBuildCount = 0;
  let balanceCents = 0;

  try {
    const res = await withTenant(
      { userId: user.id, workspaceId },
      async (tx) => {
        const projs = await tx
          .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            status: projects.status,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
          })
          .from(projects)
          .where(eq(projects.workspaceId, workspaceId))
          .orderBy(desc(projects.createdAt))
          .limit(10);

        const [projectCountRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(projects)
          .where(eq(projects.workspaceId, workspaceId));

        const [activeJobCountRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(buildJobs)
          .where(
            and(
              eq(buildJobs.workspaceId, workspaceId),
              or(
                eq(buildJobs.status, "queued"),
                eq(buildJobs.status, "building"),
                eq(buildJobs.status, "verifying")
              )
            )
          );

        const [balanceRow] = await tx
          .select({
            total: sql<number>`coalesce(sum(${creditsLedger.deltaCents}), 0)::int`,
          })
          .from(creditsLedger)
          .where(eq(creditsLedger.workspaceId, workspaceId));

        return {
          workspaceProjects: projs,
          projectCount: Number(projectCountRow?.count ?? 0),
          activeBuildCount: Number(activeJobCountRow?.count ?? 0),
          balanceCents: Math.max(0, Number(balanceRow?.total ?? 0)),
        };
      }
    );
    workspaceProjects = res.workspaceProjects;
    projectCount = res.projectCount;
    activeBuildCount = res.activeBuildCount;
    balanceCents = res.balanceCents;
  } catch (err: any) {
    if (process.env.NODE_ENV !== "development") {
      throw err;
    }
  }

  const totalProjects = projectCount;
  const freeAnalysisRemaining = Math.max(0, 1 - (user.analysisCreditsUsed || 0));

  return (
    <div className="space-y-8 font-sans text-foreground">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-foreground">
            Workspace Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {session.workspace.name} | Organization Workspace
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button asChild variant="outline" className="text-sm font-semibold h-10 shadow-sm">
            <Link href="/demo">
              <Eye className="me-2 h-4 w-4 text-primary" />
              <span>Explore Demo</span>
            </Link>
          </Button>
          <Button asChild className="text-sm font-semibold h-10 shadow-sm">
            <Link href="/projects/new">
              <Plus className="me-2 h-4 w-4" />
              <span>New Analysis</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Projects</span>
              <FolderGit2 className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              {totalProjects}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across your active workspace
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Active Builds</span>
              <Cpu className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              {activeBuildCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {activeBuildCount === 0 ? "No active jobs in queue" : `${activeBuildCount} builds running`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Platform Credits</span>
              <Coins className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              ${(balanceCents / 100).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <Link href="/billing" className="font-medium text-primary hover:underline">
                Ledger balance
              </Link>{" "}
              available for build and Studio orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Free Analysis Status</span>
              <Activity className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              {freeAnalysisRemaining > 0 ? "1 Available" : "Standard"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {freeAnalysisRemaining > 0
                ? "First architectural analysis is complimentary"
                : "Additional analyses use the analysis fee recorded at checkout"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-foreground">
              Recent Projects
            </h2>
            <Link
              href="/projects"
              className="text-sm font-semibold text-primary hover:underline flex items-center"
            >
              <span>View all projects</span>
              <ArrowRight className="ms-1 h-3 w-3" />
            </Link>
          </div>

          <Card className="border-border bg-card shadow-sm overflow-hidden">
            {workspaceProjects.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <FolderGit2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">No projects yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Start by submitting a web URL, binary, or archive to generate an architectural report and quote.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Button asChild variant="outline" size="sm" className="font-semibold shadow-sm">
                    <Link href="/demo">
                      <Eye className="me-1.5 h-3.5 w-3.5 text-primary" />
                      <span>Explore Live Demo</span>
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="font-semibold shadow-sm">
                    <Link href="/projects/new">
                      <Plus className="me-1.5 h-3.5 w-3.5" />
                      <span>Create Your First Project</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {workspaceProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="truncate">{p.name}</span>
                      </Link>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {p.description || "Architectural analysis target"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant="outline" className="font-mono text-sm capitalize">
                        {p.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-mono text-sm text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar / Onboarding Checklist */}
        <div className="space-y-4">
          <h2 className="text-lg font-serif font-bold text-foreground">
            Onboarding Checklist
          </h2>

          <Card className="border-border bg-card shadow-sm p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Organization Configured</p>
                  <p className="text-sm text-muted-foreground">{session.workspace.name} workspace active.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <Link href="/demo" className="font-medium text-primary hover:underline flex items-center gap-1">
                    <span>Explore Benchmark Demo</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Inspect 100% parity verified rebuild of Target 01.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                {totalProjects > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div>
                  <Link href="/projects/new" className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    <span>Run First Architectural Analysis</span>
                    <ArrowRight className="h-3 w-3 text-primary" />
                  </Link>
                  <p className="text-sm text-muted-foreground">Ingest an app or binary into the clean-room pipeline.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <Link href="/team" className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    <span>Invite Team Members</span>
                    <ArrowRight className="h-3 w-3 text-primary" />
                  </Link>
                  <p className="text-sm text-muted-foreground">Shared workspace credits and build access.</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Clean-room isolation | Multi-tenant row security</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
