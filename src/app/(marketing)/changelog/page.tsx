import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Terminal, Shield, GitCommit, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Engineering Changelog — RevForge AI",
  description: "Chronological release notes, architecture improvements, security hardening passes, and sandbox runtime updates.",
};

const releases = [
  {
    version: "v2.4.0",
    date: "October 2026",
    tag: "Latest Release",
    headline: "Paddle v2 Billing Transition, 90% Unit Pricing Engine & Next.js 15 App Router",
    changes: [
      {
        category: "Billing & Economics",
        items: [
          "Complete architectural migration to Paddle Billing v2 with cryptographic HMAC-SHA256 signature verification (Paddle-Signature header with timestamp replay prevention).",
          "Implemented integer-cent arithmetic engine with 90% gross profit margin multiplier and psychological rounding ($29, $49, $99, $149, $249, $499).",
        ],
      },
      {
        category: "Security & Sandboxing",
        items: [
          "Delimited XML prompt injection boundaries (<untrusted_artifact_evidence>) ensuring untrusted disassembly outputs cannot hijack the LLM clean-room synthesis worker.",
          "Hardened synchronous SSRF DNS resolution blocking private, loopback, and cloud metadata address ranges.",
        ],
      },
      {
        category: "UI & Internationalization",
        items: [
          "Refactored design system to restrained Technical Editorial aesthetic with Deep Forest Emerald accent and zero neon AI gimmicks.",
          "Full bidirectional Arabic (RTL) and English (LTR) interface parity with isolated LTR code blocks.",
        ],
      },
    ],
  },
  {
    version: "v2.3.0",
    date: "August 2026",
    tag: "Security Milestone",
    headline: "gVisor MicroVM Sandboxing & Air-Gapped Network Isolation",
    changes: [
      {
        category: "Sandbox Isolation",
        items: [
          "Transitioned backend disassembly containers to gVisor (runsc) virtualization with read-only root filesystems and non-root UID execution.",
          "Enforced --network=none flag for all binary unpacking passes (.apk, ELF, PE, Mach-O, ASAR) to guarantee zero outbound network leaks.",
        ],
      },
    ],
  },
  {
    version: "v2.2.0",
    date: "June 2026",
    tag: "Developer Experience",
    headline: "MOCK_SANDBOX Local Developer Mode & Deterministic Telemetry",
    changes: [
      {
        category: "Development Tooling",
        items: [
          "Introduced MOCK_SANDBOX=true environment mode enabling 100% full-stack development, demoing, and verification without local Ghidra or JADX installations.",
          "Added Server-Sent Events (SSE) telemetry streamer with resumable Last-Event-ID reconnection handling.",
        ],
      },
    ],
  },
  {
    version: "v2.0.0",
    date: "March 2026",
    tag: "Major Milestone",
    headline: "Autonomous Clean-Room Reverse Engineering Engine Launch",
    changes: [
      {
        category: "Core Engine",
        items: [
          "Inaugural release of the Evidence Ledger classification pipeline (Seen, Inferred, Unknown).",
          "Automated headless Ghidra decompiler bridge, JADX APK unpacker, and Playwright DOM extraction workers.",
          "End-to-end verification testing harness generating production-ready Next.js repositories.",
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="space-y-4 mb-12 border-b border-border pb-8">
          <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs">
            VERSION HISTORY & RELEASES
          </Badge>
          <h1 className="text-3xl md:text-5xl font-mono font-bold tracking-tight">
            Engineering Changelog
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
            Transparent release notes tracking sandbox upgrades, security patches, pricing engine calibrations, and architectural milestones.
          </p>
        </div>

        {/* Release Timeline */}
        <div className="space-y-12 relative before:absolute before:inset-0 before:start-4 before:w-0.5 before:bg-border">
          {releases.map((rel, idx) => (
            <div key={idx} className="relative ps-10 space-y-4">
              {/* Timeline marker */}
              <div className="absolute start-2.5 top-1.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-primary bg-background" />

              <div className="flex flex-wrap items-center gap-2 font-mono">
                <span className="text-lg font-bold text-foreground">{rel.version}</span>
                <span className="text-xs text-muted-foreground">• {rel.date}</span>
                <Badge
                  variant={idx === 0 ? "default" : "outline"}
                  className="font-mono text-[10px]"
                >
                  {rel.tag}
                </Badge>
              </div>

              <h2 className="text-base font-semibold text-foreground">
                {rel.headline}
              </h2>

              <Card className="border-border bg-card/60">
                <CardContent className="p-5 space-y-4">
                  {rel.changes.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2">
                      <div className="font-mono text-xs font-semibold text-primary">
                        {group.category}
                      </div>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        {group.items.map((item, iIdx) => (
                          <li key={iIdx} className="flex items-start space-x-2 rtl:space-x-reverse">
                            <span className="text-primary font-mono text-xs mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
