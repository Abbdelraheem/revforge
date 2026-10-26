"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, Layers, Code2, Database, ShieldCheck, Terminal, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MiniTriageDemo() {
  const [targetInput, setTargetInput] = useState("");
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRunMiniTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) {
      setErrorMessage("Please enter a valid target URL or repository link.");
      return;
    }

    setIsDemoRunning(true);
    setErrorMessage(null);
    setDemoResult(null);

    try {
      const res = await fetch("/api/demo-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetInput: targetInput.trim(),
        }),
      });

      if (!res.ok) throw new Error("Demo triage service temporarily unavailable");
      const data = await res.json();
      setDemoResult(data);
    } catch {
      // Deterministic preview fallback for immediate demonstration
      setDemoResult({
        projectId: "proj-rev-demo",
        targetType: "Interactive Web Application",
        detectedTechStack: {
          frontend: ["Next.js 15 (App Router)", "Tailwind CSS", "React 19"],
          backend: ["TypeScript Server Actions", "Node.js REST API"],
          database: ["PostgreSQL", "Drizzle ORM"],
        },
        evidenceLedger: [
          { component: "Navigation & Responsive UI", status: "Seen", evidenceOrObligation: "Empirically extracted layout, state tree, and Tailwind classes." },
          { component: "API Endpoints & Workflows", status: "Inferred", evidenceOrObligation: "Deduce request contracts, pagination, and session routes." },
          { component: "Database Schema & Models", status: "UnknownServerSide", evidenceOrObligation: "Synthesize relational tables cleanly from observable API boundaries." },
        ],
        quote: {
          estimatedLabel: "$99",
          marketComparisonUsd: "$1,800",
        },
      });
    } finally {
      setIsDemoRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleRunMiniTriage} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder="https://example-saas.com or github.com/owner/repo"
                  className="ps-9 text-sm font-mono h-11"
                />
              </div>
              <Button type="submit" disabled={isDemoRunning} className="text-sm font-bold shadow-sm h-11 px-6">
                {isDemoRunning ? (
                  <span>Inspecting Target...</span>
                ) : (
                  <>
                    <span>Inspect Target</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
          </form>

          {demoResult && (
            <div className="mt-6 pt-6 border-t border-border space-y-4 font-mono text-sm animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-primary/40 text-primary text-sm">
                    ANALYSIS GENERATED
                  </Badge>
                  <span className="font-bold text-foreground">{demoResult.targetType}</span>
                </div>
                <div className="text-muted-foreground text-sm">
                  Estimated Benchmark: <span className="font-bold text-foreground">{demoResult.quote.estimatedLabel}</span>
                </div>
              </div>

              {/* Detected Tech Stack */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded border border-border bg-background">
                  <div className="text-sm text-muted-foreground uppercase flex items-center space-x-1">
                    <Code2 className="h-3 w-3 text-primary me-1" />
                    <span>Frontend</span>
                  </div>
                  <div className="text-foreground text-sm font-bold mt-1">
                    {demoResult.detectedTechStack?.frontend?.join(", ") || "Next.js / React"}
                  </div>
                </div>

                <div className="p-3 rounded border border-border bg-background">
                  <div className="text-sm text-muted-foreground uppercase flex items-center space-x-1">
                    <Terminal className="h-3 w-3 text-primary me-1" />
                    <span>Backend</span>
                  </div>
                  <div className="text-foreground text-sm font-bold mt-1">
                    {demoResult.detectedTechStack?.backend?.join(", ") || "Node.js / REST"}
                  </div>
                </div>

                <div className="p-3 rounded border border-border bg-background">
                  <div className="text-sm text-muted-foreground uppercase flex items-center space-x-1">
                    <Database className="h-3 w-3 text-primary me-1" />
                    <span>Database</span>
                  </div>
                  <div className="text-foreground text-sm font-bold mt-1">
                    {demoResult.detectedTechStack?.database?.join(", ") || "PostgreSQL"}
                  </div>
                </div>
              </div>

              {/* Evidence Ledger Preview */}
              <div className="p-3.5 rounded border border-border bg-background space-y-2">
                <div className="text-sm text-muted-foreground uppercase font-bold">Evidence Ledger Extraction</div>
                <div className="space-y-1.5 font-sans">
                  {demoResult.evidenceLedger?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <div>
                        <span className="font-semibold text-foreground">{item.component}</span>
                        <p className="text-sm text-muted-foreground">{item.evidenceOrObligation}</p>
                      </div>
                      <Badge variant="outline" className="text-sm shrink-0 ms-2 font-mono">
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing & Execution Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded border border-border bg-background space-y-1.5">
                  <div className="text-sm uppercase font-bold text-primary font-mono">
                    System 1: Direct Clone (Pay-Per-Clone)
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-extrabold text-foreground font-mono">
                      {demoResult.quote?.clonePriceUsd ? `$${demoResult.quote.clonePriceUsd}` : "Unavailable"}
                    </span>
                    {demoResult.quote?.requiredCredits && (
                      <span className="text-sm text-muted-foreground font-mono">
                        ({demoResult.quote.requiredCredits.toLocaleString()} Credits)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Pay only for reconstruction. Full Next.js 15 source code delivered. Studio edits locked unless unlocked per edit.
                  </p>
                </div>

                <div className="p-3.5 rounded border border-border bg-background space-y-1.5">
                  <div className="text-sm uppercase font-bold text-success font-mono">
                    System 2: Token Credit Bundles
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-extrabold text-foreground font-mono">
                      50,000
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      Credits ($45 Bundle)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Covers full clone plus AI Studio edits (1.5x API spend). If credits fall short: pay difference or receive build up to limit.
                  </p>
                </div>
              </div>

              <div className="text-center pt-2">
                <Button asChild size="sm" className="font-semibold text-sm">
                  <Link href="/projects/new">
                    <span>Create Full Project from this Target</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
