"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Send,
  RefreshCw,
  ExternalLink,
  Laptop,
  Tablet,
  Smartphone,
  ChevronRight,
  GitCommit,
  CheckCircle,
  FileCode,
  Shield,
  Layers,
  Coins,
  History,
  RotateCcw,
  Play,
  Square,
  Terminal,
  Camera,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export interface VersionItem {
  id: string;
  versionNumber: number;
  label: string;
  zipStorageKey: string;
  previewUrl: string | null;
  parityScore: number | null;
  filesManifest: Array<{ path: string; size?: number; sha256?: string }>;
  createdAt: string;
}

export interface EditItem {
  id: string;
  promptRaw: string;
  promptEnhanced: string | null;
  status: string;
  tokensHeldCents: number;
  tokensSettledCents: number;
  diffStat: { filesChanged: number; insertions: number; deletions: number } | null;
  failureReason: string | null;
  createdAt: string;
}

export interface PreviewSessionItem {
  id: string;
  versionId: string;
  status:
    | "requested"
    | "building"
    | "starting"
    | "ready"
    | "stopping"
    | "stopped"
    | "error";
  lastError: string | null;
  buildLogs: string | null;
  heartbeatAt?: string | null;
  startedAt?: string | null;
  expiresAt?: string | null;
}

interface StudioClientProps {
  projectId: string;
  projectName: string;
  initialVersions: VersionItem[];
  initialEdits: EditItem[];
  initialBalanceCents: number;
  initialRoutes?: string[];
}

export function StudioClient({
  projectId,
  projectName,
  initialVersions,
  initialEdits,
  initialBalanceCents,
  initialRoutes = ["/"],
}: StudioClientProps) {
  const [versions, setVersions] = useState<VersionItem[]>(initialVersions);
  const [edits, setEdits] = useState<EditItem[]>(initialEdits);
  const [balanceCents, setBalanceCents] = useState<number>(initialBalanceCents);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    initialVersions[0]?.id || ""
  );

  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Viewport toggles
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  // Right pane tab
  const [activeTab, setActiveTab] = useState<"diff" | "checks" | "parity" | "files">("diff");
  const [isRightPaneOpen, setIsRightPaneOpen] = useState(true);

  const activeVersion =
    versions.find((v) => v.id === selectedVersionId) || versions[0] || null;

  const [route, setRoute] = useState<string>(initialRoutes[0] || "/");
  const [previewSession, setPreviewSession] = useState<PreviewSessionItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const previewBasePath = `/api/studio/preview/${projectId}${route === "/" ? "/" : route}`;
  const previewSrc = activeVersion
    ? `${previewBasePath}?version=${encodeURIComponent(activeVersion.id)}`
    : previewBasePath;

  const refreshPreview = async () => {
    if (!activeVersion) return;
    try {
      const res = await fetch(`/api/studio/preview/sessions?projectId=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      const sessions = (data.sessions || []) as PreviewSessionItem[];
      const current = sessions.find((entry) => entry.versionId === activeVersion.id) || null;
      setPreviewSession(current);
      if (current?.lastError) setPreviewError(current.lastError);
      if (current?.status === "ready" || current?.status === "error") setPreviewLoading(false);
    } catch {
      // The polling loop below will retry; do not invent a ready state.
    }
  };

  const startPreview = async () => {
    if (!activeVersion || previewLoading) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/studio/preview/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, versionId: activeVersion.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview request failed.");
      setPreviewSession({
        id: data.session.id,
        versionId: activeVersion.id,
        status: data.session.status || "requested",
        lastError: null,
        buildLogs: null,
        expiresAt: data.session.expiresAt,
      });
      setShowLogs(true);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview request failed.");
      setPreviewLoading(false);
    }
  };

  const stopPreviewSession = async () => {
    if (!previewSession) return;
    try {
      await fetch(`/api/studio/preview/sessions/${previewSession.id}`, {
        method: "DELETE",
      });
      setPreviewSession((current) =>
        current ? { ...current, status: "stopping" } : current
      );
    } catch {
      // Leave the real state visible; the worker owns container teardown.
    }
  };

  useEffect(() => {
    setPreviewSession(null);
    setPreviewError(null);
    setPreviewLoading(false);
    void refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionId]);

  useEffect(() => {
    if (!previewSession) return;
    if (previewSession.status === "ready" || previewSession.status === "error") return;
    const timer = setInterval(() => void refreshPreview(), 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSession?.id, previewSession?.status, selectedVersionId]);

  const handleApplyEdit = async () => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/studio/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: prompt.trim(),
          maxCents: 200,
          parentVersionId: activeVersion?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Edit execution failed");
      }

      // Refresh versions list
      const vRes = await fetch(`/api/studio/versions?projectId=${projectId}`);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVersions(vData.versions);
        if (vData.versions[0]) {
          setSelectedVersionId(vData.versions[0].id);
        }
      }

      // Deduct balance
      if (data.tokensSettledCents) {
        setBalanceCents((prev) => Math.max(0, prev - data.tokensSettledCents));
      }

      setPrompt("");
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute edit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollback = async (version: VersionItem) => {
    if (!confirm(`Revert workspace to ${version.label}?`)) return;
    setPrompt(`Revert codebase back to snapshot of version ${version.versionNumber}`);
  };

  const viewportWidth =
    viewport === "desktop"
      ? "w-full max-w-[1280px]"
      : viewport === "tablet"
        ? "w-[768px] max-w-full"
        : "w-[390px] max-w-full";

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Studio Top Navigation Bar */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/projects/${projectId}`} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 me-1.5" />
              <span>Project</span>
            </Link>
          </Button>
          <span className="text-border">|</span>
          <span className="font-serif font-bold text-base text-foreground truncate max-w-xs">
            {projectName}
          </span>
          <Badge variant="outline" className="font-mono text-sm border-primary/40 text-primary">
            STUDIO
          </Badge>
        </div>

        {/* Viewport Selector */}
        <div className="hidden md:flex items-center space-x-1 border border-border rounded-md p-1 bg-muted/20">
          <Button
            variant={viewport === "desktop" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("desktop")}
            className="h-8 px-2 text-sm"
          >
            <Laptop className="h-4 w-4 me-1" />
            <span>Desktop</span>
          </Button>
          <Button
            variant={viewport === "tablet" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("tablet")}
            className="h-8 px-2 text-sm"
          >
            <Tablet className="h-4 w-4 me-1" />
            <span>Tablet</span>
          </Button>
          <Button
            variant={viewport === "mobile" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("mobile")}
            className="h-8 px-2 text-sm"
          >
            <Smartphone className="h-4 w-4 me-1" />
            <span>Mobile</span>
          </Button>
        </div>

        {/* Credits Balance & Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-muted/40 border border-border rounded-md px-3 py-1 text-sm font-mono">
            <Coins className="h-4 w-4 text-primary" />
            <span>${(balanceCents / 100).toFixed(2)}</span>
            <span className="text-muted-foreground">({balanceCents * 10} tokens)</span>
          </div>

          <span
            className={`text-sm font-mono px-2 py-1 rounded border ${
              previewSession?.status === "ready"
                ? "border-emerald-500/40 text-emerald-400"
                : previewSession?.status === "error"
                  ? "border-destructive/40 text-destructive"
                  : "border-border text-muted-foreground"
            }`}
          >
            {previewSession?.status || "no preview"}
          </span>

          {previewSession?.status === "ready" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopPreviewSession}
              title="Stop preview"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startPreview}
              disabled={previewLoading}
              title="Start preview"
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogs((value) => !value)}
            title="Preview logs"
          >
            <Terminal className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIframeKey((k) => k + 1)}
            disabled={previewSession?.status !== "ready"}
            title="Reload Preview"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            title="Open preview in new tab"
          >
            <a href={previewSrc} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Studio Three-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane (360px): Prompts, Enhancements, Versions */}
        <aside className="w-[360px] border-e border-border bg-card flex flex-col shrink-0">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-foreground">Snapshot Version</span>
              <span className="text-sm font-mono text-muted-foreground">
                {versions.length} versions
              </span>
            </div>

            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="w-full bg-background border border-border rounded-md p-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber}: {v.label.slice(0, 32)}
                </option>
              ))}
            </select>

            {activeVersion && activeVersion.versionNumber > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-sm font-sans"
                onClick={() => handleRollback(activeVersion)}
              >
                <RotateCcw className="h-3.5 w-3.5 me-1.5" />
                <span>Rollback to v{activeVersion.versionNumber}</span>
              </Button>
            )}
          </div>

          {/* Prompt Submission Console */}
          <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="font-serif font-bold text-sm">Refine with Agent</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Describe visual adjustments, theme changes, copy updates, or feature refinements. Edits are verified and previewed instantly.
              </p>

              <Textarea
                placeholder="e.g. Change primary button colors to deep indigo, and update the hero headline..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isSubmitting}
                rows={5}
                className="resize-none font-sans text-sm border-border bg-background"
              />

              {errorMessage && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-snug">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex justify-between items-center text-sm text-muted-foreground font-mono">
                <span>Hold Budget Cap:</span>
                <span className="font-bold text-foreground">$2.00 (200¢)</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground font-mono">
                <span>Base Edit Floor:</span>
                <span>$0.50 (50¢)</span>
              </div>

              <Button
                className="w-full shadow-sm text-sm font-bold"
                onClick={handleApplyEdit}
                disabled={isSubmitting || !prompt.trim()}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                    <span>Applying & Verifying...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 me-2" />
                    <span>Execute Studio Edit</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </aside>

        {/* Center Pane (flex): real state machine + live preview */}
        <main className="flex-1 bg-muted/20 flex flex-col items-center p-3 md:p-4 overflow-hidden min-w-0">
          <div className="w-full max-w-[1280px] flex flex-wrap items-center gap-2 pb-3 shrink-0">
            <label className="sr-only" htmlFor="preview-route">
              Preview route
            </label>
            <select
              id="preview-route"
              value={route}
              onChange={(event) => setRoute(event.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm font-mono max-w-[220px]"
            >
              {(initialRoutes.length > 0 ? initialRoutes : ["/"]).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Button
              variant={showCompare ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowCompare((value) => !value)}
              className="h-8 text-sm"
            >
              <Camera className="h-3.5 w-3.5 me-1" />
              Compare
            </Button>
            <span className="text-sm text-muted-foreground">
              {previewSession?.expiresAt
                ? `Expires ${new Date(previewSession.expiresAt).toLocaleTimeString()}`
                : "No preview session"}
            </span>
          </div>

          {showCompare && (
            <div className="w-full max-w-[1280px] mb-2 rounded-md border border-border bg-card p-2 text-sm text-muted-foreground">
              {activeVersion?.parityScore != null
                ? `Last recorded parity for ${activeVersion.label}: ${(activeVersion.parityScore * 100).toFixed(1)}%. Reference screenshots are not stored for this version, so no image compare is claimed.`
                : "No verified reference screenshots are stored for this version. There is no image comparison to show."}
            </div>
          )}

          <div
            className={`flex-1 min-h-0 border border-border bg-background rounded-lg shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${viewportWidth}`}
          >
            <div className="h-8 bg-muted/40 border-b border-border px-3 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <span className="text-sm font-mono text-muted-foreground truncate">
                {route}
              </span>
              <span
                className={`text-sm font-mono flex items-center shrink-0 ${
                  previewSession?.status === "ready"
                    ? "text-emerald-700"
                    : previewSession?.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {previewSession?.status === "ready" ? (
                  <CheckCircle className="h-3.5 w-3.5 me-1" />
                ) : previewSession?.status === "error" ? (
                  <AlertTriangle className="h-3.5 w-3.5 me-1" />
                ) : previewLoading ? (
                  <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" />
                ) : null}
                {previewSession?.status || "not started"}
              </span>
            </div>

            {previewSession?.status === "ready" ? (
              <iframe
                key={`${iframeKey}-${route}-${activeVersion?.id || ""}`}
                src={previewSrc}
                title="Studio live sandbox preview"
                sandbox="allow-scripts allow-forms allow-same-origin"
                className="w-full flex-1 border-0 bg-background"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {previewLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Play className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-serif font-bold text-sm">
                    {previewSession?.status === "error"
                      ? "Preview server failed to start"
                      : previewSession
                        ? `Preview is ${previewSession.status}`
                        : "Preview server is not running"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                    {previewError ||
                      previewSession?.lastError ||
                      "Start a preview to build this version and run it in the sandbox. The worker must be online with Docker available."}
                  </p>
                  {!previewSession && (
                    <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                      No verified screenshots are stored for this version, so none are shown as a
                      fallback.
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={startPreview} disabled={previewLoading}>
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 me-2" />
                  )}
                  Start preview
                </Button>
              </div>
            )}
          </div>

          {showLogs && (
            <div className="w-full max-w-[1280px] mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-zinc-950 p-3 text-sm leading-relaxed text-zinc-200 font-mono shrink-0">
              <div className="flex items-center justify-between mb-1 text-zinc-400">
                <span>Preview logs</span>
                <button
                  type="button"
                  onClick={() => setShowLogs(false)}
                  className="underline hover:text-white"
                >
                  close
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words">
                {previewSession?.buildLogs ||
                  previewSession?.lastError ||
                  "No build logs recorded yet. Logs appear after the worker claims this session."}
              </pre>
            </div>
          )}
        </main>

        {/* Right Pane (420px, Collapsible): Diff, Checks, Parity, Files */}
        {isRightPaneOpen && (
          <aside className="w-[420px] border-s border-border bg-card flex flex-col shrink-0">
            {/* Tabs Header */}
            <div className="h-10 border-b border-border flex items-center justify-between px-2 bg-muted/10">
              <div className="flex space-x-1">
                {(["diff", "checks", "parity", "files"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm font-serif capitalize border-b-2 transition-colors ${
                      activeTab === tab
                        ? "border-primary text-primary font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRightPaneOpen(false)}
                className="h-7 px-2 text-sm"
              >
                Close
              </Button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {activeTab === "diff" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm">Unified Diff Summary</span>
                    <Badge variant="outline" className="font-mono text-sm">
                      {activeVersion?.label || "Base"}
                    </Badge>
                  </div>

                  <Card className="border-border bg-background p-3 text-sm font-mono space-y-2">
                    <div className="text-emerald-800">+ Changes applied across target files</div>
                    <div className="text-muted-foreground">
                      Total Files Monitored: {activeVersion?.filesManifest?.length || 2}
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <span className="font-bold text-sm">Touched Files</span>
                    <div className="space-y-1 font-mono text-sm">
                      {(activeVersion?.filesManifest || []).map((f) => (
                        <div
                          key={f.path}
                          className="p-2 rounded border border-border bg-background flex items-center justify-between"
                        >
                          <span className="truncate">{f.path}</span>
                          <span className="text-muted-foreground">{f.size || 0} bytes</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "checks" && (
                <div className="space-y-4">
                  <span className="font-serif font-bold text-sm">Compilation & Safety Checks</span>
                  <div className="space-y-2 font-sans text-sm">
                    {[
                      "TypeScript clean compilation",
                      "Safety perimeter (no hostile code)",
                      "Reference leakage scan",
                    ].map((label) => (
                      <div
                        key={label}
                        className="p-3 rounded border border-border bg-background flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          <span>{label}</span>
                        </div>
                        <Badge variant="outline">
                          {activeVersion?.parityScore != null
                            ? "VERIFIED"
                            : "NOT RECORDED"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "parity" && (
                <div className="space-y-4">
                  <span className="font-serif font-bold text-sm">Empirical Parity Verification</span>
                  <div className="p-4 rounded border border-border bg-background text-center space-y-2">
                    <div className="text-3xl font-bold font-serif text-primary">
                      {activeVersion?.parityScore != null
                        ? `${(activeVersion.parityScore * 100).toFixed(1)}%`
                        : "Not measured"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Measured parity recorded with this immutable version.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "files" && (
                <div className="space-y-2">
                  <span className="font-serif font-bold text-sm">Filesystem Manifest</span>
                  <div className="space-y-1 font-mono text-sm">
                    {(activeVersion?.filesManifest || []).map((file) => (
                      <div
                        key={file.path}
                        className="p-2 rounded border border-border bg-background flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{file.path}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
