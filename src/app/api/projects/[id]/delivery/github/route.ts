import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fflate from "fflate";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/db/tenant";
import { auditLog } from "@/db/schema";
import { loadDeliveryContext, versionExpiresAt } from "@/lib/delivery/context";
import { authorizeDownload } from "@/lib/delivery/authorize";
import { buildGitArchive, type GitSnapshot } from "@/lib/delivery/git-archive";
import { storage } from "@/lib/storage";
import { env } from "@/env";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.ENABLE_GITHUB_PUSH) {
    return NextResponse.json(
      {
        error:
          "GitHub push is disabled. Set ENABLE_GITHUB_PUSH=true and GITHUB_TOKEN to enable it.",
        code: "github_push_disabled",
      },
      { status: 403 }
    );
  }

  const token = env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN is not configured." },
      { status: 503 }
    );
  }

  let body: { repository?: unknown; branch?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const repository =
    typeof body.repository === "string" ? body.repository.trim() : "";
  const branch = typeof body.branch === "string" ? body.branch.trim() : "main";

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    return NextResponse.json(
      { error: "Repository must be owner/name using safe characters." },
      { status: 400 }
    );
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes("..")) {
    return NextResponse.json({ error: "Invalid branch name." }, { status: 400 });
  }

  const { id: projectId } = await params;
  const context = await loadDeliveryContext(session, projectId);
  if (!context) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const auth = authorizeDownload({
    session,
    project: context.project,
    orders: context.orders,
    delivery: context.delivery,
    now: Date.now(),
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const latestVersion = context.versions[0] || null;
  const sourceExpiry = latestVersion
    ? versionExpiresAt(latestVersion, context.retentionDays)
    : context.delivery?.expiresAt;

  if (!sourceExpiry || sourceExpiry.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "The delivery archive has expired and cannot be pushed." },
      { status: 410 }
    );
  }

  let workspace: string | null = null;
  try {
    const snapshots: GitSnapshot[] = [];
    if (context.versions.length > 0) {
      for (const version of [...context.versions].reverse()) {
        snapshots.push({
          label: version.label,
          createdAt: version.createdAt,
          zip: await storage.getObject(version.zipStorageKey),
        });
      }
    } else if (context.delivery) {
      snapshots.push({
        label: "Initial delivered build",
        createdAt: context.delivery.createdAt,
        zip: await storage.getObject(context.delivery.storageKey),
      });
    }

    const archive = await buildGitArchive(snapshots);
    workspace = await fs.mkdtemp(path.join(os.tmpdir(), "revforge-push-"));
    const entries = fflate.unzipSync(new Uint8Array(archive.buffer));
    for (const [entryPath, bytes] of Object.entries(entries)) {
      if (entryPath.endsWith("/")) continue;
      const normalized = entryPath.replace(/\\/g, "/");
      if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
        throw new Error("The generated Git archive contains an unsafe path.");
      }
      const fullPath = path.join(workspace, normalized);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, bytes);
    }

    const remote = `https://x-access-token:${token}@github.com/${repository}.git`;
    const { stdout } = await execFileAsync(
      "git",
      ["push", remote, `HEAD:refs/heads/${branch}`],
      { cwd: workspace, maxBuffer: 32 * 1024 * 1024, windowsHide: true }
    );

    await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      (tx) =>
        tx.insert(auditLog).values({
          workspaceId: session.workspace.id,
          userId: session.user.id,
          actorType: "user",
          action: "delivery.github_push",
          resourceType: "projects",
          resourceId: projectId,
          metadata: {
            repository,
            branch,
            headCommit: archive.headCommit,
            commitCount: archive.commitCount,
            output: stdout.trim().slice(0, 1000),
          },
        })
    );

    return NextResponse.json({
      pushed: true,
      repository,
      branch,
      headCommit: archive.headCommit,
      commitCount: archive.commitCount,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const safe = raw
      .replaceAll(token, "***")
      .replace(/x-access-token:[^@]+@/g, "x-access-token:***@");

    return NextResponse.json(
      {
        error: safe || "GitHub push failed.",
        code: /rejected|non-fast-forward|fetch first/i.test(safe)
          ? "non_fast_forward"
          : "push_failed",
      },
      { status: /rejected|non-fast-forward|fetch first/i.test(safe) ? 409 : 502 }
    );
  } finally {
    if (workspace) {
      await fs.rm(workspace, { recursive: true, force: true }).catch(() => {});
    }
  }
}
