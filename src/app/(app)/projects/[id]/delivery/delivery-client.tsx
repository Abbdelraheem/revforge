"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileArchive,
  FileCode,
  GitBranch,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DeliveryMeta {
  sha256: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface VersionMeta {
  id: string;
  versionNumber: number;
  label: string;
  parityScore: number | null;
  fileCount: number;
  createdAt: string;
  expiresAt: string;
}

interface GitArchiveMeta {
  id: string;
  commitCount: number;
  headCommit: string;
  sha256: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
  sourceVersionId: string | null;
}

interface DeliveryClientProps {
  projectId: string;
  projectName: string;
  projectStatus: string;
  access: { ok: boolean; status: number; error: string | null };
  delivery: DeliveryMeta | null;
  latestVersion: VersionMeta | null;
  versions: VersionMeta[];
  gitArchives: GitArchiveMeta[];
  retentionDays: number;
  expired: boolean;
  deliveryExpiresAt: string | null;
  downloadHref: string;
  githubEnabled: boolean;
  githubTokenConfigured: boolean;
  recipientEmail: string | null;
  deployGuide: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function remainingLabel(expiresAt: string, expired: boolean): string {
  if (expired) return `expired ${new Date(expiresAt).toLocaleString()}`;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  return `expires ${new Date(expiresAt).toLocaleString()} (${days} days remaining)`;
}

function accessMessage(access: DeliveryClientProps["access"]): string {
  if (access.status === 403) {
    return access.error || "A paid build order is required to open delivery.";
  }
  if (access.status === 404) {
    return "The project has no delivery record yet. Nothing is fabricated for missing archives.";
  }
  if (access.status === 409) {
    return `The build is currently '${access.error || "not delivered"}'. Delivery opens after a verified build completes.`;
  }
  return access.error || "Delivery is not available.";
}

export function DeliveryClient({
  projectId,
  projectName,
  projectStatus,
  access,
  delivery,
  latestVersion,
  versions,
  gitArchives,
  retentionDays,
  expired,
  deliveryExpiresAt,
  downloadHref,
  githubEnabled,
  githubTokenConfigured,
  recipientEmail,
  deployGuide,
}: DeliveryClientProps) {
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitMessage, setGitMessage] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const [repository, setRepository] = useState("");
  const [branch, setBranch] = useState("main");
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const canDownload = access.ok && !expired;
  const currentSourceVersionId = latestVersion?.id ?? null;
  const latestGitArchive =
    gitArchives.find(
      (archive) =>
        archive.sourceVersionId === currentSourceVersionId &&
        new Date(archive.expiresAt).getTime() > Date.now()
    ) || null;

  const generateGit = async () => {
    if (gitLoading) return;
    setGitLoading(true);
    setGitError(null);
    setGitMessage(null);
    setGeneratedUrl(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/delivery/git`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Git archive generation failed.");
      setGeneratedUrl(data.url || null);
      setGitMessage(
        `Generated ${data.commitCount} commit${data.commitCount === 1 ? "" : "s"} at ${String(
          data.headCommit
        ).slice(0, 12)}. The signed download link expires in five minutes; regenerate if it lapses.`
      );
    } catch (err) {
      setGitError(err instanceof Error ? err.message : "Git archive generation failed.");
    } finally {
      setGitLoading(false);
    }
  };

  const resendEmail = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    setResendError(null);
    setResendMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/delivery/resend`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The delivery email was not sent.");
      setResendMessage(`Delivery email accepted for ${data.to}.`);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "The delivery email was not sent.");
    } finally {
      setResendLoading(false);
    }
  };

  const pushToGitHub = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pushLoading) return;
    setPushLoading(true);
    setPushError(null);
    setPushMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/delivery/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository, branch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "GitHub push failed.");
      setPushMessage(
        `Pushed ${data.commitCount} commits to ${data.repository} (${data.branch}) at ${String(
          data.headCommit
        ).slice(0, 12)}.`
      );
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "GitHub push failed.");
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-foreground">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
            <Link href={`/projects/${projectId}`} className="hover:underline">
              <ArrowLeft className="me-1 inline h-3.5 w-3.5" />
              Project
            </Link>
            <span>/</span>
            <span>Delivery</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground">{projectName}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Verified source archive, generated Git history, deployment guide, and
            retention state. Every number here is read from persisted records or
            object storage metadata.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-sm uppercase">
            {projectStatus.replace(/_/g, " ")}
          </Badge>
          <Button asChild size="sm" variant="outline" className="text-sm">
            <Link href={`/projects/${projectId}/studio`}>
              <FileCode className="me-1.5 h-3.5 w-3.5" />
              Studio
            </Link>
          </Button>
        </div>
      </div>

      {!access.ok && (
        <div className="rounded-md border border-amber-600/30 bg-amber-500/10 p-4 text-sm text-amber-900" role="status">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">Delivery is not available</p>
              <p>{accessMessage(access)}</p>
            </div>
          </div>
        </div>
      )}

      {expired && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">This delivery archive has expired</p>
              <p>
                Retention is {retentionDays} days. The archive
                {deliveryExpiresAt ? ` expired on ${new Date(deliveryExpiresAt).toLocaleString()}` : ""}.
                Download endpoints return HTTP 410; no archive is regenerated from
                memory or replaced with a placeholder.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="font-serif text-base font-bold">
                    Source archive
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {latestVersion
                      ? `Version ${latestVersion.versionNumber}: ${latestVersion.label}`
                      : delivery
                        ? "Initial delivered build"
                        : "No archive recorded"}
                  </p>
                </div>
                {delivery && (
                  <Badge variant="outline" className="font-mono text-sm">
                    {delivery.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {!delivery && !latestVersion && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  There is no delivery row or Studio version for this project. The
                  page does not display a synthetic package.
                </p>
              )}

              {(delivery || latestVersion) && (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded border border-border bg-background p-3">
                    <div className="font-mono text-sm text-muted-foreground">SHA-256</div>
                    <div className="mt-1 break-all font-mono text-sm">
                      {delivery?.sha256 || "not stored for the Studio version row"}
                    </div>
                  </div>
                  <div className="rounded border border-border bg-background p-3">
                    <div className="font-mono text-sm text-muted-foreground">Size</div>
                    <div className="mt-1 font-mono text-sm">
                      {delivery ? formatBytes(delivery.sizeBytes) : "stored in object storage"}
                    </div>
                    {latestVersion && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {latestVersion.fileCount} files recorded in the manifest
                      </p>
                    )}
                  </div>
                  <div className="rounded border border-border bg-background p-3">
                    <div className="font-mono text-sm text-muted-foreground">Created</div>
                    <div className="mt-1">
                      {new Date(latestVersion?.createdAt || delivery!.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded border border-border bg-background p-3">
                    <div className="font-mono text-sm text-muted-foreground">Retention</div>
                    <div className="mt-1">
                      {deliveryExpiresAt
                        ? remainingLabel(deliveryExpiresAt, expired)
                        : `${retentionDays} days`}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {canDownload ? (
                  <Button asChild size="sm" className="text-sm font-bold">
                    <a href={downloadHref}>
                      <Download className="me-1.5 h-4 w-4" />
                      Download source ZIP
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" disabled className="text-sm font-bold">
                    <Download className="me-1.5 h-4 w-4" />
                    Download unavailable
                  </Button>
                )}
                <Button asChild size="sm" variant="outline" className="text-sm">
                  <Link href={`/projects/${projectId}/studio`}>
                    <FileCode className="me-1.5 h-4 w-4" />
                    Open Studio
                  </Link>
                </Button>
              </div>

              <div className="rounded border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                <div className="mb-1 flex items-center gap-1.5 font-bold text-foreground">
                  <FileArchive className="h-4 w-4" />
                  Inside the archive
                </div>
                <p>
                  Source files, `PARITY_REPORT.md`, `EVIDENCE_LEDGER.md`,
                  `LICENSE-NOTICE.md`, `DEPLOY.md`, `DELIVERY_METADATA.json`, and
                  `CHECKSUMS.txt`. The checksum file covers every archived file
                  except itself.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-serif text-base font-bold">
                  Version metadata
                </CardTitle>
                <Badge variant="outline" className="font-mono text-sm">
                  {versions.length} Studio version{versions.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {versions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No Studio versions are recorded. The build delivery above is the
                  only archive.
                </p>
              )}
              {versions.map((version) => {
                const versionExpired = new Date(version.expiresAt).getTime() <= Date.now();
                return (
                  <div
                    key={version.id}
                    className="flex flex-col gap-2 rounded border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold">
                          v{version.versionNumber}
                        </span>
                        <span className="truncate text-sm">{version.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {version.fileCount} files · parity{" "}
                        {version.parityScore != null
                          ? `${(version.parityScore * 100).toFixed(1)}%`
                          : "not measured"}{" "}
                        · {new Date(version.createdAt).toLocaleString()}
                      </p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {remainingLabel(version.expiresAt, versionExpired)}
                      </p>
                    </div>
                    {versionExpired || !access.ok ? (
                      <Button size="sm" variant="outline" disabled className="text-sm">
                        Expired
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline" className="text-sm">
                        <a href={`/api/download/${projectId}?versionId=${version.id}`}>
                          <Download className="me-1.5 h-3.5 w-3.5" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-base font-bold">
                <GitBranch className="h-4 w-4 text-primary" />
                Git archive with history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-sm">
              <p className="text-muted-foreground">
                Generated from the stored Studio version ZIPs. Each accepted version
                becomes one commit with its real creation timestamp; `.git` is
                included in the archive.
              </p>

              {latestGitArchive && (
                <div className="space-y-1 rounded border border-border bg-background p-3">
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    {latestGitArchive.commitCount} commits
                  </div>
                  <p className="break-all font-mono text-sm text-muted-foreground">
                    HEAD {latestGitArchive.headCommit.slice(0, 16)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(latestGitArchive.sizeBytes)} ·{" "}
                    {remainingLabel(latestGitArchive.expiresAt, false)}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-1 text-sm">
                    <a href={`/api/projects/${projectId}/delivery/git/${latestGitArchive.id}`}>
                      <Download className="me-1.5 h-3.5 w-3.5" />
                      Download Git ZIP
                    </a>
                  </Button>
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full text-sm"
                onClick={() => void generateGit()}
                disabled={!canDownload || gitLoading}
              >
                {gitLoading ? (
                  <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="me-1.5 h-4 w-4" />
                )}
                {latestGitArchive ? "Regenerate Git archive" : "Generate Git archive"}
              </Button>

              {generatedUrl && (
                <Button asChild size="sm" className="w-full text-sm">
                  <a href={generatedUrl}>
                    <Download className="me-1.5 h-4 w-4" />
                    Download freshly generated ZIP
                  </a>
                </Button>
              )}
              {gitMessage && (
                <p className="break-words text-sm text-emerald-800" role="status">
                  {gitMessage}
                </p>
              )}
              {gitError && (
                <p className="break-words text-sm text-destructive" role="alert">
                  {gitError}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Git archive generation needs the `git` executable on the server. If
                it is missing, the failure is shown rather than replaced by a
                synthetic repository.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-base font-bold">
                <Mail className="h-4 w-4 text-primary" />
                Delivery email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-sm">
              <p className="text-muted-foreground">
                The delivery email links to this authenticated page. It never embeds
                a long-lived storage credential.
              </p>
              <p className="font-mono text-sm">
                Recipient: {recipientEmail || "none recorded"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-sm"
                onClick={() => void resendEmail()}
                disabled={!canDownload || resendLoading || !recipientEmail}
              >
                {resendLoading ? (
                  <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="me-1.5 h-4 w-4" />
                )}
                Re-send delivery email
              </Button>
              {resendMessage && (
                <p className="text-sm text-emerald-800" role="status">
                  {resendMessage}
                </p>
              )}
              {resendError && (
                <p className="text-sm text-destructive" role="alert">
                  {resendError}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-base font-bold">
                <Server className="h-4 w-4 text-primary" />
                GitHub push
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-sm">
              {!githubEnabled ? (
                <div className="flex items-start gap-2 rounded border border-border bg-muted/20 p-3 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Disabled. Set <code>ENABLE_GITHUB_PUSH=true</code> and a
                    <code> GITHUB_TOKEN</code> to enable pushing an existing empty
                    repository. The default is off.
                  </p>
                </div>
              ) : !githubTokenConfigured ? (
                <p className="text-destructive">
                  The feature flag is on, but `GITHUB_TOKEN` is not configured.
                </p>
              ) : (
                <form className="space-y-2" onSubmit={pushToGitHub}>
                  <label className="block text-sm font-bold" htmlFor="github-repository">
                    Existing repository
                  </label>
                  <input
                    id="github-repository"
                    value={repository}
                    onChange={(event) => setRepository(event.target.value)}
                    placeholder="owner/name"
                    className="w-full rounded-md border border-border bg-background p-2 font-mono text-sm"
                    required
                  />
                  <label className="block text-sm font-bold" htmlFor="github-branch">
                    Branch
                  </label>
                  <input
                    id="github-branch"
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                    className="w-full rounded-md border border-border bg-background p-2 font-mono text-sm"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="w-full text-sm"
                    disabled={!canDownload || pushLoading}
                  >
                    {pushLoading ? (
                      <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="me-1.5 h-4 w-4" />
                    )}
                    Push Git history
                  </Button>
                </form>
              )}
              {pushMessage && (
                <p className="break-words text-sm text-emerald-800" role="status">
                  {pushMessage}
                </p>
              )}
              {pushError && (
                <p className="break-words text-sm text-destructive" role="alert">
                  {pushError}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 font-serif text-base font-bold">
            <Terminal className="h-4 w-4 text-primary" />
            Deployment guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            The same guide is written to `DEPLOY.md` inside the archive. It uses the
            scripts declared in `package.json` and does not assume a framework.
          </p>
          <details className="rounded border border-border bg-background p-3">
            <summary className="cursor-pointer text-sm font-bold">
              Show deployment steps
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-muted-foreground">
              {deployGuide}
            </pre>
          </details>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Retention is controlled by <code>DELIVERY_RETENTION_DAYS</code> (currently{" "}
          {retentionDays}). Expired archives return HTTP 410 from every download
          endpoint and are never replaced with demo content.
        </p>
      </div>
    </div>
  );
}
