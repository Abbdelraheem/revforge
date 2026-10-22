import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  FolderGit2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  FileCode,
  DollarSign,
  Download,
  AlertCircle,
  Cpu,
  Terminal,
} from "lucide-react";
import { withTenant } from "@/db/tenant";
import {
  projects,
  targets,
  technicalReports,
  evidenceItems,
  features,
  quotes,
  quoteLines,
  buildJobs,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { initiateCheckoutAction } from "@/server/actions/checkout";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ studio_error?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { id } = await params;
  const queryParams = searchParams ? await searchParams : {};
  const studioError = queryParams.studio_error;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const workspaceId = session.workspace.id;

  const data = await withTenant(
    { userId: session.user.id, workspaceId },
    async (tx) => {
      const [proj] = await tx
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.workspaceId, workspaceId)
          )
        );

      if (!proj) return null;

      const [tgt] = await tx
        .select()
        .from(targets)
        .where(eq(targets.projectId, proj.id));

      const [quote] = await tx
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.projectId, proj.id),
            eq(quotes.status, "active")
          )
        )
        .orderBy(desc(quotes.version))
        .limit(1);

      const lines = quote
        ? await tx
            .select({
              id: quoteLines.id,
              featureId: quoteLines.featureId,
              tier: quoteLines.tier,
              hoursQ4: quoteLines.hoursQ4,
              platformCents: quoteLines.platformCents,
              selected: quoteLines.selected,
              featureName: features.name,
              featureRationale: features.rationale,
              optional: features.optional,
            })
            .from(quoteLines)
            .innerJoin(features, eq(features.id, quoteLines.featureId))
            .where(eq(quoteLines.quoteId, quote.id))
        : [];

      const [job] = await tx
        .select()
        .from(buildJobs)
        .where(eq(buildJobs.projectId, proj.id))
        .orderBy(desc(buildJobs.createdAt))
        .limit(1);

      return {
        project: proj,
        target: tgt,
        activeQuote: quote,
        quoteLinesList: lines,
        latestBuildJob: job,
      };
    }
  );

  if (!data || !data.project) {
    notFound();
  }

  const { project, target, activeQuote, quoteLinesList, latestBuildJob } = data;

  return (
    <div className="space-y-8 font-sans text-foreground">
      {/* Studio Error Alert Banner if redirected from Studio */}
      {studioError && (
        <div className="p-4 rounded-md border border-amber-600/30 bg-amber-500/10 text-amber-800 text-sm flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Studio Access Notice: {studioError}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Link href="/projects" className="text-sm text-muted-foreground hover:underline font-mono">
              Projects
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-mono text-muted-foreground">{project.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            {project.name}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            Target: {target?.rawInput || target?.normalizedUrl || "Direct Ingestion"} ({target?.kind || "unknown"})
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-sm font-mono uppercase">
            {project.status.replace(/_/g, " ")}
          </Badge>
          {(project.status === "delivered" || project.status === "delivered_partial") && (
            <>
              <Button asChild size="sm" variant="default" className="text-sm font-bold shadow-sm">
                <Link href={`/projects/${project.id}/studio`}>
                  <FileCode className="me-1.5 h-3.5 w-3.5" />
                  <span>Open in Studio</span>
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="text-sm font-bold shadow-sm">
                <Link href={`/api/download/${project.id}`}>
                  <Download className="me-1.5 h-3.5 w-3.5" />
                  <span>Download Package</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Scope & Features */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Build Status Banner if building/queued */}
          {latestBuildJob && (
            <Card className="border-border bg-card shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="font-serif font-bold text-sm text-foreground">Clean-Room Build Pipeline</span>
                </div>
                <Badge variant="outline" className="text-sm font-mono">
                  {latestBuildJob.stage}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Status: {latestBuildJob.status} &bull; Parity Score: {latestBuildJob.parityScore ? `${(latestBuildJob.parityScore * 100).toFixed(1)}%` : "Computing..."}
              </p>
            </Card>
          )}

          {/* Features and Quote Breakdown */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-serif font-bold">Reconstruction Features</CardTitle>
                  <CardDescription className="text-sm">
                    Synthesized specifications based on the Evidence Ledger
                  </CardDescription>
                </div>
                {activeQuote && (
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground font-mono">Total Quote</div>
                    <div className="text-xl font-bold font-mono text-primary">
                      ${(activeQuote.totalCents / 100).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {quoteLinesList.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No features generated yet. Architectural analysis is pending.
                </div>
              ) : (
                <div className="divide-y divide-border font-sans text-sm">
                  {quoteLinesList.map((line) => (
                    <div key={line.id} className="py-3 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-foreground text-sm">{line.featureName}</span>
                          <Badge variant="outline" className="text-sm font-mono">
                            {line.tier}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{line.featureRationale}</p>
                        <span className="text-sm text-muted-foreground font-mono">
                          {(line.hoursQ4 / 4).toFixed(2)} hrs estimated
                        </span>
                      </div>
                      <div className="text-right font-mono font-bold text-foreground">
                        ${(line.platformCents / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Checkout & Actions */}
        <div className="space-y-6">
          {activeQuote && project.status === "analyzed" && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-serif font-bold">Order Summary</CardTitle>
                <CardDescription className="text-sm font-mono">Quote v{activeQuote.version}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-sm font-mono">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-bold">${(activeQuote.subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  {activeQuote.creditsAppliedCents > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Platform Credits:</span>
                      <span>-${(activeQuote.creditsAppliedCents / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                    <span>Total Due:</span>
                    <span className="text-primary text-base">${(activeQuote.totalCents / 100).toFixed(2)}</span>
                  </div>
                </div>

                <form action={async () => {
                  "use server";
                  await initiateCheckoutAction({ projectId: project.id });
                }}>
                  <Button type="submit" className="w-full text-sm font-bold shadow-sm h-10">
                    <span>Proceed to Build Checkout</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                  </Button>
                </form>

                <div className="text-center text-sm text-muted-foreground flex items-center justify-center space-x-1 pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Verified Merchant &bull; Automated Verification</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card shadow-sm p-4 space-y-3 font-mono text-sm">
            <div className="font-bold text-foreground">Project Telemetry</div>
            <div className="space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Workspace:</span>
                <span>{session.workspace.name}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
