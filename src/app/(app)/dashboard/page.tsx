"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  Terminal,
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
  Server,
  Database,
  Binary,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  ChevronRight,
  FileText,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LangThemeToggle } from "@/components/shared/lang-theme-toggle";
import { CodeViewer } from "@/components/shared/code-viewer";
import { Stepper } from "@/components/shared/stepper";
import { Dropzone } from "@/components/shared/dropzone";

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
    technicalCogsUsd: number;
    targetPriceUsd: number;
    profitMarginPercent: number;
    netProfitUsd: number;
    milestones: ReconstructionMilestone[];
    cleanPriceLabel: string;
  };
  executiveSummary: string;
  confidenceScore: number;
}

export default function AppDashboardPage() {
  const [lang, setLang] = useState<"ar" | "en">("en");
  const isRtl = lang === "ar";

  // Target Ingestion State
  const [targetSource, setTargetSource] = useState<"url" | "file">("url");
  const [targetUrl, setTargetUrl] = useState("https://clipzila.com");
  const [userPrompt, setUserPrompt] = useState(
    "Perform full clean-room reverse engineering: reconstruct UI architecture, video rendering pipeline contracts, audio transcription workflows, and cloud storage schema."
  );
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

  // Toggle Language
  const toggleLanguage = () => {
    const nextLang = lang === "ar" ? "en" : "ar";
    setLang(nextLang);
    document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLang;
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
      setErrorMessage(
        isRtl
          ? "يجب تأكيد الإقرار القانوني بملكية أو تفويض فحص البرنامج."
          : "You must attest lawful authority or interoperability rights for this software."
      );
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
        userPrompt,
      };

      if (targetSource === "url") {
        payload.targetInput = targetUrl;
      } else {
        if (!selectedFile || !fileBase64) {
          throw new Error(isRtl ? "يرجى رفع ملف صالح أولاً." : "Please upload a valid binary file first.");
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
        throw new Error(data.error || "Triage failed");
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
        throw new Error(data.error || "Checkout creation failed");
      }

      // Unlock clean-room rebuild & initiate SSE stream
      setIsUnlocked(true);
      startRebuildStream(report.projectId);
    } catch (err: any) {
      alert(`Checkout error: ${err.message}`);
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
    <div className="min-h-screen flex flex-col bg-background text-foreground font-mono">
      {/* Studio Navigation Bar */}
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
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs text-muted-foreground">
            <span>Workspace</span>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-foreground font-semibold">Clean-Room Studio</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="hidden lg:flex items-center space-x-2 rtl:space-x-reverse text-[11px] text-muted-foreground px-2.5 py-1 rounded border border-border bg-muted/40">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Paddle v2 Verified • gVisor Isolation • SSRF Guard</span>
          </div>

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 rounded border border-border bg-card hover:bg-muted text-xs text-foreground transition"
          >
            {isRtl ? "English" : "العربية"}
          </button>

          <LangThemeToggle />
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* Banner / Step 1 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
              STEP 01: INGESTION & TRIAGE
            </Badge>
            <span className="text-xs text-muted-foreground">Universal Ingestion Gateway</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-sans">
            {isRtl ? "استوديو الهندسة العكسية والتوليد النظيف" : "Clean-Room Reverse Engineering Studio"}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-sans max-w-2xl">
            {isRtl
              ? "قم بإدخال رابط المنصة أو رفع الحزمة البرمجية لإجراء فحص أمني وتوليد تقرير هيكلي شامل وتسعير ديناميكي بهامش 90%."
              : "Ingest any live application URL or binary executable to execute static triage, extract architectural boundaries, and generate a verified 90% margin quote."}
          </p>
        </div>

        {/* Input Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 rtl:space-x-reverse">
                <Layers className="h-4 w-4 text-primary" />
                <span>{isRtl ? "تحديد الهدف والتعليمات" : "Target Ingestion & Instructions"}</span>
              </CardTitle>
              {/* Target Type Selector */}
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs">
                <button
                  type="button"
                  onClick={() => setTargetSource("url")}
                  className={`px-3 py-1 rounded text-xs font-semibold transition ${
                    targetSource === "url"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="inline me-1 h-3 w-3" />
                  Live URL
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSource("file")}
                  className={`px-3 py-1 rounded text-xs font-semibold transition ${
                    targetSource === "file"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Binary className="inline me-1 h-3 w-3" />
                  Binary Archive
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleRunTriage} className="space-y-5">
              {targetSource === "url" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {isRtl ? "رابط المنصة أو الحزمة (URL) *" : "Target Endpoint URL *"}
                  </label>
                  <Input
                    required
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://clipzila.com or https://github.com/org/repo"
                    className="font-mono text-xs"
                    dir="ltr"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    {isRtl
                      ? "يدعم المواقع الحية، تطبيقات الويب، روابط Google Play / App Store، ومستودعات GitHub."
                      : "Supports live web apps, Google Play / App Store links, and public Git repositories."}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {isRtl ? "رفع الحزمة الثنائية (.apk, .asar, PE/ELF/Mach-O, .har) *" : "Upload Binary File *"}
                  </label>
                  <Dropzone
                    onFileSelect={(file) => handleFileDrop([file])}
                    acceptedExtensions={[".apk", ".exe", ".dll", ".elf", ".asar", ".har", ".zip"]}
                    maxSizeBytes={100 * 1024 * 1024}
                    isArabic={isRtl}
                  />
                </div>
              )}

              {/* Natural Language Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {isRtl ? "التعليمات والتفاصيل المطلوبة في الهندسة العكسية" : "Clean-Room Rebuild Specifications"}
                </label>
                <textarea
                  rows={3}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={
                    isRtl
                      ? "حدد الأجزاء التي تريد التركيز عليها مثل التصميم، قواعد البيانات، واجهات API، محركات المعالجة..."
                      : "Specify required architectural components (e.g. Next.js 15 frontend, Drizzle ORM models, FFmpeg video processing pipeline)..."
                  }
                  className="w-full rounded border border-input bg-background p-3 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Ownership Attestation Checkbox */}
              <div className="flex items-start space-x-2.5 rtl:space-x-reverse p-3 rounded border border-border bg-muted/30">
                <input
                  type="checkbox"
                  id="attestation"
                  checked={ownershipAttested}
                  onChange={(e) => setOwnershipAttested(e.target.checked)}
                  className="mt-0.5 rounded border-border"
                />
                <label htmlFor="attestation" className="text-xs text-muted-foreground leading-snug">
                  <strong className="text-foreground">
                    {isRtl ? "إقرار الملكية الفكرية والتفويض القانوني:" : "Intellectual Property Attestation:"}
                  </strong>{" "}
                  {isRtl
                    ? "أقر بأنني أمتلك الحقوق القانونية أو التفويض اللازم لفحص هذا الهدف بغرض التوافقية أو إعادة البناء المستقل وفق قوانين الغرف النظيفة."
                    : "I attest that I possess lawful authority, ownership, or fair-use interoperability rights to analyze this target artifact in accordance with clean-room legal standards."}
                </label>
              </div>

              {errorMessage && (
                <div className="p-3 rounded border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center space-x-2 rtl:space-x-reverse">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button type="submit" disabled={isTriaging} className="font-mono text-xs w-full sm:w-auto">
                {isTriaging ? (
                  <>
                    <RefreshCw className="me-1.5 h-3.5 w-3.5 animate-spin" />
                    <span>{isRtl ? "جارِ التحليل والفحص الثابت..." : "Executing Static Triage Pass..."}</span>
                  </>
                ) : (
                  <>
                    <Terminal className="me-1.5 h-3.5 w-3.5" />
                    <span>{isRtl ? "بدء التحليل واستخراج التقرير" : "Execute Static Triage & Price Quote"}</span>
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
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px] mb-1">
                  STEP 02: TECHNICAL AUDIT & EVIDENCE
                </Badge>
                <h2 className="text-xl font-bold font-sans text-foreground">
                  {isRtl ? "تقرير التحليل المعماري وسجل الأدلة" : "Architectural Audit & Evidence Ledger"}
                </h2>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  Project ID: <span className="text-foreground">{report.projectId}</span> • Target:{" "}
                  <span className="text-foreground uppercase">{report.targetType}</span> • Confidence:{" "}
                  <span className="text-primary font-bold">{(report.confidenceScore * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="p-2.5 rounded border border-border bg-card text-end font-mono">
                <div className="text-[10px] text-muted-foreground uppercase">Dynamic Quote</div>
                <div className="text-xl font-bold text-primary">{report.quote.cleanPriceLabel}</div>
                <div className="text-[10px] text-muted-foreground">90% Margin Applied</div>
              </div>
            </div>

            {/* Tech Stack Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Frontend</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {report.detectedTechStack.frontend?.map((tech, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 rtl:space-x-reverse text-foreground font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{tech}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Backend & API</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {report.detectedTechStack.backend?.map((tech, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 rtl:space-x-reverse text-foreground font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{tech}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Database & Cache</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {report.detectedTechStack.database?.map((tech, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 rtl:space-x-reverse text-foreground font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{tech}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Execution Runtime</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="text-foreground font-semibold">{report.detectedTechStack.runtime || "Next.js 15 Node Runtime"}</div>
                  <div className="text-[11px] text-muted-foreground">gVisor Sandboxed Container</div>
                </CardContent>
              </Card>
            </div>

            {/* Evidence Ledger Section */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center space-x-2 rtl:space-x-reverse">
                      <FileCode className="h-4 w-4 text-primary" />
                      <span>{isRtl ? "سجل الأدلة والالتزامات الهندسية" : "Evidence Ledger (Seen vs Inferred vs Unknown)"}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isRtl
                        ? "تصنيف كل مكوّن لضمان الالتزام بقواعد الغرف النظيفة وحماية الملكية الفكرية."
                        : "Component categorization guaranteeing clean-room isolation and zero source contamination."}
                    </CardDescription>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-[11px]">
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
                    <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <span className="font-bold text-foreground">{item.component}</span>
                          <span className="text-[11px] text-muted-foreground">({item.category})</span>
                        </div>
                        <div className="text-muted-foreground font-sans text-xs">
                          {item.evidenceOrObligation}
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono shrink-0 ${
                          item.status === "Seen"
                            ? "border-primary/50 text-primary bg-primary/5"
                            : item.status === "Inferred"
                            ? "border-amber-500/50 text-amber-500 bg-amber-500/5"
                            : "border-muted-foreground text-foreground bg-muted"
                        }`}
                      >
                        {item.status === "Seen" ? "● SEEN" : item.status === "Inferred" ? "▲ INFERRED" : "■ SYNTHESIS REQUIRED"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Pricing Breakdown & Milestones */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Milestones */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm font-bold flex items-center space-x-2 rtl:space-x-reverse">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{isRtl ? "مراحل وخطوات إعادة البناء المستقل" : "Reconstruction Obligation Milestones"}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {report.quote.milestones.map((m) => (
                      <div key={m.stepNumber} className="flex items-start space-x-3 rtl:space-x-reverse p-3 rounded border border-border bg-muted/20">
                        <div className="h-6 w-6 rounded border border-primary/40 bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          0{m.stepNumber}
                        </div>
                        <div className="space-y-0.5 flex-1 text-xs">
                          <div className="font-bold text-foreground">
                            {isRtl ? m.titleAr : m.titleEn}
                          </div>
                          <div className="text-muted-foreground font-sans">
                            {isRtl ? m.deliverableAr : m.deliverableEn}
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono shrink-0">
                          ~{m.estimatedMinutes}m
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Right Col: Pricing & Unlock Card */}
              <div className="space-y-4">
                <Card className="border-primary/40 bg-card">
                  <CardHeader className="pb-3 border-b border-border">
                    <Badge variant="outline" className="w-fit text-[10px] border-primary/50 text-primary">
                      90% MARGIN QUOTE
                    </Badge>
                    <CardTitle className="text-2xl font-bold font-mono text-foreground mt-1">
                      {report.quote.cleanPriceLabel}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Fixed, clean project price guaranteed by RevForge.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4 text-xs font-mono">
                    <div className="space-y-2 border-b border-border pb-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Technical COGS:</span>
                        <span className="text-foreground">${report.quote.technicalCogsUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Platform Target Margin:</span>
                        <span className="text-primary font-bold">{report.quote.profitMarginPercent}%</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Calculated Net Margin:</span>
                        <span className="text-foreground">${report.quote.netProfitUsd.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground font-sans leading-normal">
                      Includes isolated gVisor execution sandbox, automated clean-room compiler pass, 100% verification guarantee, and downloadable ZIP package.
                    </div>

                    {!isUnlocked ? (
                      <Button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="w-full text-xs font-mono font-bold"
                      >
                        {isCheckingOut ? (
                          <>
                            <RefreshCw className="me-1.5 h-3.5 w-3.5 animate-spin" />
                            <span>Verifying with Paddle...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="me-1.5 h-3.5 w-3.5" />
                            <span>Unlock Clean-Room Rebuild ({report.quote.cleanPriceLabel})</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="p-3 rounded border border-primary/50 bg-primary/10 text-primary text-xs flex items-center space-x-2 rtl:space-x-reverse font-bold">
                        <Unlock className="h-4 w-4" />
                        <span>Rebuild Unlocked & Active in Sandbox</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Rebuild Progress & Terminal Stream */}
            {isUnlocked && (
              <div className="space-y-4 pt-4 border-t border-border animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                      STEP 03: SANDBOX EXECUTION & SYNTHESIS
                    </Badge>
                    <h2 className="text-lg font-bold font-sans text-foreground">
                      Live Sandbox Telemetry Stream
                    </h2>
                  </div>

                  {sandboxProgress?.downloadUrl && (
                    <a
                      href={sandboxProgress.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition"
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
                    { id: 1, title: "Init", description: "Payment verified" },
                    { id: 2, title: "Container", description: "gVisor spawn" },
                    { id: 3, title: "Analysis", description: "Ghidra / JADX" },
                    { id: 4, title: "Synthesis", description: "Clean-room code" },
                    { id: 5, title: "Complete", description: "Verified ZIP" },
                  ]}
                />

                {/* Progress bar */}
                {sandboxProgress && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
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
                <Card className="border-border bg-slate-950 text-slate-100 font-mono text-xs">
                  <CardHeader className="pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Terminal className="h-4 w-4 text-primary" />
                      <span>Isolated Container Log (/dev/pts/0)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span>SSE Stream Active</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 h-64 overflow-y-auto space-y-2 select-text" dir="ltr">
                    {logs.length === 0 ? (
                      <div className="text-slate-500">Waiting for first telemetry frame...</div>
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
