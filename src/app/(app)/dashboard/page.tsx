"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Download,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileCode,
  Globe,
  UploadCloud,
  RefreshCw,
  Binary,
  Clock,
  ArrowRight,
  Check,
  ChevronRight,
  User,
  LogOut,
  CreditCard,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/shared/stepper";
import { Dropzone } from "@/components/shared/dropzone";
import { RevForgeLogo } from "@/components/shared/revforge-logo";

interface ReconstructionMilestone {
  stepNumber: number;
  titleAr: string;
  titleEn: string;
  deliverableAr: string;
  deliverableEn: string;
  estimatedMinutes: number;
}

interface TechReportData {
  projectId: string;
  targetType: string;
  targetSource: string;
  evidenceLedger: Array<{
    component: string;
    category: string;
    status: "Seen" | "Inferred" | "UnknownServerSide";
    evidenceOrObligation: string;
  }>;
  detectedTechStack: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    libraries?: string[];
    runtime?: string;
  };
  architectureBoundaries: {
    clientBoundaries: string[];
    apiEndpoints: string[];
    storageInterfaces: string[];
    securityPerimeters: string[];
  };
  quote: {
    projectId: string;
    complexityTier: string;
    cleanPriceLabel: string;
    targetPriceUsd: number;
    milestones: ReconstructionMilestone[];
  };
  executiveSummary: string;
  confidenceScore: number;
}

export default function AppDashboardPage() {
  const router = useRouter();

  // Auth & Session State
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string } | null>(null);

  // Target Ingestion State
  const [targetSource, setTargetSource] = useState<"url" | "file">("url");
  const [targetUrl, setTargetUrl] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [ownershipAttested, setOwnershipAttested] = useState(true);

  // Analysis & Report State
  const [isTriaging, setIsTriaging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<TechReportData | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<"All" | "Seen" | "Inferred" | "UnknownServerSide">("All");

  // Payment & Rebuild State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [logs, setLogs] = useState<Array<{ timestamp: string; step: string; message: string }>>([]);
  const [sandboxProgress, setSandboxProgress] = useState<{
    step: string;
    progress: number;
    status: string;
    details?: string;
    downloadUrl?: string;
  } | null>(null);

  // Load session from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("revforge_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);
        } catch {
          // ignore
        }
      } else {
        const defaultSession = { email: "architect@enterprise.com", name: "Lead Architect" };
        localStorage.setItem("revforge_session", JSON.stringify(defaultSession));
        setCurrentUser(defaultSession);
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("revforge_session");
    }
    router.push("/login");
  };

  // Convert uploaded file to base64
  const handleFileDrop = (files: File[]) => {
    if (files.length > 0 && files[0]) {
      const file = files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        setFileBase64(base64String || "");
      };
      reader.readAsDataURL(file);
    }
  };

  // Run Triage pass
  const handleRunTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownershipAttested) {
      setErrorMessage("You must attest lawful authority or interoperability rights to analyze this target.");
      return;
    }

    setIsTriaging(true);
    setErrorMessage(null);
    setReport(null);
    setIsUnlocked(false);
    setSandboxProgress(null);
    setLogs([]);

    try {
      const payload: any = {
        targetSource,
        userPrompt: userPrompt.trim() || "Full clean-room reverse engineering and technical scoping pass",
      };

      if (targetSource === "url") {
        if (!targetUrl.trim()) throw new Error("Please enter a valid target URL.");
        payload.targetInput = targetUrl.trim();
      } else {
        if (!selectedFile || !fileBase64) {
          throw new Error("Please upload a valid binary file first.");
        }
        payload.fileName = selectedFile.name;
        payload.fileBase64 = fileBase64;
      }

      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Static triage failed.");
      }

      setReport(data);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during triage.");
    } finally {
      setIsTriaging(false);
    }
  };

  // Initiate Paddle Checkout
  const handleCheckout = async () => {
    if (!report) return;
    setIsCheckingOut(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: report.projectId,
          targetType: report.targetType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create Paddle checkout session.");
      }

      // Unlock clean-room rebuild and stream SSE
      setIsUnlocked(true);
      startRebuildStream(report.projectId);
    } catch (err: any) {
      alert(`Payment error: ${err.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // SSE Stream Listener
  const startRebuildStream = (projectId: string) => {
    const eventSource = new EventSource(`/api/stream/${projectId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setSandboxProgress(data);

      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        {
          timestamp,
          step: data.step || "worker",
          message: `${data.status} ${data.details ? `— [${data.details}]` : ""}`,
        },
      ]);

      if (data.progress >= 90) setCurrentStepIndex(4);
      else if (data.progress >= 70) setCurrentStepIndex(3);
      else if (data.progress >= 40) setCurrentStepIndex(2);
      else if (data.progress >= 20) setCurrentStepIndex(1);
      else setCurrentStepIndex(0);

      if (data.step === "completed") {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  const filteredEvidence = report?.evidenceLedger.filter((item) => {
    if (evidenceFilter === "All") return true;
    return item.status === evidenceFilter;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      {/* Studio Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded border border-border bg-muted/40 flex items-center justify-center">
              <RevForgeLogo className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-foreground font-mono">
              RevForge
            </span>
          </Link>
          <span className="text-muted-foreground text-xs">•</span>
          <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Clean-Room Studio</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {currentUser && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md border border-border">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground">{currentUser.email}</span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-muted-foreground hover:text-destructive ms-2"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <Link href="/pricing">
            <Button variant="outline" size="sm" className="text-xs">
              <CreditCard className="h-3.5 w-3.5 me-1.5" />
              <span>Pricing & Scope</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* Intro */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
            Clean-Room Reverse Engineering Studio
          </h1>
          <p className="text-xs text-muted-foreground">
            Ingest any live target URL or binary executable. Free initial triage extracts architecture boundaries and calculates custom project pricing.
          </p>
        </div>

        {/* Input Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold flex items-center space-x-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Target Ingestion & Instructions</span>
              </CardTitle>

              {/* Source Type Selector */}
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTargetSource("url")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    targetSource === "url"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="inline me-1 h-3.5 w-3.5" />
                  Live URL / Repo
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSource("file")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    targetSource === "file"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Binary className="inline me-1 h-3.5 w-3.5" />
                  Binary Archive (APK / DLL)
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleRunTriage} className="space-y-5">
              {targetSource === "url" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Target Endpoint URL *
                  </label>
                  <Input
                    required
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com or public Git repository URL..."
                    className="text-xs font-mono placeholder:text-muted-foreground/40"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Supports live web applications, Google Play / App Store listings, and public GitHub repositories.
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Upload Binary File (.apk, .asar, PE/ELF/Mach-O, .har) *
                  </label>
                  <Dropzone
                    onFileSelect={(file) => handleFileDrop([file])}
                    acceptedExtensions={[".apk", ".exe", ".dll", ".elf", ".asar", ".har", ".zip"]}
                    maxSizeBytes={250 * 1024 * 1024}
                    isArabic={false}
                  />
                  {selectedFile && (
                    <div className="text-xs text-primary font-semibold">
                      Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              )}

              {/* Natural Language Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reconstruction Specifications (Optional)
                </label>
                <textarea
                  rows={2}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g. Focus on Next.js 15 dashboard layout, Drizzle ORM models, and authenticated REST endpoints..."
                  className="w-full rounded-md border border-input bg-background p-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Ownership Attestation Checkbox */}
              <div className="flex items-start space-x-2.5 p-3 rounded-md border border-border bg-muted/20">
                <input
                  type="checkbox"
                  id="attestation"
                  checked={ownershipAttested}
                  onChange={(e) => setOwnershipAttested(e.target.checked)}
                  className="mt-0.5 rounded border-border"
                />
                <label htmlFor="attestation" className="text-xs text-muted-foreground leading-snug">
                  <strong className="text-foreground">
                    Intellectual Property Attestation:
                  </strong>{" "}
                  I attest that I possess lawful authority, ownership, or fair-use interoperability rights to analyze this target artifact in accordance with clean-room legal standards.
                </label>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center space-x-2 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button type="submit" disabled={isTriaging} className="text-xs font-bold w-full sm:w-auto shadow-sm">
                {isTriaging ? (
                  <>
                    <RefreshCw className="me-1.5 h-3.5 w-3.5 animate-spin" />
                    <span>Executing Static Triage Pass...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Free Static Triage</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Technical Report & Quote Section */}
        {report && (
          <div className="space-y-8 animate-fadeIn">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px] mb-1 font-semibold">
                  AUDIT COMPLETE
                </Badge>
                <h2 className="text-xl font-bold text-foreground font-mono">
                  Architectural Audit & Evidence Ledger
                </h2>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Project ID: <span className="text-foreground">{report.projectId}</span> • Target:{" "}
                  <span className="text-foreground font-semibold">{report.targetType}</span> • Confidence:{" "}
                  <span className="text-primary font-bold">{(report.confidenceScore * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card text-right font-mono">
                <div className="text-[10px] text-muted-foreground uppercase">Custom Project Quote</div>
                <div className="text-2xl font-extrabold text-primary">{report.quote.cleanPriceLabel}</div>
                <div className="text-[10px] text-muted-foreground">Paddle Checkout Link</div>
              </div>
            </div>

            {/* Tech Stack Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase font-mono">Frontend</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {report.detectedTechStack.frontend?.map((tech, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-foreground font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{tech}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase font-mono">Backend & APIs</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {report.detectedTechStack.backend?.map((tech, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-foreground font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{tech}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase font-mono">Database</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {report.detectedTechStack.database?.map((tech, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-foreground font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{tech}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase font-mono">Target Runtime</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="text-foreground font-semibold">{report.detectedTechStack.runtime || "Next.js 15 Node Runtime"}</div>
                  <div className="text-[11px] text-muted-foreground">Clean TypeScript Export</div>
                </CardContent>
              </Card>
            </div>

            {/* Evidence Ledger Section */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center space-x-2">
                      <FileCode className="h-4 w-4 text-primary" />
                      <span>Evidence Ledger (Seen vs Inferred vs Unknown)</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Component categorization guaranteeing clean-room isolation and zero source contamination.
                    </CardDescription>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                    {(["All", "Seen", "Inferred", "UnknownServerSide"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setEvidenceFilter(filter)}
                        className={`px-2.5 py-1 rounded transition ${
                          evidenceFilter === filter
                            ? "bg-primary text-primary-foreground font-bold"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {filter === "UnknownServerSide" ? "Unknown (Backend)" : filter}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-border text-xs">
                  {filteredEvidence?.map((item, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-foreground">{item.component}</span>
                          <span className="text-[11px] text-muted-foreground">({item.category})</span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {item.evidenceOrObligation}
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 font-mono ${
                          item.status === "Seen"
                            ? "border-primary/50 text-primary bg-primary/5"
                            : item.status === "Inferred"
                            ? "border-amber-500/50 text-amber-600 bg-amber-500/5"
                            : "border-border text-foreground bg-muted/40"
                        }`}
                      >
                        {item.status === "Seen" ? "● SEEN" : item.status === "Inferred" ? "▲ INFERRED" : "■ SYNTHESIS REQUIRED"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Milestones & Payment Gate */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Milestones */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm font-bold flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Reconstruction Milestones & Deliverables</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {report.quote.milestones.map((m) => (
                      <div key={m.stepNumber} className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-muted/20">
                        <div className="h-6 w-6 rounded border border-primary/40 bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 font-mono">
                          0{m.stepNumber}
                        </div>
                        <div className="space-y-0.5 flex-1 text-xs">
                          <div className="font-bold text-foreground">
                            {m.titleEn}
                          </div>
                          <div className="text-muted-foreground">
                            {m.deliverableEn}
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono shrink-0">
                          ~{m.estimatedMinutes} min
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Payment Gate Card */}
              <div className="space-y-4">
                <Card className="border-primary/40 bg-card shadow-sm">
                  <CardHeader className="pb-3 border-b border-border">
                    <Badge variant="outline" className="w-fit text-[10px] border-primary/50 text-primary font-semibold">
                      DYNAMIC QUOTE
                    </Badge>
                    <CardTitle className="text-3xl font-extrabold text-foreground mt-1 font-mono">
                      {report.quote.cleanPriceLabel}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Single project price calculated for this target.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4 text-xs font-mono">
                    <div className="space-y-2 border-b border-border pb-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Target Scope:</span>
                        <span className="text-foreground font-semibold">{report.targetType}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Payment Provider:</span>
                        <span className="text-primary font-bold">Paddle Verified</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Guarantee:</span>
                        <span className="text-foreground font-semibold">100% Compilation Pass</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground font-sans leading-normal">
                      Includes full Next.js 15, Drizzle ORM models, automated test harness execution, and downloadable verified ZIP repository.
                    </div>

                    {!isUnlocked ? (
                      <Button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="w-full text-xs font-bold h-11 shadow-sm font-sans"
                      >
                        {isCheckingOut ? (
                          <>
                            <RefreshCw className="me-1.5 h-3.5 w-3.5 animate-spin" />
                            <span>Connecting to Paddle...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="me-1.5 h-3.5 w-3.5" />
                            <span>Unlock Rebuild & Generate Code ({report.quote.cleanPriceLabel})</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="p-3 rounded-lg border border-primary/50 bg-primary/10 text-primary text-xs flex items-center space-x-2 font-bold font-sans">
                        <Unlock className="h-4 w-4" />
                        <span>Payment Verified • Synthesis Active</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Rebuild Progress & Terminal Stream */}
            {isUnlocked && (
              <div className="space-y-4 pt-4 border-t border-border animate-fadeIn font-mono">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-semibold">
                      STAGE 07: CODE SYNTHESIS
                    </Badge>
                    <h2 className="text-lg font-bold text-foreground">
                      Live Telemetry Stream
                    </h2>
                  </div>

                  {sandboxProgress?.downloadUrl && (
                    <a
                      href={sandboxProgress.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm font-sans"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Clean-Room Repository (.ZIP)</span>
                    </a>
                  )}
                </div>

                {/* Stepper Progress */}
                <Stepper
                  currentStep={currentStepIndex}
                  steps={[
                    { id: 1, title: "Auth", description: "Webhook verified" },
                    { id: 2, title: "Container", description: "Sandbox spawn" },
                    { id: 3, title: "Triage", description: "Symbol extraction" },
                    { id: 4, title: "Synthesis", description: "Clean code" },
                    { id: 5, title: "Verified", description: "ZIP ready" },
                  ]}
                />

                {/* Progress bar */}
                {sandboxProgress && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Status: {sandboxProgress.status}</span>
                      <span className="font-bold text-primary">{sandboxProgress.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${sandboxProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Terminal Log Console */}
                <Card className="border-border bg-slate-900 text-slate-100 text-xs">
                  <CardHeader className="pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Terminal className="h-4 w-4 text-primary" />
                      <span>Container Disassembly Log (/dev/pts/0)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span>SSE Stream Active</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 h-64 overflow-y-auto space-y-2 select-text" dir="ltr">
                    {logs.length === 0 ? (
                      <div className="text-slate-500">Initializing execution container...</div>
                    ) : (
                      logs.map((log, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                          <span className="text-primary shrink-0">[{log.step}]</span>
                          <span className="text-slate-200">{log.message}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
