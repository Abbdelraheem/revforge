import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
import { withTenant } from "@/db/tenant";
import { studioPreviewSessions } from "@/db/schema";
import { env } from "@/env";
import { PREVIEW_HARD_TTL_MS, PREVIEW_IDLE_TTL_MS } from "@/lib/studio/preview-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return jsonError(400, "projectId is required.");

  try {
    const data = await loadStudioRouteData(session, projectId);
    const auth = authorizeStudio({
      session,
      project: data.project,
      orders: data.orders,
      balanceCents: data.balanceCents,
    });
    if (!auth.ok) return jsonError(auth.status, auth.error || "Studio access denied.");

    const sessions = await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      async (tx) =>
        tx
          .select()
          .from(studioPreviewSessions)
          .where(eq(studioPreviewSessions.projectId, projectId))
          .orderBy(desc(studioPreviewSessions.createdAt))
          .limit(20)
    );

    return NextResponse.json({
      sessions: sessions.map((row) => ({
        id: row.id,
        versionId: row.versionId,
        status: row.status,
        lastError: row.lastError,
        buildLogs: row.buildLogs,
        heartbeatAt: row.heartbeatAt,
        startedAt: row.startedAt,
        expiresAt: row.expiresAt,
      })),
    });
  } catch (error) {
    return jsonError(
      500,
      error instanceof Error ? error.message : "Failed to load preview sessions."
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  try {
    const body = await req.json();
    const projectId = String(body.projectId || "");
    const versionId = body.versionId ? String(body.versionId) : null;
    if (!projectId) return jsonError(400, "projectId is required.");

    const data = await loadStudioRouteData(session, projectId);
    const auth = authorizeStudio({
      session,
      project: data.project,
      orders: data.orders,
      balanceCents: data.balanceCents,
    });
    if (!auth.ok) return jsonError(auth.status, auth.error || "Studio access denied.");

    const version = versionId
      ? data.versions.find((entry) => entry.id === versionId)
      : data.versions[0];
    if (!version) return jsonError(404, "No Studio version exists for this project.");

    const active = await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      async (tx) =>
        tx
          .select({ id: studioPreviewSessions.id })
          .from(studioPreviewSessions)
          .where(
            and(
              eq(studioPreviewSessions.workspaceId, session.workspace.id),
              inArray(studioPreviewSessions.status, [
                "requested",
                "building",
                "starting",
                "ready",
                "stopping",
              ])
            )
          )
    );

    if (active.length >= env.PREVIEW_MAX_CONCURRENT) {
      return jsonError(
        429,
        `Preview limit reached (${env.PREVIEW_MAX_CONCURRENT} concurrent sessions). Stop an existing preview first.`
      );
    }

    const now = Date.now();
    const [created] = await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      async (tx) =>
        tx
          .insert(studioPreviewSessions)
          .values({
            projectId,
            workspaceId: session.workspace.id,
            versionId: version.id,
            status: "requested",
            authToken: crypto.randomUUID(),
            expiresAt: new Date(now + PREVIEW_HARD_TTL_MS),
          })
          .returning()
    );

    return NextResponse.json(
      {
        session: {
          id: created?.id,
          versionId: version.id,
          status: created?.status ?? "requested",
          expiresAt: created?.expiresAt,
          idleTtlSeconds: PREVIEW_IDLE_TTL_MS / 1000,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    return jsonError(
      500,
      error instanceof Error ? error.message : "Failed to request preview."
    );
  }
}
