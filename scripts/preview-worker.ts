import "dotenv/config";
import "../scripts/smoke-env";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { and, asc, eq, inArray } from "drizzle-orm";
import { systemDb } from "../src/db";
import {
  studioPreviewSessions,
  studioVersions,
} from "../src/db/schema";
import { storage } from "../src/lib/storage";
import {
  startPreview,
  stopPreview,
} from "../src/lib/studio/preview-runtime";
import { signTunnelToken } from "../src/lib/studio/tunnel-token";
import { env } from "../src/env";

const API_URL = env.APP_URL.replace(/\/$/, "");
const WORKER_ID = process.env.PREVIEW_WORKER_ID || `worker-${os.hostname()}`;
const workspaceRoot = path.join(os.tmpdir(), "revforge-previews");
const active = new Map<string, { workspaceDir: string; containerId: string; port: number }>();

function log(message: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ at: new Date().toISOString(), workerId: WORKER_ID, message, ...extra }));
}

function token(): string {
  if (!process.env.PREVIEW_TUNNEL_SECRET) {
    throw new Error("PREVIEW_TUNNEL_SECRET is required on the preview worker.");
  }
  return signTunnelToken(WORKER_ID);
}

async function api(action: string, body: Record<string, unknown> = {}): Promise<any> {
  const response = await fetch(`${API_URL}/api/worker/tunnel`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(25_000),
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Tunnel ${action} failed with ${response.status}`);
  }
  return payload;
}

function safeRelPath(rel: string): string | null {
  const normalized = path.posix.normalize(rel.replace(/\\/g, "/"));
  if (
    normalized.startsWith("../") ||
    normalized.includes("\0") ||
    path.isAbsolute(normalized)
  ) {
    return null;
  }
  return normalized;
}

async function restoreWorkspace(sessionId: string, versionId: string): Promise<string> {
  const [version] = await systemDb
    .select()
    .from(studioVersions)
    .where(eq(studioVersions.id, versionId))
    .limit(1);

  if (!version) throw new Error(`Studio version ${versionId} not found.`);

  const dir = path.join(workspaceRoot, sessionId);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });

  const archive = await storage.getObject(version.zipStorageKey);
  const entries = unzipSync(new Uint8Array(archive));
  for (const [rel, bytes] of Object.entries(entries)) {
    if (rel.endsWith("/")) continue;
    const safe = safeRelPath(rel);
    if (!safe) continue;
    const target = path.join(dir, safe);
    if (!target.startsWith(dir + path.sep)) continue;
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, Buffer.from(bytes));
  }

  return dir;
}

async function waitForServer(port: number, timeoutMs = 20_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status < 500) return true;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function processRequest(request: any): Promise<void> {
  const body = request.bodyBase64
    ? Buffer.from(request.bodyBase64, "base64")
    : undefined;
  const headers = { ...(request.headers || {}) };
  delete headers.host;
  delete headers.cookie;
  delete headers.authorization;

  try {
    const response = await fetch(`http://127.0.0.1:${request.internalPort}${request.path}`, {
      method: request.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(env.PREVIEW_REQUEST_TIMEOUT_MS),
    });

    const responseBody = Buffer.from(await response.arrayBuffer());
    if (responseBody.length > env.PREVIEW_MAX_RESPONSE_BYTES) {
      await api("respond", {
        requestId: request.id,
        status: 502,
        headers: { "content-type": "text/plain" },
        bodyBase64: Buffer.from("Preview response exceeded the size limit.").toString("base64"),
        error: "size_limit",
      });
      return;
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "content-length", "transfer-encoding", "set-cookie"].includes(key)) {
        responseHeaders[key] = value;
      }
    });

    await api("respond", {
      requestId: request.id,
      status: response.status,
      headers: responseHeaders,
      bodyBase64: responseBody.toString("base64"),
    });
  } catch (error) {
    await api("respond", {
      requestId: request.id,
      status: 502,
      headers: { "content-type": "text/plain" },
      bodyBase64: Buffer.from("Preview worker could not reach the container.").toString("base64"),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function startClaimed(session: any): Promise<void> {
  try {
    const workspaceDir = await restoreWorkspace(session.id, session.versionId);
    const started = await startPreview(
      {
        projectId: session.projectId,
        versionId: session.versionId,
        workspaceDir,
        sessionId: session.id,
      },
      { env: { NODE_ENV: process.env.NODE_ENV, SANDBOX_RUNTIME: process.env.SANDBOX_RUNTIME } }
    );

    await api("update-session", {
      sessionId: session.id,
      event: "build_succeeded",
      containerId: started.containerId,
      internalPort: started.internalPort,
    });

    const ready = await waitForServer(started.internalPort);
    if (!ready) {
      await stopPreview(started.containerId).catch(() => undefined);
      await api("update-session", {
        sessionId: session.id,
        event: "start_failed",
        containerId: started.containerId,
        internalPort: started.internalPort,
        lastError: "Preview server did not answer within 20 seconds.",
      });
      await fs.rm(workspaceDir, { recursive: true, force: true }).catch(() => undefined);
      return;
    }

    active.set(session.id, {
      workspaceDir,
      containerId: started.containerId,
      port: started.internalPort,
    });

    await api("update-session", {
      sessionId: session.id,
      event: "start_succeeded",
      containerId: started.containerId,
      internalPort: started.internalPort,
    });
    log("preview ready", { sessionId: session.id, port: started.internalPort });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await api("update-session", {
      sessionId: session.id,
      event: "build_failed",
      lastError: message,
      buildLogs: message,
    }).catch(() => undefined);
    log("preview failed", { sessionId: session.id, error: message });
  }
}

async function stopSession(session: { id: string; containerId: string | null }): Promise<void> {
  const tracked = active.get(session.id);
  if (tracked) {
    await stopPreview(tracked.containerId).catch(() => undefined);
    await fs.rm(tracked.workspaceDir, { recursive: true, force: true }).catch(() => undefined);
    active.delete(session.id);
  } else if (session.containerId) {
    await stopPreview(session.containerId).catch(() => undefined);
  }

  await api("update-session", { sessionId: session.id, event: "stopped" }).catch(() => undefined);
  log("preview stopped", { sessionId: session.id });
}

async function tick(): Promise<void> {
  await fs.mkdir(workspaceRoot, { recursive: true });

  const stopping = await systemDb
    .select()
    .from(studioPreviewSessions)
    .where(eq(studioPreviewSessions.status, "stopping"))
    .limit(5);
  for (const session of stopping) await stopSession(session);

  const readySessions = await systemDb
    .select()
    .from(studioPreviewSessions)
    .where(eq(studioPreviewSessions.status, "ready"))
    .limit(50);
  const now = Date.now();
  for (const session of readySessions) {
    const hardExpired = session.expiresAt.getTime() <= now;
    const idleExpired =
      !session.heartbeatAt || now - session.heartbeatAt.getTime() > env.PREVIEW_IDLE_TTL_MIN * 60 * 1000;
    if (hardExpired || idleExpired) {
      await systemDb
        .update(studioPreviewSessions)
        .set({ status: "stopping" })
        .where(eq(studioPreviewSessions.id, session.id));
      await stopSession({ id: session.id, containerId: session.containerId });
    } else {
      await api("heartbeat", { sessionId: session.id }).catch(() => undefined);
    }
  }

  const claim = await api("claim-session");
  if (claim?.session) await startClaimed(claim.session);

  for (let i = 0; i < 5; i += 1) {
    const poll = await api("poll");
    if (!poll?.request) break;
    await processRequest(poll.request);
  }
}

async function main() {
  log("preview worker starting", { apiUrl: API_URL });
  if (!process.env.PREVIEW_TUNNEL_SECRET) {
    throw new Error("PREVIEW_TUNNEL_SECRET is required.");
  }

  let running = true;
  process.on("SIGINT", () => {
    running = false;
  });
  process.on("SIGTERM", () => {
    running = false;
  });

  while (running) {
    try {
      await tick();
    } catch (error) {
      log("worker tick failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  for (const [sessionId, tracked] of active) {
    await stopPreview(tracked.containerId).catch(() => undefined);
    await fs.rm(tracked.workspaceDir, { recursive: true, force: true }).catch(() => undefined);
    await api("update-session", { sessionId, event: "stopped" }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
