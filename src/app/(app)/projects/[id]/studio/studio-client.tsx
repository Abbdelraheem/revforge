"use client";

import React, { useEffect, useRef, useState } from "react";
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
  GitCommit,
  CheckCircle,
  FileCode,
  Shield,
  Layers,
  Coins,
  RotateCcw,
  Play,
  Square,
  Terminal,
  Camera,
  AlertTriangle,
  Loader2,
  X,
  MessageSquare,
  Eye,
  ShoppingCart,
  Clock,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { STUDIO_TOKEN_PACKS } from "@/config/studio-tokens";
import { useToast } from "@/components/ui/toast";

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
  resultingVersionId?: string | null;
  cancelRequested?: boolean;
  createdAt: string;
  finishedAt?: string | null;
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

const ACTIVE_EDIT_STATUSES = new Set([
  "pending",
  "enhancing",
  "held",
  "applying",
  "verifying",
]);

const TERMINAL_EDIT_STATUSES = new Set(["committed", "failed", "refunded"]);

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  enhancing: "Interpreting request",
  held: "Credits held",
  applying: "Applying changes",
  verifying: "Running verification",
  committed: "Committed",
  failed: "Failed",
  refunded: "Credits released",
};

const QUICK_CHIPS = [
  "Tighten spacing and alignment on mobile",
  "Improve text contrast to WCAG AA",
  "Update the hero headline and supporting copy",
  "Make the primary action clearer",
  "Add a useful empty state",
];

type RightTab = "code" | "tests" | "parity" | "history";
type MobilePane = "chat" | "preview" | "details";
type StreamMode = "idle" | "connecting" | "live" | "polling" | "closed";

interface StreamEdit {
  id: string;
  status: string;
  promptRaw: string;
  tokensHeldCents: number;
  tokensSettledCents: number;
  resultingVersionId: string | null;
  failureReason: string | null;
  diffStat: EditItem["diffStat"];
  cancelRequested: boolean;
  finishedAt: string | null;
}

function statusBadgeClass(status: string): string {
  if (status === "committed") return "border-emerald-600/40 text-emerald-700";
  if (status === "failed") return "border-destructive/40 text-destructive";
  if (status === "refunded") return "border-amber-600/40 text-amber-700";
  return "border-primary/40 text-primary";
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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

  const { toast } = useToast();
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real edit status stream. `streamEdit` holds only what the server sent.
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [streamEdit, setStreamEdit] = useState<StreamEdit | null>(null);
  const [statusHistory, setStatusHistory] = useState<string[]>([]);
  const [streamMode, setStreamMode] = useState<StreamMode>("idle");
  const [canceling, setCanceling] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const terminalRef = useRef(false);

  const [showTokenPacks, setShowTokenPacks] = useState(false);
  const [buyingPack, setBuyingPack] = useState<number | null>(null);

  // Viewport toggles
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  const [activeTab, setActiveTab] = useState<RightTab>("code");
  const [isRightPaneOpen, setIsRightPaneOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");

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
      // The polling loop below retries; never invent a ready state.
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

  const closeStream = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => closeStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: focus prompt input
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        promptInputRef.current?.focus();
        promptInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Escape: blur or cancel edit
      if (e.key === "Escape") {
        if (document.activeElement === promptInputRef.current) {
          promptInputRef.current?.blur();
        } else if (activeEditId && !terminalRef.current) {
          void handleCancel();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEditId]);

  const refreshWorkspace = async (preferredVersionId?: string | null) => {
    const [vRes, eRes] = await Promise.all([
      fetch(`/api/studio/versions?projectId=${projectId}`),
      fetch(`/api/studio/edits?projectId=${projectId}`),
    ]);

    if (vRes.ok) {
      const vData = await vRes.json();
      const nextVersions = (vData.versions || []) as VersionItem[];
      setVersions(nextVersions);
      const preferred = nextVersions.find((v) => v.id === preferredVersionId);
      if (preferred) setSelectedVersionId(preferred.id);
    }

    if (eRes.ok) {
      const eData = await eRes.json();
      setEdits((eData.edits || []) as EditItem[]);
      if (typeof eData.balanceCents === "number") {
        setBalanceCents(eData.balanceCents);
      }
    }
  };

  const applyEditStatus = (payload: StreamEdit) => {
    setStreamEdit(payload);
    setActiveEditId(payload.id);
    setStatusHistory((previous) =>
      previous[previous.length - 1] === payload.status
        ? previous
        : [...previous, payload.status]
    );

    if (TERMINAL_EDIT_STATUSES.has(payload.status)) {
      terminalRef.current = true;
      closeStream();
      setStreamMode("closed");
      setIsSubmitting(false);
      setCanceling(false);

      if (payload.status === "committed") {
        setPrompt("");
        setIframeKey((key) => key + 1);
        void refreshWorkspace(payload.resultingVersionId);
        toast({
          variant: "success",
          title: "Version committed",
          description: "Studio verified and committed the requested changes into a new version.",
        });
      } else {
        const failure =
          payload.failureReason ||
          (payload.status === "refunded"
            ? "The edit stopped and the held tokens were released."
            : "The edit failed before a new version was committed.");
        setErrorMessage(failure);
        void refreshWorkspace();
        toast({
          variant: payload.status === "refunded" ? "default" : "destructive",
          title: payload.status === "refunded" ? "Hold released" : "Edit stopped",
          description: failure,
        });
      }
    }
  };

  const startPolling = (editId: string) => {
    const poll = async () => {
      if (terminalRef.current) return;
      try {
        const res = await fetch(`/api/studio/edits?projectId=${projectId}`);
        if (!res.ok) throw new Error("Could not read edit status.");
        const data = await res.json();
        if (typeof data.balanceCents === "number") setBalanceCents(data.balanceCents);
        const edit = (data.edits || []).find(
          (entry: EditItem) => entry.id === editId
        ) as EditItem | undefined;
        if (edit) {
          applyEditStatus({
            id: edit.id,
            status: edit.status,
            promptRaw: edit.promptRaw,
            tokensHeldCents: edit.tokensHeldCents,
            tokensSettledCents: edit.tokensSettledCents,
            resultingVersionId: edit.resultingVersionId ?? null,
            failureReason: edit.failureReason,
            diffStat: edit.diffStat,
            cancelRequested: Boolean(edit.cancelRequested),
            finishedAt: edit.finishedAt ?? null,
          });
        }
        if (terminalRef.current) return;
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Could not read edit status."
        );
      }
      pollTimerRef.current = window.setTimeout(poll, 1500);
    };
    void poll();
  };

  const connectToEdit = (editId: string) => {
    closeStream();
    terminalRef.current = false;
    setActiveEditId(editId);
    setStreamMode("connecting");
    setMobilePane("chat");

    if (typeof EventSource === "undefined") {
      setStreamMode("polling");
      startPolling(editId);
      return;
    }

    const source = new EventSource(`/api/studio/edits/${editId}/events`);
    eventSourceRef.current = source;

    source.onopen = () => setStreamMode("live");
    source.addEventListener("status", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as StreamEdit;
        applyEditStatus(payload);
      } catch {
        setErrorMessage("The edit status stream returned unreadable data.");
      }
    });
    source.onerror = () => {
      if (terminalRef.current) return;
      source.close();
      eventSourceRef.current = null;
      setStreamMode("polling");
      startPolling(editId);
    };
  };

  // Resume a genuinely active edit after a reload instead of showing a blank
  // composer that would race the worker.
  useEffect(() => {
    const active = initialEdits.find((edit) =>
      ACTIVE_EDIT_STATUSES.has(edit.status)
    );
    if (active) {
      setIsSubmitting(true);
      connectToEdit(active.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyEdit = async () => {
    if (!prompt.trim() || isSubmitting) return;

    const draftPrompt = prompt.trim();
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticEdit: EditItem = {
      id: optimisticId,
      promptRaw: draftPrompt,
      promptEnhanced: null,
      status: "pending",
      tokensHeldCents: 200,
      tokensSettledCents: 0,
      diffStat: null,
      failureReason: null,
      resultingVersionId: null,
      cancelRequested: false,
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setErrorMessage(null);
    setStreamEdit(null);
    setStatusHistory([]);
    setEdits((prev) => [optimisticEdit, ...prev]);

    try {
      const res = await fetch("/api/studio/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: draftPrompt,
          maxCents: 200,
          parentVersionId: activeVersion?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEdits((prev) => prev.filter((e) => e.id !== optimisticId));
        if (res.status === 402) {
          const err =
            data.error ||
            "Not enough tokens for this hold. Buy a pack, then retry the edit.";
          setErrorMessage(err);
          setShowTokenPacks(true);
          setIsSubmitting(false);
          toast({ variant: "destructive", title: "Insufficient tokens", description: err });
          return;
        }
        if (res.status === 409) {
          const err = data.error || "Another edit is already running.";
          setErrorMessage(err);
          if (data.activeEditId) {
            connectToEdit(data.activeEditId);
            setIsSubmitting(true);
            return;
          }
          setIsSubmitting(false);
          toast({ variant: "destructive", title: "Concurrency limit", description: err });
          return;
        }
        throw new Error(data.error || "Edit execution failed");
      }

      if (res.status === 202 && data.editId) {
        setEdits((prev) =>
          prev.map((e) => (e.id === optimisticId ? { ...e, id: data.editId } : e))
        );
        setPrompt("");
        connectToEdit(data.editId);
        return;
      }

      // Compatibility for an older synchronous response.
      setPrompt("");
      await refreshWorkspace(data.versionId);
      setIframeKey((key) => key + 1);
      setIsSubmitting(false);
    } catch (err) {
      setEdits((prev) => prev.filter((e) => e.id !== optimisticId));
      const failure = err instanceof Error ? err.message : "Failed to execute edit";
      setErrorMessage(failure);
      setIsSubmitting(false);
      toast({ variant: "destructive", title: "Edit could not start", description: failure });
    }
  };

  const handleCancel = async () => {
    if (!activeEditId || canceling) return;
    setCanceling(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/studio/edits/${activeEditId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed.");
      const msg =
        data.releasedCents > 0
          ? `Edit canceled. ${formatCents(data.releasedCents)} of held tokens was released.`
          : "Edit canceled. No held tokens remained to release.";
      setErrorMessage(msg);
      toast({
        title: "Edit canceled",
        description: msg,
      });
      terminalRef.current = true;
      closeStream();
      setStreamMode("closed");
      setIsSubmitting(false);
      setStreamEdit((current) =>
        current
          ? {
              ...current,
              status: "refunded",
              tokensSettledCents: 0,
              failureReason: "Canceled by the user.",
              finishedAt: new Date().toISOString(),
            }
          : current
      );
      setStatusHistory((previous) =>
        previous[previous.length - 1] === "refunded"
          ? previous
          : [...previous, "refunded"]
      );
      await refreshWorkspace();
    } catch (err) {
      const errStr = err instanceof Error ? err.message : "Cancellation failed.";
      setErrorMessage(errStr);
      toast({ variant: "destructive", title: "Cancellation failed", description: errStr });
    } finally {
      setCanceling(false);
    }
  };

  const buyTokens = async (amountCents: number) => {
    if (buyingPack) return;
    setBuyingPack(amountCents);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/studio/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, amountCents }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Could not start the token checkout.");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      const errStr = err instanceof Error ? err.message : "Could not start the token checkout.";
      setErrorMessage(errStr);
      toast({ variant: "destructive", title: "Checkout error", description: errStr });
      setBuyingPack(null);
    }
  };

  const handleRollback = (version: VersionItem) => {
    const previous = prompt;
    const revertPrompt = `Revert codebase back to snapshot of version ${version.versionNumber}`;
    setPrompt(revertPrompt);
    promptInputRef.current?.focus();
    if (previous.trim() && previous !== revertPrompt) {
      toast({
        title: "Revert draft inserted",
        description: `Drafted rollback prompt for version ${version.versionNumber}.`,
        action: {
          label: "Undo",
          onClick: () => setPrompt(previous),
        },
      });
    }
  };

  const handleChipSelect = (chip: string) => {
    const previous = prompt;
    setPrompt(chip);
    promptInputRef.current?.focus();
    if (previous.trim() && previous !== chip) {
      toast({
        title: "Template applied",
        description: "Replaced draft with quick template chip.",
        action: {
          label: "Undo",
          onClick: () => setPrompt(previous),
        },
      });
    }
  };

  const activeStreamOrEdit = streamEdit
    ? streamEdit
    : activeEditId
      ? edits.find((edit) => edit.id === activeEditId) || null
      : edits.find((edit) => ACTIVE_EDIT_STATUSES.has(edit.status)) || null;

  const conversation = [...edits].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const viewportWidth =
    viewport === "desktop"
      ? "w-full max-w-[1280px]"
      : viewport === "tablet"
        ? "w-[768px] max-w-full"
        : "w-[390px] max-w-full";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background font-sans text-foreground">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={`/projects/${projectId}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 me-1.5" />
              <span className="hidden sm:inline">Project</span>
            </Link>
          </Button>
          <span className="text-border">|</span>
          <span className="max-w-[10rem] truncate font-serif text-base font-bold text-foreground sm:max-w-xs">
            {projectName}
          </span>
          <Badge
            variant="outline"
            className="hidden border-primary/40 font-mono text-sm text-primary sm:inline-flex"
          >
            STUDIO
          </Badge>
        </div>

        <div className="hidden items-center gap-1 rounded-md border border-border bg-muted/20 p-1 md:flex">
          <Button
            variant={viewport === "desktop" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("desktop")}
            className="h-8 px-2 text-sm"
          >
            <Laptop className="h-4 w-4 me-1" />
            <span className="hidden lg:inline">Desktop</span>
          </Button>
          <Button
            variant={viewport === "tablet" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("tablet")}
            className="h-8 px-2 text-sm"
          >
            <Tablet className="h-4 w-4 me-1" />
            <span className="hidden lg:inline">Tablet</span>
          </Button>
          <Button
            variant={viewport === "mobile" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewport("mobile")}
            className="h-8 px-2 text-sm"
          >
            <Smartphone className="h-4 w-4 me-1" />
            <span className="hidden lg:inline">Mobile</span>
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowTokenPacks((value) => !value)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-sm font-mono"
            title="Studio token balance and packs"
          >
            <Coins className="h-4 w-4 text-primary" />
            <span>{formatCents(balanceCents)}</span>
          </button>

          <span
            className={`hidden rounded border px-2 py-1 font-mono text-sm sm:inline ${
              previewSession?.status === "ready"
                ? "border-emerald-500/40 text-emerald-700"
                : previewSession?.status === "error"
                  ? "border-destructive/40 text-destructive"
                  : "border-border text-muted-foreground"
            }`}
          >
            {previewSession?.status || "no preview"}
          </span>

          {previewSession?.status === "ready" ? (
            <Button variant="outline" size="sm" onClick={stopPreviewSession} title="Stop preview">
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
            className="hidden sm:inline-flex"
          >
            <Terminal className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIframeKey((key) => key + 1)}
            disabled={previewSession?.status !== "ready"}
            title="Reload preview"
            className="hidden sm:inline-flex"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" asChild title="Open preview in new tab">
            <a href={previewSrc} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>

          {!isRightPaneOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRightPaneOpen(true)}
              title="Show details"
              className="hidden xl:inline-flex"
            >
              <Layers className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex shrink-0 border-b border-border bg-card md:hidden">
        {(
          [
            ["chat", "Chat", MessageSquare],
            ["preview", "Preview", Eye],
            ["details", "Details", Layers],
          ] as const
        ).map(([pane, label, Icon]) => (
          <button
            key={pane}
            type="button"
            onClick={() => {
              setMobilePane(pane);
              if (pane === "details") setIsRightPaneOpen(true);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-sm ${
              mobilePane === pane
                ? "border-primary font-bold text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        <div className="flex items-center gap-1 border-s border-border px-2">
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            className={`rounded p-1.5 ${viewport === "desktop" ? "bg-muted" : ""}`}
            aria-label="Desktop viewport"
          >
            <Laptop className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewport("tablet")}
            className={`rounded p-1.5 ${viewport === "tablet" ? "bg-muted" : ""}`}
            aria-label="Tablet viewport"
          >
            <Tablet className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewport("mobile")}
            className={`rounded p-1.5 ${viewport === "mobile" ? "bg-muted" : ""}`}
            aria-label="Mobile viewport"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Chat and version pane */}
        <aside
          className={`${
            mobilePane === "chat" ? "flex" : "hidden"
          } w-full shrink-0 flex-col border-e border-border bg-card md:flex md:w-[340px]`}
        >
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-serif text-sm font-bold text-foreground">
                Snapshot version
              </span>
              <span className="font-mono text-sm text-muted-foreground">
                {versions.length} total
              </span>
            </div>

            <select
              value={selectedVersionId}
              onChange={(event) => setSelectedVersionId(event.target.value)}
              className="w-full rounded-md border border-border bg-background p-2 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Snapshot version"
            >
              {versions.length === 0 && <option value="">No versions yet</option>}
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber}: {version.label.slice(0, 32)}
                </option>
              ))}
            </select>

            {activeVersion && activeVersion.versionNumber > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full font-sans text-sm"
                onClick={() => handleRollback(activeVersion)}
              >
                <RotateCcw className="h-3.5 w-3.5 me-1.5" />
                <span>Ask to rollback to v{activeVersion.versionNumber}</span>
              </Button>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="flex items-center gap-1.5 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="font-serif text-sm font-bold">Studio chat</span>
            </div>

            {conversation.length === 0 && !activeStreamOrEdit && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                No edits recorded yet. Describe one change, then follow the real
                worker status in this timeline.
              </p>
            )}

            {conversation.map((edit) => (
              <div key={edit.id} className="space-y-1.5 rounded-md border border-border bg-background p-3">
                <p className="text-sm leading-snug text-foreground">{edit.promptRaw}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={`text-sm ${statusBadgeClass(edit.status)}`}>
                    {STATUS_LABEL[edit.status] || edit.status}
                  </Badge>
                  {edit.tokensSettledCents > 0 && (
                    <span className="font-mono text-sm text-muted-foreground">
                      settled {formatCents(edit.tokensSettledCents)}
                    </span>
                  )}
                </div>
                {edit.failureReason && (
                  <p className="text-sm leading-snug text-muted-foreground">
                    {edit.failureReason}
                  </p>
                )}
                {edit.diffStat && (
                  <p className="font-mono text-sm text-muted-foreground">
                    {edit.diffStat.filesChanged} files, +{edit.diffStat.insertions}, -
                    {edit.diffStat.deletions}
                  </p>
                )}
              </div>
            ))}

            {activeStreamOrEdit &&
              !conversation.some((edit) => edit.id === activeStreamOrEdit.id) && (
                <div className="space-y-2 rounded-md border border-primary/30 bg-background p-3">
                  <p className="text-sm leading-snug text-foreground">
                    {activeStreamOrEdit.promptRaw}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {STATUS_LABEL[activeStreamOrEdit.status] || activeStreamOrEdit.status}
                  </div>
                </div>
              )}

            {isSubmitting && statusHistory.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif text-sm font-bold">Worker progress</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {streamMode === "polling" ? "polling" : "live"}
                  </span>
                </div>
                {statusHistory.map((status, index) => (
                  <div key={`${status}-${index}`} className="flex items-center gap-2 text-sm">
                    {index === statusHistory.length - 1 ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-700" />
                    )}
                    <span>{STATUS_LABEL[status] || status}</span>
                  </div>
                ))}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm leading-snug text-destructive" role="alert">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-border p-4">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipSelect(chip)}
                  disabled={isSubmitting}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            <Textarea
              ref={promptInputRef}
              placeholder="Describe one change. Studio builds, verifies, and commits it as a new version."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleApplyEdit();
                }
              }}
              disabled={isSubmitting}
              rows={4}
              className="resize-none border-border bg-background font-sans text-sm"
              aria-label="Studio edit request"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-mono">Hold {formatCents(200)}</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-mono text-sm opacity-80">⌘⏎ Run</span>
                <span className="font-mono text-sm opacity-80">⌘K Focus</span>
                <span className="font-mono text-sm opacity-80">Esc Cancel</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTokenPacks((value) => !value)}
                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Buy tokens
              </button>
            </div>

            {showTokenPacks && (
              <div className="space-y-2 rounded-md border border-border bg-background p-3">
                <p className="text-sm text-muted-foreground">
                  Tokens are granted only after the signed payment webhook confirms
                  the exact subtotal.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {STUDIO_TOKEN_PACKS.map((pack) => (
                    <Button
                      key={pack.amountCents}
                      variant="outline"
                      size="sm"
                      onClick={() => void buyTokens(pack.amountCents)}
                      disabled={buyingPack != null}
                      className="text-sm"
                    >
                      {buyingPack === pack.amountCents ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        pack.label
                      )}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" asChild className="w-full text-sm">
                  <Link href="/billing">Open billing history</Link>
                </Button>
              </div>
            )}

            {isSubmitting ? (
              <Button
                variant="outline"
                className="w-full text-sm font-bold"
                onClick={() => void handleCancel()}
                disabled={canceling}
              >
                {canceling ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 me-2" />
                )}
                Cancel edit and release hold
              </Button>
            ) : (
              <Button
                className="w-full text-sm font-bold shadow-sm"
                onClick={() => void handleApplyEdit()}
                disabled={!prompt.trim()}
              >
                <Send className="h-4 w-4 me-2" />
                Start Studio edit
              </Button>
            )}

            <p className="font-mono text-sm text-muted-foreground">
              Balance {formatCents(balanceCents)}. The final charge is settled from
              recorded usage, not from the hold.
            </p>
          </div>
        </aside>

        {/* Preview pane */}
        <main
          className={`${
            mobilePane === "preview" ? "flex" : "hidden"
          } min-w-0 flex-1 flex-col items-center overflow-hidden bg-muted/20 p-3 md:flex md:p-4`}
        >
          <div className="flex w-full max-w-[1280px] shrink-0 flex-wrap items-center gap-2 pb-3">
            <label className="sr-only" htmlFor="preview-route">
              Preview route
            </label>
            <select
              id="preview-route"
              value={route}
              onChange={(event) => setRoute(event.target.value)}
              className="h-8 max-w-[220px] rounded-md border border-border bg-background px-2 font-mono text-sm"
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
            <Button
              variant="ghost"
              size="sm"
              className="ms-auto h-8 text-sm md:hidden"
              onClick={() => setMobilePane("details")}
            >
              <Layers className="h-3.5 w-3.5 me-1" />
              Details
            </Button>
          </div>

          {showCompare && (
            <div className="mb-2 w-full max-w-[1280px] rounded-md border border-border bg-card p-2 text-sm text-muted-foreground">
              {activeVersion?.parityScore != null
                ? `Recorded parity for ${activeVersion.label}: ${(activeVersion.parityScore * 100).toFixed(1)}%. No reference screenshots are stored for this version, so no image comparison is claimed.`
                : "No verified reference screenshots are stored for this version. There is no image comparison to show."}
            </div>
          )}

          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-all duration-300 ${viewportWidth}`}
          >
            <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3">
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <span className="truncate font-mono text-sm text-muted-foreground">
                {route}
              </span>
              <span
                className={`flex shrink-0 items-center font-mono text-sm ${
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
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {previewLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Play className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-sm font-bold">
                    {previewSession?.status === "error"
                      ? "Preview server failed to start"
                      : previewSession
                        ? `Preview is ${previewSession.status}`
                        : "Preview server is not running"}
                  </p>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                    {previewError ||
                      previewSession?.lastError ||
                      "Start a preview to build this version and run it in the sandbox. The worker must be online with Docker available."}
                  </p>
                  {!previewSession && (
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                      No verified screenshots are stored for this version, so none are
                      shown as a fallback.
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
            <div className="mt-2 max-h-40 w-full max-w-[1280px] shrink-0 overflow-y-auto rounded-md border border-border bg-zinc-950 p-3 font-mono text-sm leading-relaxed text-zinc-200">
              <div className="mb-1 flex items-center justify-between text-zinc-400">
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

        {/* Code / tests / parity / history pane */}
        {isRightPaneOpen && (
          <aside
            className={`${
              mobilePane === "details" ? "flex" : "hidden"
            } w-full shrink-0 flex-col border-s border-border bg-card xl:flex xl:w-[380px]`}
          >
            <div className="flex h-10 items-center justify-between gap-2 border-b border-border bg-muted/10 px-2">
              <div className="flex flex-wrap gap-1">
                {(["code", "tests", "parity", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`border-b-2 px-2 py-1.5 font-serif text-sm capitalize transition-colors ${
                      activeTab === tab
                        ? "border-primary font-bold text-primary"
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
                onClick={() => {
                  setIsRightPaneOpen(false);
                  if (mobilePane === "details") setMobilePane("preview");
                }}
                className="h-7 px-2 text-sm"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {activeTab === "code" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-sm font-bold">
                      Version file manifest
                    </span>
                    <Badge variant="outline" className="font-mono text-sm">
                      {activeVersion?.label || "No version"}
                    </Badge>
                  </div>

                  <Card className="space-y-2 border-border bg-background p-3 font-mono text-sm">
                    <div className="flex items-center gap-2 text-foreground">
                      <GitCommit className="h-4 w-4 text-primary" />
                      {activeVersion
                        ? `v${activeVersion.versionNumber}`
                        : "No committed version"}
                    </div>
                    <div className="text-muted-foreground">
                      {activeVersion?.filesManifest.length ?? 0} files recorded
                    </div>
                    <div className="text-muted-foreground">
                      {activeVersion
                        ? `Created ${new Date(activeVersion.createdAt).toLocaleString()}`
                        : "Run an accepted edit to create the first version."}
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <span className="text-sm font-bold">Files</span>
                    <div className="space-y-1 font-mono text-sm">
                      {(activeVersion?.filesManifest || []).length === 0 && (
                        <p className="text-muted-foreground">
                          No file manifest is stored for this version.
                        </p>
                      )}
                      {(activeVersion?.filesManifest || []).map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center justify-between gap-2 rounded border border-border bg-background p-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{file.path}</span>
                          </div>
                          {file.size != null && (
                            <span className="shrink-0 text-muted-foreground">
                              {file.size} bytes
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tests" && (
                <div className="space-y-4">
                  <span className="font-serif text-sm font-bold">
                    Recorded verification
                  </span>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 rounded border border-border bg-background p-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="leading-relaxed text-muted-foreground">
                        The Studio builder is required to run the project build and
                        tests before a version can be accepted. Raw test output is
                        not persisted on the version record, so this pane does not
                        claim a pass/fail badge it cannot prove.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border border-border bg-background p-3">
                      <span>Recorded parity</span>
                      <Badge variant="outline" className="font-mono text-sm">
                        {activeVersion?.parityScore != null
                          ? `${(activeVersion.parityScore * 100).toFixed(1)}%`
                          : "not measured"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border border-border bg-background p-3">
                      <span>Latest edit outcome</span>
                      <Badge
                        variant="outline"
                        className={`text-sm ${statusBadgeClass(
                          conversation[conversation.length - 1]?.status || "pending"
                        )}`}
                      >
                        {STATUS_LABEL[conversation[conversation.length - 1]?.status || ""] ||
                          "none"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "parity" && (
                <div className="space-y-4">
                  <span className="font-serif text-sm font-bold">
                    Empirical parity verification
                  </span>
                  <div className="space-y-2 rounded border border-border bg-background p-4 text-center">
                    <div className="font-serif text-3xl font-bold text-primary">
                      {activeVersion?.parityScore != null
                        ? `${(activeVersion.parityScore * 100).toFixed(1)}%`
                        : "Not measured"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activeVersion?.parityScore != null
                        ? "Stored with this immutable version."
                        : "No parity score is stored for this version."}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Reference images are not stored on the version row. Use the
                    Compare control in the preview pane to see exactly what evidence
                    is available; it never substitutes a generated image.
                  </p>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-4">
                  <span className="font-serif text-sm font-bold">Edit history</span>
                  {conversation.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No Studio edits are recorded for this project.
                    </p>
                  )}
                  <div className="space-y-2">
                    {[...conversation].reverse().map((edit) => (
                      <div
                        key={edit.id}
                        className="space-y-1.5 rounded border border-border bg-background p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={`text-sm ${statusBadgeClass(edit.status)}`}
                          >
                            {STATUS_LABEL[edit.status] || edit.status}
                          </Badge>
                          <span className="flex items-center gap-1 font-mono text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(edit.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm leading-snug">{edit.promptRaw}</p>
                        {edit.diffStat && (
                          <p className="font-mono text-sm text-muted-foreground">
                            {edit.diffStat.filesChanged} files, +
                            {edit.diffStat.insertions}, -{edit.diffStat.deletions}
                          </p>
                        )}
                        <p className="font-mono text-sm text-muted-foreground">
                          hold {formatCents(edit.tokensHeldCents)} / settled{" "}
                          {formatCents(edit.tokensSettledCents)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 rounded border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Studio versions remain attached to this project. Delivery
                      archive retention is a separate, configurable policy shown on
                      the delivery page.
                    </p>
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
