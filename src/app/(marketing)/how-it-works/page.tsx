import { BRAND } from "@/config/brand";
﻿import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, ShieldCheck, Terminal, Cpu, Database, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: `How It Works — ${BRAND.name} Clean-Room Pipeline`,
  description: "End-to-end technical breakdown of the 8-stage reverse engineering and clean-room synthesis pipeline.",
};

const pipelineStages = [
  {
    step: "01",
    title: "Universal Target Ingestion",
    description: "Submit a live URL (web app, package, repo) or upload a binary (.apk, PE/ELF/Mach-O, .asar, .har). Files are verified via magic bytes and assigned cryptographic UUIDv4 vault keys.",
    controls: "SSRF IP Guard • Magic-Byte Inspection • Zero Path Traversal",
  },
  {
    step: "02",
    title: "Static Triage & Boundary Detection",
    description: "Automated analysis scans entrypoints, routes, external dependencies, and client-side assets to map exact architecture perimeters and tech-stack fingerprints.",
    controls: "Zero-Shell Runtime • Static Extraction • Sandboxed AST Parser",
  },
  {
    step: "03",
    title: "Evidence Ledger Categorization",
    description: "Every component is placed in a verified ledger: 'Seen' (empirically extracted), 'Inferred' (strongly implied data flow), or 'Unknown' (requires clean-room backend synthesis).",
    controls: "Structured Zod Typing • Delimited XML Wrapper • Prompt Injection Immunity",
  },
  {
    step: "04",
    title: "Dynamic Cost Quoting",
    description: "Algorithmic computation calculates exact token budgets and container compute requirements, enforcing a transparent, clean price before any payment is collected.",
    controls: "Server-Side Calculation • No Client-Side Trust • Paddle Billing Parity",
  },
  {
    step: "05",
    title: "Cryptographic Webhook Unlock",
    description: "Rebuild jobs are strictly gated. The backend only unlocks deep execution upon verifying signed HMAC-SHA256 webhook payloads from the payment provider.",
    controls: "HMAC Verification • Replay Attack Prevention • Idempotent Processing",
  },
  {
    step: "06",
    title: "Isolated Sandbox Rebuild",
    description: "A secure gVisor container (runsc) is spawned with --network=none, read-only rootfs, and non-root execution. Headless Ghidra / JADX reconstructs the clean-room contracts.",
    controls: "gVisor Kernel Sandbox • Network Isolation • Strict CPU/RAM Quotas",
  },
  {
    step: "07",
    title: "Automated Verification Testing",
    description: "The synthesized codebase is compiled and verified against automated unit tests and vulnerability scanners to ensure 0 CVEs and complete functional parity.",
    controls: "Automated Typecheck • Unit Test Suite • Dependency Scan",
  },
  {
    step: "08",
    title: "Repository Packaging & Delivery",
    description: "Verified source code is bundled into an archive with setup instructions, Dockerfile, and architecture documentation, downloadable via signed short-lived URLs.",
    controls: "SHA-256 Checksum • Short-Lived Signed URLs • Clean Room Legal Dossier",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <MarketingHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 space-y-16">
        {/* Header */}
        <div className="space-y-4 max-w-2xl">
          <Badge variant="outline">Pipeline Architecture</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            How {BRAND.name} Executes Clean-Room Reverse Engineering
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our 8-stage zero-trust pipeline maps observable software boundaries, eliminates prompt and command injections, and synthesizes 100% original, copyright-clean source code in isolated containers.
          </p>
        </div>

        {/* Pipeline Stepper */}
        <div className="space-y-6">
          {pipelineStages.map((stage) => (
            <Card key={stage.step} className="p-6 border-hairline">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4 ">
                  <span className="font-mono text-sm font-bold px-2.5 py-1 rounded bg-muted text-primary border border-border">
                    {stage.step}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">{stage.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                      {stage.description}
                    </p>
                  </div>
                </div>

                <div className="text-end font-mono text-sm text-muted-foreground/80 bg-muted/40 px-3 py-1.5 rounded border border-border/60 flex-shrink-0">
                  {stage.controls}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Evidence Ledger Explainer */}
        <section className="space-y-6 p-8 rounded-xl border border-border bg-card">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">The Three States of the Evidence Ledger</h2>
            <p className="text-sm text-muted-foreground">
              We never guess. The clean-room methodology mathematically categorizes extracted target evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-sm">
            <div className="p-4 rounded-lg border border-success/30 bg-success/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-success">Seen</span>
                <Badge variant="success">Verified</Badge>
              </div>
              <p className="text-muted-foreground text-sm font-sans">
                Components, DOM routes, or symbols directly observed and extracted from the target client files.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-info/30 bg-info/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-info">Inferred</span>
                <Badge variant="info">Deduction</Badge>
              </div>
              <p className="text-muted-foreground text-sm font-sans">
                Strongly implied contracts, such as token headers confirming OAuth2 or schemas implied by API payloads.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-warning/30 bg-warning/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-warning">Unknown</span>
                <Badge variant="warning">Reconstruction</Badge>
              </div>
              <p className="text-muted-foreground text-sm font-sans">
                Server-side proprietary implementations requiring clean-room functional synthesis from specification.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="p-8 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm">Ready to analyze a target?</h3>
            <p className="text-sm text-muted-foreground">Enter a live URL or upload a binary for instant pre-payment triage.</p>
          </div>
          <Link href="/#triage-console">
            <Button size="sm" className="font-mono">
              <span>Start Analysis</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5 " />
            </Button>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

