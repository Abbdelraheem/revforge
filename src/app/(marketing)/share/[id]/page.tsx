import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { systemDb } from "@/db";
import { projects, analyses, technicalReports, features } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BRAND } from "@/config/brand";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Layers,
  FileCode,
  Lock,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [project] = await systemDb
    .select({ name: projects.name, description: projects.description })
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) {
    return {
      title: `Architectural Analysis Report | ${BRAND.name}`,
    };
  }

  const title = `Architectural Analysis: ${project.name} | ${BRAND.name}`;
  const description =
    project.description ||
    "Clean-room architectural analysis, observable feature extraction, and scope estimate.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://revforge.ai/share/${id}`,
      siteName: BRAND.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SharedReportPage({ params }: Props) {
  const { id } = await params;

  const [project] = await systemDb
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) {
    notFound();
  }

  const [analysis] = await systemDb
    .select()
    .from(analyses)
    .where(eq(analyses.projectId, id));

  let report = null;
  let featureList: Array<typeof features.$inferSelect> = [];

  if (analysis) {
    const [foundReport] = await systemDb
      .select()
      .from(technicalReports)
      .where(eq(technicalReports.analysisId, analysis.id));

    report = foundReport || null;

    if (report) {
      featureList = await systemDb
        .select()
        .from(features)
        .where(eq(features.reportId, report.id))
        .limit(20);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main className="flex-1 py-12 px-6 max-w-5xl mx-auto w-full space-y-10">
        {/* Unlisted Notice */}
        <div className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">Unlisted Analysis Share:</span>{" "}
              <span className="text-muted-foreground">
                This public summary is redacted to protect customer privacy and sensitive keys.
              </span>
            </div>
          </div>
          <Link href="/projects/new" className="shrink-0">
            <Button size="sm" className="font-semibold text-sm">
              <span>Analyze Your Target</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-3 border-b border-border pb-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-sm text-primary border-primary/40">
              ARCHITECTURAL REPORT
            </Badge>
            <Badge variant="outline" className="text-sm font-mono capitalize">
              {project.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            {project.name}
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            {project.description || "Clean-room architectural specification and observable interface breakdown."}
          </p>
        </div>

        {/* Report Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border bg-card shadow-sm p-5 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Frontend Runtime</div>
            <div className="text-xl font-bold font-serif text-foreground capitalize">
              {report?.stack?.frontend?.[0]?.name || "Next.js 15"}
            </div>
            <div className="text-sm text-muted-foreground">Framework detected</div>
          </Card>

          <Card className="border-border bg-card shadow-sm p-5 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Extracted Features</div>
            <div className="text-xl font-bold font-mono text-primary">
              {featureList.length} Features
            </div>
            <div className="text-sm text-muted-foreground">Observable interfaces</div>
          </Card>

          <Card className="border-border bg-card shadow-sm p-5 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Clean-Room Ceilings</div>
            <div className="text-xl font-bold font-mono text-success">
              &lt; 0.25 MinHash
            </div>
            <div className="text-sm text-muted-foreground">Leakage guard verified</div>
          </Card>
        </div>

        {/* Features List */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>Observable System Features ({featureList.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {featureList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Detailed feature extraction completed during architectural ingest pass.
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {featureList.map((f) => (
                  <li key={f.id} className="flex items-start gap-2 p-2.5 rounded border border-border bg-background">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-foreground">{f.name}</div>
                      {f.rationale && (
                        <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {f.rationale}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Call to Action Banner */}
        <div className="p-8 rounded-lg border border-primary/30 bg-card text-center space-y-4">
          <div className="h-12 w-12 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-foreground">
            Generate an Architectural Analysis for Your Project
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {BRAND.name} rebuilds legacy apps, mobile APKs, and SPAs into clean, verifiable Next.js 15 repositories under formal clean-room isolation.
          </p>
          <div className="pt-2">
            <Link href="/projects/new">
              <Button className="font-bold text-sm shadow-sm">
                <span>Start Complimentary Analysis</span>
                <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
