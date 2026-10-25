import { BRAND } from "@/config/brand";
import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Scale, ShieldCheck, CheckCircle2, Layers } from "lucide-react";

export const metadata = {
  title: `Clean-Room Reverse Engineering & IP Policy | ${BRAND.name}`,
  description: "Legal whitepaper and architectural doctrine explaining clean-room isolation, fair use, and copyright compliance.",
};

export default function CleanRoomIpPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main id="main-content" className="flex-1 py-16 px-6 max-w-4xl mx-auto w-full">
        <div className="space-y-4 mb-10 border-b border-border pb-6">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">LEGAL WHITEPAPER & DOCTRINE
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">
            Clean-Room Reverse Engineering Policy
          </h1>
          <div className="text-sm text-muted-foreground font-mono">
            Published: October 2026 | {BRAND.name} Legal & Architectural Compliance Group
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-base font-serif font-bold text-foreground">1. Executive Summary & Legal Precedents</h2>
            <p>
              Clean-room software engineering (also known as the &quot;Chinese wall technique&quot;) is a rigorous engineering methodology specifically designed to prevent copyright infringement. Under established United States and international intellectual property law, computer software enjoys copyright protection solely over its <em>creative expression</em>, not its underlying <em>functional ideas, systems, or interface specifications</em> (17 U.S.C. § 102(b)).
            </p>
            <p>
              The legality of reverse engineering for interoperability and independent functional implementation has been repeatedly affirmed by federal courts and international statutes:
            </p>
            <ul className="list-disc ps-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Sega Enterprises Ltd. v. Accolade, Inc. (977 F.2d 1510):</strong> The 9th Circuit held that disassembly of object code constitutes fair use as a matter of law when necessary to gain access to unprotected functional elements.
              </li>
              <li>
                <strong className="text-foreground">Sony Computer Entertainment, Inc. v. Connectix Corp. (203 F.3d 596):</strong> Reaffirmed that intermediate copying performed during the reverse engineering of firmware for an emulator is protected fair use.
              </li>
              <li>
                <strong className="text-foreground">Google LLC v. Oracle America, Inc. (141 S. Ct. 1183):</strong> The U.S. Supreme Court held that reimplementing API declaring code and software interface hierarchies is a transformative fair use.
              </li>
              <li>
                <strong className="text-foreground">International Interoperability Doctrines:</strong> Recognizes technical interface analysis and clean-room implementation when performed to achieve software interoperability.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-bold text-foreground">2. {BRAND.name} Dual-Room Automated Isolation Architecture</h2>
            <p>
              {BRAND.name} codifies the classic clean-room protocol into an automated, provably decoupled two-stage pipeline:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="w-fit text-sm font-mono border-amber-500/50 text-amber-500">
                    ROOM 1: DIRTY ROOM (ANALYSIS)
                  </Badge>
                  <CardTitle className="text-sm font-mono font-bold text-foreground mt-1">
                    Static Triage & Spec Extraction
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1.5 text-muted-foreground">
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">-</span><span>Runs inside an isolated sandbox container with network isolation.</span></p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">-</span><span>Analyzes binary headers, symbols, manifest files, and client-side web DOM structures.</span></p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">-</span><span>Emits <em>only</em> high-level functional interface contracts, route structures, and data schemas.</span></p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">-</span><span><strong>Strict Rule:</strong> No proprietary decompiler code or binary strings are allowed to pass through the boundary.</span></p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="w-fit text-sm font-mono border-primary/50 text-primary">
                    ROOM 2: CLEAN ROOM (SYNTHESIS)
                  </Badge>
                  <CardTitle className="text-sm font-mono font-bold text-foreground mt-1">
                    Clean-Room Source Generation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1.5 text-muted-foreground">
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">-</span><span>Operates with zero access to the original uploaded binary or decompiled byte sequences.</span></p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">-</span><span>Receives solely the abstract Evidence Ledger and typed Zod specifications.</span></p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">-</span><span>Synthesizes original Next.js 15, React 19, and TypeScript source files from scratch.</span></p>
                  <p className="flex items-start gap-2"><span className="text-primary font-bold">-</span><span>Verifies clean-room source with automated compile and test suites.</span></p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-bold text-foreground">3. Independent Clean-Room Synthesis</h2>
            <p>
              Because the Room 2 synthesis worker has zero access to the original source code or decompiled bytecode, the generated code constitutes an independent creation under 17 U.S.C. § 101. The resulting codebase is synthesized solely from abstract functional specifications, conferring clean title of intellectual property to the client.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

