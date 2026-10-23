import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { systemDb } from "@/db";
import {
  previewTunnelRequests,
  studioPreviewSessions,
} from "@/db/schema";
import { nextPreviewState, type PreviewState } from "@/lib/studio/preview-runtime";
import { verifyTunnelToken } from "@/lib/studio/tunnel-token";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function authenticate(req: NextRequest): { workerId: string } | null {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const payload = verifyTunnelToken(token);
    return payload ? { workerId: payload.workerId } : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth) return json(401, { error: "Invalid or expired tunnel token." });

  if (!process.env.PREVIEW_TUNNEL_SECRET) {
    return json(503, {
      error: "PREVIEW_TUNNEL_SECRET is not configured on the web tier.",
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "JSON body is required." });
  }

  const action = String(body.action || "");

  if (action === "poll") {
    const [candidate] = await systemDb
      .select({
        id: previewTunnelRequests.id,
        sessionId: previewTunnelRequests.sessionId,
        method: previewTunnelRequests.method,
        path: previewTunnelRequests.path,
        requestHeaders: previewTunnelRequests.requestHeaders,
        requestBody: previewTunnelRequests.requestBody,
        internalPort: studioPreviewSessions.internalPort,
        expiresAt: previewTunnelRequests.expiresAt,
      })
      .from(previewTunnelRequests)
      .innerJoin(
        studioPreviewSessions,
        eq(previewTunnelRequests.sessionId, studioPreviewSessions.id)
      )
      .where(
        and(
          eq(previewTunnelRequests.status, "pending"),
          eq(studioPreviewSessions.status, "ready")
        )
      )
      .orderBy(asc(previewTunnelRequests.createdAt))
      .limit(1);

    if (!candidate || candidate.expiresAt.getTime() <= Date.now()) {
      if (candidate) {
        await systemDb
          .update(previewTunnelRequests)
          .set({ status: "expired", completedAt: new Date() })
          .where(eq(previewTunnelRequests.id, candidate.id));
      }
      return json(204, { request: null });
    }

    const [claimed] = await systemDb
      .update(previewTunnelRequests)
      .set({ status: "claimed", workerId: auth.workerId, claimedAt: new Date() })
      .where(
        and(
          eq(previewTunnelRequests.id, candidate.id),
          eq(previewTunnelRequests.status, "pending")
        )
      )
      .returning({ id: previewTunnelRequests.id });

    if (!claimed) return json(204, { request: null });

    return json(200, {
      request: {
        id: candidate.id,
        sessionId: candidate.sessionId,
        method: candidate.method,
        path: candidate.path,
        headers: candidate.requestHeaders,
        bodyBase64: candidate.requestBody,
        internalPort: candidate.internalPort,
      },
    });
  }

  if (action === "respond") {
    const requestId = String(body.requestId || "");
    if (!requestId) return json(400, { error: "requestId is required." });

    const responseHeaders =
      body.headers && typeof body.headers === "object"
        ? (body.headers as Record<string, string>)
        : {};
    const responseBody =
      typeof body.bodyBase64 === "string" ? body.bodyBase64 : "";

    await systemDb
      .update(previewTunnelRequests)
      .set({
        status: "completed",
        responseStatus:
          Number.isInteger(body.status) && Number(body.status) >= 100
            ? Number(body.status)
            : 502,
        responseHeaders,
        responseBody,
        error: typeof body.error === "string" ? body.error : null,
        completedAt: new Date(),
      })
      .where(eq(previewTunnelRequests.id, requestId));

    return json(200, { ok: true });
  }

  if (action === "claim-session") {
    const [candidate] = await systemDb
      .select()
      .from(studioPreviewSessions)
      .where(eq(studioPreviewSessions.status, "requested"))
      .orderBy(asc(studioPreviewSessions.createdAt))
      .limit(1);

    if (!candidate) return json(204, { session: null });

    const [claimed] = await systemDb
      .update(studioPreviewSessions)
      .set({
        status: "building",
        heartbeatAt: new Date(),
        startedAt: new Date(),
        lastError: null,
        buildLogs: null,
      })
      .where(
        and(
          eq(studioPreviewSessions.id, candidate.id),
          eq(studioPreviewSessions.status, "requested")
        )
      )
      .returning();

    if (!claimed) return json(204, { session: null });

    return json(200, {
      session: {
        id: claimed.id,
        workspaceId: claimed.workspaceId,
        projectId: claimed.projectId,
        versionId: claimed.versionId,
        status: claimed.status,
        expiresAt: claimed.expiresAt,
      },
    });
  }

  if (action === "update-session") {
    const sessionId = String(body.sessionId || "");
    if (!sessionId) return json(400, { error: "sessionId is required." });

    const [current] = await systemDb
      .select()
      .from(studioPreviewSessions)
      .where(eq(studioPreviewSessions.id, sessionId))
      .limit(1);
    if (!current) return json(404, { error: "Preview session not found." });

    const event = body.event;
    const nextState: PreviewState = event
      ? nextPreviewState(current.status as PreviewState, event as never)
      : (current.status as PreviewState);

    await systemDb
      .update(studioPreviewSessions)
      .set({
        status: nextState,
        containerId:
          typeof body.containerId === "string" ? body.containerId : current.containerId,
        internalPort:
          Number.isInteger(body.internalPort) && Number(body.internalPort) > 0
            ? Number(body.internalPort)
            : current.internalPort,
        lastError:
          typeof body.lastError === "string" ? body.lastError : current.lastError,
        buildLogs:
          typeof body.buildLogs === "string" ? body.buildLogs : current.buildLogs,
        heartbeatAt: new Date(),
        startedAt:
          nextState === "ready" && !current.startedAt ? new Date() : current.startedAt,
        stoppedAt: nextState === "stopped" ? new Date() : current.stoppedAt,
      })
      .where(eq(studioPreviewSessions.id, sessionId));

    return json(200, { status: nextState });
  }

  if (action === "heartbeat") {
    const sessionId = String(body.sessionId || "");
    if (!sessionId) return json(400, { error: "sessionId is required." });

    const now = Date.now();
    const [current] = await systemDb
      .select({ expiresAt: studioPreviewSessions.expiresAt })
      .from(studioPreviewSessions)
      .where(eq(studioPreviewSessions.id, sessionId))
      .limit(1);

    if (current) {
      const idleExtension = Math.min(
        current.expiresAt.getTime(),
        now + env.PREVIEW_IDLE_TTL_MIN * 60 * 1000
      );
      await systemDb
        .update(studioPreviewSessions)
        .set({ heartbeatAt: new Date(), expiresAt: new Date(idleExtension) })
        .where(eq(studioPreviewSessions.id, sessionId));
    }

    return json(200, { ok: true });
  }

  if (action === "stop-session") {
    const sessionId = String(body.sessionId || "");
    const [current] = await systemDb
      .select()
      .from(studioPreviewSessions)
      .where(eq(studioPreviewSessions.id, sessionId))
      .limit(1);
    if (!current) return json(404, { error: "Preview session not found." });

    const nextState = nextPreviewState(current.status as PreviewState, "stop_requested");
    await systemDb
      .update(studioPreviewSessions)
      .set({ status: nextState, heartbeatAt: new Date() })
      .where(eq(studioPreviewSessions.id, sessionId));

    return json(200, { status: nextState, containerId: current.containerId });
  }

  return json(400, { error: `Unknown tunnel action '${action}'.` });
}

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth) return json(401, { error: "Invalid or expired tunnel token." });

  const sessions = await systemDb
    .select({
      id: studioPreviewSessions.id,
      status: studioPreviewSessions.status,
    })
    .from(studioPreviewSessions)
    .where(
      inArray(studioPreviewSessions.status, [
        "requested",
        "building",
        "starting",
        "ready",
        "stopping",
        "stopped",
        "error",
      ])
    )
    .limit(50);

  return json(200, { workerId: auth.workerId, sessions });
}
