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
} from "lucide-react";
import { db } from "@/db";
import { projects, buildJobs, users, workspaces, workspaceMembers } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
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

  // Query workspace projects
  const workspaceProjects = await db
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

  // Query active jobs for this workspace
  const activeJobs = await db
    .select({
      id: buildJobs.id,
      status: buildJobs.status,
      stage: buildJobs.stage,
      createdAt: buildJobs.createdAt,
    })
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
    )
    .limit(5);

  const totalProjects = workspaceProjects.length;
  const activeBuildCount = activeJobs.length;
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
            {session.workspace.name} &bull; Organization Workspace
          </p>
        </div>
        <div className="flex items-center space-x-3">
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
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total Projects</span>
              <FolderGit2 className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              {totalProjects}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across your active workspace
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Active Builds</span>
              <Cpu className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              {activeBuildCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {activeBuildCount === 0 ? "No active jobs in queue" : `${activeBuildCount} builds running`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Platform Credits</span>
              <Coins className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              $0.00
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Available for rebuild orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Free Analysis Status</span>
              <Activity className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              {freeAnalysisRemaining > 0 ? "1 Available" : "Standard ($5)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {freeAnalysisRemaining > 0 ? "First architectural analysis is complimentary" : "Credited towards rebuild checkout"}
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
              className="text-xs font-semibold text-primary hover:underline flex items-center"
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
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Start by submitting a web URL, binary, or archive to generate an architectural report and quote.
                  </p>
                </div>
                <Button asChild size="sm" className="font-semibold shadow-sm">
                  <Link href="/projects/new">
                    <Plus className="me-1.5 h-3.5 w-3.5" />
                    <span>Create Your First Project</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {workspaceProjects.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/projects/${p.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center space-x-2"
                      >
                        <span>{p.name}</span>
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {p.description || "Architectural analysis target"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs font-mono capitalize">
                        {p.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
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
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Organization Created</p>
                  <p className="text-xs text-muted-foreground">{session.workspace.name} is configured.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                {user.emailVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-foreground">Email Verification</p>
                  <p className="text-xs text-muted-foreground">
                    {user.emailVerified ? "Account email verified" : "Check inbox to verify your email address"}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                {totalProjects > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-foreground">Run First Analysis</p>
                  <p className="text-xs text-muted-foreground">Ingest an app or binary into the clean-room pipeline.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Review Parity Report</p>
                  <p className="text-xs text-muted-foreground">Inspect evidence ledger and clean-room architecture.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Clean-room isolation &bull; Multi-tenant row security</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
