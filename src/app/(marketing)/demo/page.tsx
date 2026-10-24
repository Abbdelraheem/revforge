import React from "react";
import Link from "next/link";
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
  ExternalLink,
  Cpu,
  Layers,
  FileCode,
  Eye,
  Check,
} from "lucide-react";

export const metadata = {
  title: `Live Benchmark Demo — Nova SaaS Landing Rebuild | ${BRAND.name}`,
  description:
    "Interactive read-only showcase of an end-to-end clean-room rebuild from reference Target 01 (Nova SaaS Landing Page) with measured parity.",
};

export default function DemoShowcasePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main className="flex-1 py-12 px-6 max-w-7xl mx-auto w-full space-y-10">
        {/* Banner */}
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-foreground">Interactive Demo Project:</span>{" "}
              <span className="text-muted-foreground">
                This read-only showcase demonstrates an automated clean-room rebuild of Benchmark Target 01. No synthetic data.
              </span>
            </div>
          </div>
          <Link href="/projects/new" className="shrink-0">
            <Button size="sm" className="font-semibold text-sm">
              <span>Rebuild Your Target</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-3 border-b border-border pb-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-sm text-primary border-primary/40">
              TARGET-01 &bull; LANDING TIER
            </Badge>
            <Badge variant="default" className="text-sm font-mono">
              Status: Delivered
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Nova SaaS Landing Page
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Reconstructed from observable DOM and style traces without access to source code. Evaluated in an isolated sandbox runner with pixelmatch visual difference evaluation and automated test validation.
          </p>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-border bg-card shadow-sm p-4 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Composite Parity</div>
            <div className="text-2xl font-bold font-mono text-success">100.0%</div>
            <div className="text-sm text-muted-foreground">Threshold: ≥ 85%</div>
          </Card>

          <Card className="border-border bg-card shadow-sm p-4 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Coverage</div>
            <div className="text-2xl font-bold font-mono text-foreground">100.0%</div>
            <div className="text-sm text-muted-foreground">Measured scope</div>
          </Card>

          <Card className="border-border bg-card shadow-sm p-4 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Visual Match</div>
            <div className="text-2xl font-bold font-mono text-foreground">1.00 / 1.0</div>
            <div className="text-sm text-muted-foreground">Pixelmatch 1280px</div>
          </Card>

          <Card className="border-border bg-card shadow-sm p-4 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Clean Compile</div>
            <div className="text-2xl font-bold font-mono text-foreground">PASS</div>
            <div className="text-sm text-muted-foreground">Zero warnings</div>
          </Card>

          <Card className="border-border bg-card shadow-sm p-4 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Max Leakage</div>
            <div className="text-2xl font-bold font-mono text-foreground">2.9%</div>
            <div className="text-sm text-muted-foreground">Ceiling: &lt; 25.0%</div>
          </Card>

          <Card className="border-border bg-card shadow-sm p-4 space-y-1">
            <div className="text-sm text-muted-foreground font-mono">Engineering Scope</div>
            <div className="text-2xl font-bold font-mono text-primary">2.5 hrs</div>
            <div className="text-sm text-muted-foreground">Formula: $75.00</div>
          </Card>
        </div>

        {/* Live Preview & Report Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Live Preview Iframe (2 cols) */}
          <Card className="border-border bg-card shadow-sm lg:col-span-2 overflow-hidden">
            <CardHeader className="border-b border-border pb-3 bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-serif">
                  Live Sandboxed Preview
                </CardTitle>
              </div>
              <a
                href="/api/demo/preview"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 font-mono"
              >
                <span>Open in Tab</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </CardHeader>
            <div className="h-[550px] w-full bg-background border-b border-border">
              <iframe
                src="/api/demo/preview"
                title="Nova SaaS Landing Page Demo Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <div className="p-4 bg-muted/10 text-sm text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span>Target URL: <code>/</code> &bull; Responsive 1280px &amp; 375px viewports verified</span>
              <span className="font-mono text-success flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Sandboxed Execution
              </span>
            </div>
          </Card>

          {/* Analysis & Obligations Breakdown */}
          <div className="space-y-6 lg:col-span-1">
            {/* Detected Features */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Synthesized Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2.5 text-sm">
                  {[
                    "Hero section with conversion CTA",
                    "Feature highlights grid",
                    "Responsive pricing tier cards",
                    "Accessible FAQ accordion",
                    "Footer navigation & legal links",
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Clean-Room Obligations */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  <span>Verification Obligations</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm font-mono">
                <div className="flex items-center justify-between p-2 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">build_clean_compile</span>
                  <Badge variant="default" className="text-sm">Verified</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">visual_parity_desktop</span>
                  <Badge variant="default" className="text-sm">Verified</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">structural_routes</span>
                  <Badge variant="default" className="text-sm">Verified</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">leakage_similarity_safe</span>
                  <Badge variant="default" className="text-sm">Verified</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Action CTA */}
            <Card className="border-primary/40 bg-card shadow-sm p-6 space-y-4 text-center">
              <h3 className="font-serif font-bold text-lg text-foreground">
                Ready to rebuild your application?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Submit any public URL, HAR capture, or binary. First architectural analysis is complimentary.
              </p>
              <Link href="/projects/new" className="block w-full">
                <Button className="w-full text-sm font-bold shadow-sm">
                  <span>Start Free Analysis</span>
                  <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
