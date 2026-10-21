"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeViewer } from "@/components/shared/code-viewer";
import { FileTreeViewer, TreeNode } from "@/components/shared/file-tree-viewer";
import { DiffViewer } from "@/components/shared/diff-viewer";
import { Stepper } from "@/components/shared/stepper";
import { Dropzone } from "@/components/shared/dropzone";
import { EmptyState } from "@/components/shared/empty-state";
import { ArrowLeft, ArrowRight, ShieldCheck, Cpu, Terminal } from "lucide-react";
import Link from "next/link";

const sampleFileTree: TreeNode[] = [
  {
    name: "src",
    path: "src",
    type: "directory",
    children: [
      {
        name: "app",
        path: "src/app",
        type: "directory",
        children: [
          { name: "page.tsx", path: "src/app/page.tsx", type: "file", sizeBytes: 8192 },
          { name: "layout.tsx", path: "src/app/layout.tsx", type: "file", sizeBytes: 1024 },
        ],
      },
      {
        name: "lib",
        path: "src/lib",
        type: "directory",
        children: [
          { name: "security.ts", path: "src/lib/security.ts", type: "file", sizeBytes: 4096 },
          { name: "pricing.ts", path: "src/lib/pricing.ts", type: "file", sizeBytes: 3072 },
        ],
      },
    ],
  },
  { name: "package.json", path: "package.json", type: "file", sizeBytes: 1536 },
  { name: "README.md", path: "README.md", type: "file", sizeBytes: 2048 },
];

const sampleDiff = [
  { type: "normal" as const, content: "export function authenticateUser(token: string) {", oldLineNumber: 1, newLineNumber: 1 },
  { type: "delete" as const, content: "  // Legacy unsafe validation", oldLineNumber: 2 },
  { type: "add" as const, content: "  const verified = verifyZeroTrustToken(token);", newLineNumber: 2 },
  { type: "add" as const, content: "  if (!verified) throw new SecurityError('Invalid token');", newLineNumber: 3 },
  { type: "normal" as const, content: "  return verified.session;", oldLineNumber: 3, newLineNumber: 4 },
];

export default function DesignSystemPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<string>("src/app/page.tsx");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top Bar */}
      <header className="border-b border-border bg-card sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 ">
          <Link
            href="/"
            className="flex items-center text-sm font-mono text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="me-1 h-3.5 w-3.5" />
            <span>Back to Product</span>
          </Link>
          <span className="text-border">|</span>
          <span className="font-mono text-sm font-semibold">Living Design System & Token Catalog</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 space-y-12">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">1. Color Tokens (Restrained Technical Editorial)</h2>
            <p className="text-sm text-muted-foreground">
              Deep Forest Emerald accent with an 11-step slate scale. Zero neon purples or artificial highlights.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
              <div className="h-10 w-full rounded bg-primary" />
              <div className="font-mono text-sm font-semibold">Primary Accent</div>
              <div className="font-mono text-sm text-muted-foreground">Deep Emerald</div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
              <div className="h-10 w-full rounded bg-secondary" />
              <div className="font-mono text-sm font-semibold">Secondary</div>
              <div className="font-mono text-sm text-muted-foreground">Slate Surface</div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
              <div className="h-10 w-full rounded bg-success" />
              <div className="font-mono text-sm font-semibold">Success</div>
              <div className="font-mono text-sm text-muted-foreground">Verified Gate</div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
              <div className="h-10 w-full rounded bg-warning" />
              <div className="font-mono text-sm font-semibold">Warning</div>
              <div className="font-mono text-sm text-muted-foreground">Triage Flag</div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
              <div className="h-10 w-full rounded bg-destructive" />
              <div className="font-mono text-sm font-semibold">Destructive</div>
              <div className="font-mono text-sm text-muted-foreground">SSRF Block</div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
              <div className="h-10 w-full rounded bg-info" />
              <div className="font-mono text-sm font-semibold">Info</div>
              <div className="font-mono text-sm text-muted-foreground">Inspection Data</div>
            </div>
          </div>
        </section>

        {/* Section 2: Buttons & States */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">2. Button Variants & States</h2>
            <p className="text-sm text-muted-foreground">
              Hairline 1px border precision, WCAG AA contrast, clean focus rings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default">Primary Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost Action</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled State</Button>
            <Button isLoading>Processing...</Button>
          </div>
        </section>

        {/* Section 3: Badges */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">3. Badges & Semantic Statuses</h2>
            <p className="text-sm text-muted-foreground">
              Technical indicator tags with monospace metadata.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">Clean-Room Synthesized</Badge>
            <Badge variant="success">gVisor Isolated</Badge>
            <Badge variant="warning">Reconstruction Obligation</Badge>
            <Badge variant="destructive">SSRF Denied</Badge>
            <Badge variant="info">Evidence Seen</Badge>
            <Badge variant="secondary">TypeScript 5.7</Badge>
            <Badge variant="outline">Paddle Verified</Badge>
          </div>
        </section>

        {/* Section 4: Stepper Component */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">4. Stepper & Milestone Tracker</h2>
            <p className="text-sm text-muted-foreground">
              Interactive execution stepper with active and completed states.
            </p>
          </div>

          <Card className="p-6">
            <Stepper
              currentStep={currentStep}
              onStepClick={(idx) => setCurrentStep(idx)}
              steps={[
                { id: 1, title: "Target Triage" },
                { id: 2, title: "Evidence Ledger" },
                { id: 3, title: "Clean Synthesis" },
                { id: 4, title: "Security Tests" },
                { id: 5, title: "Repo Packaging" },
              ]}
            />
          </Card>
        </section>

        {/* Section 5: Code Viewer & Strict LTR Island */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">5. Code Viewer (Strict LTR Island)</h2>
            <p className="text-sm text-muted-foreground">
              Monospace code display with line numbers and copy action. Code content remains LTR inside RTL pages.
            </p>
          </div>

          <CodeViewer
            filename="runner.ts"
            language="typescript"
            code={`// Zero-Shell Execution via execFile
export async function runIsolatedContainer(image: string, args: string[]) {
  return execFile("docker", [
    "run",
    "--runtime=runsc",
    "--cap-drop=ALL",
    "--user=10001:10001",
    "--read-only",
    "--network=none",
    image,
    ...args,
  ]);
}`}
          />
        </section>

        {/* Section 6: File Tree & Diff Viewers */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">6. Repository File Tree & Diff Viewers</h2>
            <p className="text-sm text-muted-foreground">
              Used in the clean-room post-payment delivery inspector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-mono text-muted-foreground mb-2 block">
                File Tree Browser:
              </span>
              <FileTreeViewer
                tree={sampleFileTree}
                selectedPath={selectedFile}
                onSelectFile={(node) => setSelectedFile(node.path)}
              />
            </div>

            <div>
              <span className="text-sm font-mono text-muted-foreground mb-2 block">
                Unified Diff Inspector:
              </span>
              <DiffViewer filename="auth-service.ts" diffLines={sampleDiff} />
            </div>
          </div>
        </section>

        {/* Section 7: Dropzone & Empty State */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">7. Dropzone & Empty State Components</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dropzone onFileSelect={(f) => { void f; }} />
            <EmptyState
              title="No Reconstructed Projects"
              description="You have not initiated any clean-room reverse-engineering builds yet."
              actionLabel="Start New Analysis"
              onAction={() => {}}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
