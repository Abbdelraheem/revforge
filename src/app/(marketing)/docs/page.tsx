import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Terminal, Shield, Cpu, Database, Code2, BookOpen, Layers, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Documentation & Architecture Reference — RevForge",
  description: "Comprehensive technical manual, system architecture, API specifications, and clean-room synthesis protocols.",
};

const docSections = [
  {
    id: "architecture",
    title: "1. Zero-Trust System Architecture",
    description: "RevForge implements a clean-room architectural synthesis engine decoupled from untrusted client binaries and web sources.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          The platform operates on a strict zero-trust boundary. Ingested artifacts (URLs, APKs, native binaries, ASAR packages, and HAR archives) are treated as hostile inputs.
          All execution passes occur inside ephemeral gVisor (<code className="text-foreground font-mono">runsc</code>) sandboxes with read-only root filesystems, dropped capabilities, and non-root UID execution.
        </p>
        <div className="p-4 rounded border border-border bg-card font-mono text-xs overflow-x-auto" dir="ltr">
          <div className="text-muted-foreground">// Architectural Dataflow Pipeline</div>
          <div className="text-foreground mt-1">
            Target Ingestion → Magic-Byte Triage → Evidence Ledger (Seen/Inferred/Unknown) → Dynamic Pricing Engine → Paddle Webhook Unlock → Sandbox Ghidra/JADX Worker → Clean-Room Synthesis → Verified ZIP Export
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "evidence-ledger",
    title: "2. The Evidence Ledger Specification",
    description: "Classification taxonomy ensuring legal copyright compliance through clean-room isolation.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          To ensure pure clean-room re-implementation without copyright infringement of proprietary source code, the engine structures all extracted metadata into three strict tiers:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded border border-border bg-card">
            <Badge variant="outline" className="border-primary/50 text-primary font-mono text-[11px] mb-2">Seen (Empirical)</Badge>
            <p className="text-xs text-muted-foreground leading-normal">
              Directly extracted client-side assets, DOM structures, public CSS variables, exported API schema contracts, and unpacked manifest files.
            </p>
          </div>
          <div className="p-3.5 rounded border border-border bg-card">
            <Badge variant="outline" className="border-amber-500/50 text-amber-500 font-mono text-[11px] mb-2">Inferred (Data Flow)</Badge>
            <p className="text-xs text-muted-foreground leading-normal">
              High-confidence behavioral patterns deduced from client network calls, state mutations, and query parameter structures.
            </p>
          </div>
          <div className="p-3.5 rounded border border-border bg-card">
            <Badge variant="outline" className="border-muted-foreground text-foreground font-mono text-[11px] mb-2">Unknown / Server-Side</Badge>
            <p className="text-xs text-muted-foreground leading-normal">
              Proprietary backend business logic and databases that are synthesized from functional contract specifications rather than decompiled code.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "pricing-engine",
    title: "3. Dynamic Pricing & Unit Economics Engine",
    description: "Integer-cent pricing calculation with a 90% gross profit margin and clean psychological rounding.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          RevForge eliminates arbitrary subscription lock-in by computing project-specific dynamic quotes based on real-world compute and model token consumption:
        </p>
        <div className="p-4 rounded border border-border bg-card font-mono text-xs overflow-x-auto space-y-1" dir="ltr">
          <div className="text-muted-foreground">// Pricing Formula</div>
          <div className="text-foreground">Technical_COGS = Container_Compute_Cost + LLM_Token_Cost + Storage_Egress_Cost</div>
          <div className="text-foreground">Target_Price = Technical_COGS / (1 - 0.90)  <span className="text-primary">// 90% Target Margin (10x Multiplier)</span></div>
          <div className="text-foreground">Final_Quote = roundToCleanPrice(Target_Price) <span className="text-primary">// $29, $49, $99, $149, $249, $499...</span></div>
        </div>
        <p className="text-xs">
          Small portfolio sites quote affordably at $29 or $49, while multi-tenant SaaS platforms scale proportionally at $249 or $499, delivering roughly 50% of the cost of a traditional human agency quote.
        </p>
      </div>
    ),
  },
  {
    id: "api-reference",
    title: "4. REST API & Stream Endpoints",
    description: "Server-side contracts for triage initiation, webhook processing, and real-time SSE telemetry.",
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <div className="space-y-3 font-mono text-xs" dir="ltr">
          <div className="p-3 rounded border border-border bg-card">
            <div className="flex items-center space-x-2 text-foreground font-bold">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">POST</span>
              <span>/api/triage</span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] font-sans">
              Safely ingests target URL or binary Base64, verifies magic bytes, and returns structured TechReportData.
            </p>
          </div>

          <div className="p-3 rounded border border-border bg-card">
            <div className="flex items-center space-x-2 text-foreground font-bold">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">POST</span>
              <span>/api/checkout</span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] font-sans">
              Generates a verified Paddle v2 custom-priced checkout link for the given project ID and verified quote.
            </p>
          </div>

          <div className="p-3 rounded border border-border bg-card">
            <div className="flex items-center space-x-2 text-foreground font-bold">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">POST</span>
              <span>/api/webhook/paddle</span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] font-sans">
              Cryptographically verifies HMAC-SHA256 signature from Paddle, confirms transaction, and enqueues BullMQ synthesis worker.
            </p>
          </div>

          <div className="p-3 rounded border border-border bg-card">
            <div className="flex items-center space-x-2 text-foreground font-bold">
              <span className="px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">GET</span>
              <span>/api/stream/:projectId</span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] font-sans">
              Server-Sent Events (SSE) channel streaming live stage updates, telemetry logs, test results, and final download tokens.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "security-model",
    title: "5. Security Controls & Sandboxing",
    description: "Hardened defense-in-depth preventing SSRF, remote command execution, and prompt injection.",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc ps-5 space-y-1.5 text-xs">
          <li>
            <strong className="text-foreground">SSRF Guard:</strong> Synchronous DNS resolution checking against private, multicast, loopback, link-local, and AWS/GCP metadata IP blocks (<code className="font-mono">169.254.169.254</code>, <code className="font-mono">10.0.0.0/8</code>, <code className="font-mono">127.0.0.0/8</code>, etc.).
          </li>
          <li>
            <strong className="text-foreground">Zero-Shell Execution:</strong> Subprocesses are spawned using strict <code className="font-mono">child_process.execFile</code> with <code className="font-mono">shell: false</code>, nullifying parameter-based shell command injection.
          </li>
          <li>
            <strong className="text-foreground">Prompt Delimiters:</strong> Untrusted decompiled code is encapsulated within XML boundaries (<code className="font-mono">&lt;untrusted_artifact_evidence&gt;</code>) with adversarial instruction scrubbing.
          </li>
          <li>
            <strong className="text-foreground">Isolated Sandbox:</strong> Docker containers run with gVisor (<code className="font-mono">runsc</code>), non-root execution, <code className="font-mono">--network=none</code> for static binary disassembly, and strict CPU/RAM quotas.
          </li>
        </ul>
      </div>
    ),
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="space-y-4 mb-12 border-b border-border pb-8">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs">
              ENGINEERING MANUAL 
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">Last updated: Q4 2026</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-mono font-bold tracking-tight">
            System Documentation & Protocols
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-3xl leading-relaxed">
            In-depth architectural specifications, clean-room legal isolation mechanisms, REST API contracts, and cryptographic verification standards.
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Nav */}
          <aside className="lg:col-span-1 space-y-2 font-mono text-xs">
            <div className="text-muted-foreground uppercase text-[10px] tracking-wider font-semibold mb-3">
              Table of Contents
            </div>
            {docSections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="block p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition truncate"
              >
                {sec.title}
              </a>
            ))}
          </aside>

          {/* Main Sections */}
          <div className="lg:col-span-3 space-y-12">
            {docSections.map((sec) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24 space-y-3">
                <h2 className="text-xl font-mono font-bold text-foreground border-b border-border pb-2">
                  {sec.title}
                </h2>
                <p className="text-xs text-muted-foreground font-medium">
                  {sec.description}
                </p>
                <div className="pt-2">{sec.content}</div>
              </section>
            ))}

            {/* Quick Action Card */}
            <Card className="border-primary/30 bg-primary/5 mt-8">
              <CardHeader>
                <CardTitle className="text-sm font-mono flex items-center space-x-2 rtl:space-x-reverse">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span>Ready to run an autonomous triage pass?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Ingest any target URL or binary in the studio to generate an instant Evidence Ledger and dynamic pricing quote.
                </p>
                <Link href="/#triage-console">
                  <button className="px-4 py-2 rounded bg-primary text-primary-foreground text-xs font-mono font-semibold flex items-center space-x-1.5 rtl:space-x-reverse hover:bg-primary/90 transition">
                    <span>Open Studio</span>
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

