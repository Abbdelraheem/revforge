import { BRAND } from "@/config/brand";
﻿import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, Archive, Layers, ShieldCheck, FileCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: `Use Cases | ${BRAND.name} Clean-Room Applications`,
  description: "Enterprise scenarios: legacy software modernization, abandoned repository recovery, and agency technical scoping.",
};

const useCases = [
  {
    icon: RefreshCw,
    title: "Legacy Software Modernization",
    description: "Convert aging PHP, ASP.NET, or jQuery web applications into clean, type-safe Next.js 15 and Tailwind architectures without manual line-by-line rewriting.",
    benefits: ["Zero regression in user flow", "Modern TypeScript contract generation", "Eliminate technical debt in minutes"],
  },
  {
    icon: Archive,
    title: "Lost Source Code Recovery",
    description: "Recover production applications where the original developer or agency vanished and only production bundles (.asar, .apk, minified JS, or native binaries) remain.",
    benefits: ["Decompile directly from production binaries", "Recover complete asset trees and styling tokens", "Restore maintenance autonomy"],
  },
  {
    icon: Layers,
    title: "Agency Technical Scoping & Cost Estimation",
    description: `Software consultancies use ${BRAND.name} to audit prospective client targets, automatically detecting tech stack perimeters and real developer hour benchmarks.`,
    benefits: ["Instant Evidence Ledger generation", "Eliminate speculative quoting errors", "Empirically validated project timelines"],
  },
  {
    icon: FileCheck,
    title: "Clean-Room IP Re-Implementation",
    description: "Re-implement proprietary functionality legally using specification-only clean-room methodology, ensuring zero contaminated code enters the new codebase.",
    benefits: ["Evidence-driven functional separation", "Zero third-party code contamination", "Complete audit trail for IP diligence"],
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <MarketingHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 space-y-16">
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">Enterprise Scenarios</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Built for Engineers Modernizing Complex Software
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Whether migrating legacy monolithic portals or salvaging lost source code from production binaries, {BRAND.name} delivers production-grade clean-room repositories.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {useCases.map((uc, idx) => (
            <Card key={idx} className="p-6 border-hairline flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
                  <uc.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">{uc.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {uc.description}
                </CardDescription>

                <ul className="space-y-1.5 pt-2 border-t border-border/40 text-sm text-muted-foreground font-mono">
                  {uc.benefits.map((b, bIdx) => (
                    <li key={bIdx} className="flex items-center space-x-2 ">
                      <span className="text-primary font-bold">-</span>
                      <span className="font-sans text-foreground/80">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <Link href="/#triage-console">
                  <Button variant="outline" size="sm" className="font-mono text-sm w-full">
                    <span>Try With Your Target</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5 " />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

