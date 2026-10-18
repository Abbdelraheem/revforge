"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Database,
  Activity,
  Server,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Lock,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LangThemeToggle } from "@/components/shared/lang-theme-toggle";

interface FleetJob {
  id: string;
  targetType: string;
  source: string;
  status: "running" | "completed" | "failed" | "quarantined";
  progress: number;
  runtimeSec: number;
  memoryMb: number;
  cogsUsd: number;
  priceUsd: number;
  sandboxId: string;
}

const INITIAL_JOBS: FleetJob[] = [
  {
    id: "proj-9012a-4f81",
    targetType: "web_app",
    source: "https://clipzila.com",
    status: "running",
    progress: 68,
    runtimeSec: 142,
    memoryMb: 412,
    cogsUsd: 4.85,
    priceUsd: 49.0,
    sandboxId: "gvisor-worker-04",
  },
  {
    id: "proj-8841b-12c9",
    targetType: "mobile_app",
    source: "target-v2.1.apk (Upload)",
    status: "completed",
    progress: 100,
    runtimeSec: 284,
    memoryMb: 820,
    cogsUsd: 9.40,
    priceUsd: 99.0,
    sandboxId: "gvisor-worker-02",
  },
  {
    id: "proj-7719c-99f2",
    targetType: "enterprise_saas",
    source: "https://github.com/enterprise/crm",
    status: "completed",
    progress: 100,
    runtimeSec: 410,
    memoryMb: 1150,
    cogsUsd: 22.10,
    priceUsd: 249.0,
    sandboxId: "gvisor-worker-01",
  },
  {
    id: "proj-6102d-33a8",
    targetType: "desktop_binary",
    source: "malicious-sample.exe",
    status: "quarantined",
    progress: 12,
    runtimeSec: 8,
    memoryMb: 95,
    cogsUsd: 0.15,
    priceUsd: 0.0,
    sandboxId: "gvisor-worker-08",
  },
];

const SECURITY_AUDIT_LOGS = [
  {
    time: "07:28:14",
    type: "SSRF_BLOCKED",
    target: "http://169.254.169.254/latest/meta-data/",
    severity: "CRITICAL",
    action: "BLOCKED_PRE_DNS",
  },
  {
    time: "07:22:40",
    type: "PADDLE_WEBHOOK_VERIFIED",
    target: "txn_01j7b9m8q2k3",
    severity: "INFO",
    action: "HMAC_SHA256_VALIDATED",
  },
  {
    time: "07:15:02",
    type: "PROMPT_INJECTION_STRIPPED",
    target: "untrusted_binary_strings",
    severity: "WARNING",
    action: "XML_DELIMITERS_ENFORCED",
  },
  {
    time: "07:02:19",
    type: "MAGIC_BYTE_MISMATCH",
    target: "exploit.pdf (Renamed .apk)",
    severity: "HIGH",
    action: "REJECTED_400",
  },
];

export default function AdminConsolePage() {
  const [jobs, setJobs] = useState<FleetJob[]>(INITIAL_JOBS);
  const [activeTab, setActiveTab] = useState<"fleet" | "security" | "economics">("fleet");

  const handleKillSandbox = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, status: "quarantined", progress: 0 } : job
      )
    );
  };

  const totalCogs = jobs.reduce((acc, j) => acc + j.cogsUsd, 0);
  const totalRevenue = jobs.reduce((acc, j) => acc + (j.status === "completed" ? j.priceUsd : 0), 0);
  const aggregateMargin = totalRevenue > 0 ? (((totalRevenue - totalCogs) / totalRevenue) * 100).toFixed(1) : "90.0";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-mono">
      {/* Top Console Navigation */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="h-7 w-7 rounded border border-primary/40 bg-primary/10 flex items-center justify-center text-primary">
              <Terminal className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-foreground">
              RevForge<span className="text-primary">.ai</span>
            </span>
          </Link>
          <span className="text-muted-foreground text-xs">•</span>
          <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
            OPERATIONS FLEET CONSOLE
          </Badge>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            User Studio
          </Link>
          <LangThemeToggle />
        </div>
      </header>

      {/* Main Console Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Active Sandboxes</span>
                <Cpu className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold font-mono text-foreground">
                3 / 16 Nodes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground">
              gVisor runsc runtime • 18.7% CPU quota
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Blended Gross Margin</span>
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold font-mono text-primary">
                {aggregateMargin}%
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground">
              Target: 90.0% (Integer-Cent Engine)
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Total Technical COGS</span>
                <DollarSign className="h-3.5 w-3.5 text-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold font-mono text-foreground">
                ${totalCogs.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground">
              Groq + R2 + gVisor container compute
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
                <span>Avg Turnaround Time</span>
                <Clock className="h-3.5 w-3.5 text-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold font-mono text-foreground">
                4.2 min
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground">
              Across all complexity tiers
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border space-x-4 rtl:space-x-reverse text-xs font-semibold">
          <button
            onClick={() => setActiveTab("fleet")}
            className={`pb-2.5 transition border-b-2 -mb-px ${
              activeTab === "fleet"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Live Sandbox Fleet ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-2.5 transition border-b-2 -mb-px ${
              activeTab === "security"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Zero-Trust Security Log ({SECURITY_AUDIT_LOGS.length})
          </button>
        </div>

        {/* Fleet Table */}
        {activeTab === "fleet" && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 rtl:space-x-reverse">
                <Server className="h-4 w-4 text-primary" />
                <span>Isolated Container Jobs</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Ephemeral gVisor containers executing headless Ghidra, JADX, and clean-room synthesis workers.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="ltr">
                <table className="w-full text-xs text-left divide-y divide-border font-mono">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Project / Target</th>
                      <th className="p-3">Sandbox Node</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Progress</th>
                      <th className="p-3">COGS / Price</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-bold text-foreground">{job.id}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">{job.source}</div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <div>{job.sandboxId}</div>
                          <div className="text-[10px]">{job.memoryMb} MB • {job.runtimeSec}s</div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              job.status === "running"
                                ? "border-primary text-primary"
                                : job.status === "completed"
                                ? "border-emerald-500 text-emerald-500"
                                : "border-destructive text-destructive"
                            }`}
                          >
                            {job.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="w-24 bg-muted h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{job.progress}%</div>
                        </td>
                        <td className="p-3">
                          <div className="text-foreground">${job.priceUsd.toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">COGS: ${job.cogsUsd.toFixed(2)}</div>
                        </td>
                        <td className="p-3 text-right">
                          {job.status === "running" ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleKillSandbox(job.id)}
                              className="h-7 text-[10px] font-mono px-2"
                            >
                              <Square className="h-3 w-3 me-1" />
                              <span>SIGKILL</span>
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Audit Table */}
        {activeTab === "security" && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 rtl:space-x-reverse">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <span>Zero-Trust Security Event Log</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time intrusion prevention telemetry, SSRF pre-DNS blocks, and prompt injection isolations.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="ltr">
                <table className="w-full text-xs text-left divide-y divide-border font-mono">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Event Classification</th>
                      <th className="p-3">Target Payload / Artifact</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3 text-right">Enforcement Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {SECURITY_AUDIT_LOGS.map((evt, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">{evt.time}</td>
                        <td className="p-3 font-bold text-foreground">{evt.type}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-sm">{evt.target}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              evt.severity === "CRITICAL"
                                ? "border-destructive text-destructive"
                                : evt.severity === "HIGH"
                                ? "border-amber-500 text-amber-500"
                                : "border-primary text-primary"
                            }`}
                          >
                            {evt.severity}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-[11px] font-bold text-primary">{evt.action}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
