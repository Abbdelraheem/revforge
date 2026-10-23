import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
import { withTenant } from "@/db/tenant";
import { studioPreviewSessions } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await context.params;
  const rows = await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    async (tx) =>
      tx
        .select()
        .from(studioPreviewSessions)
        .where(
          and(
            eq(studioPreviewSessions.id, sessionId),
            eq(studioPreviewSessions.workspaceId, session.workspace.id)
          )
        )
        .limit(1)
  );

  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Preview session not found." }, { status: 404 });

  return NextResponse.json({
    session: {
      id: row.id,
      projectId: row.projectId,
      versionId: row.versionId,
      status: row.status,
      lastError: row.lastError,
      buildLogs: row.buildLogs,
      containerId: row.containerId,
      internalPort: row.internalPort,
      heartbeatAt: row.heartbeatAt,
      startedAt: row.startedAt,
      stoppedAt: row.stoppedAt,
      expiresAt: row.expiresAt,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await context.params;
  const rows = await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    async (tx) =>
      tx
        .select({ id: studioPreviewSessions.id, projectId: studioPreviewSessions.projectId })
        .from(studioPreviewSessions)
        .where(
          and(
            eq(studioPreviewSessions.id, sessionId),
            eq(studioPreviewSessions.workspaceId, session.workspace.id)
          )
        )
        .limit(1)
  );

  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Preview session not found." }, { status: 404 });

  const data = await loadStudioRouteData(session, row.projectId);
  const auth = authorizeStudio({
    session,
    project: data.project,
    orders: data.orders,
    balanceCents: data.balanceCents,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    async (tx) =>
      tx
        .update(studioPreviewSessions)
        .set({ status: "stopping" })
        .where(eq(studioPreviewSessions.id, sessionId))
  );

  return NextResponse.json({ session: { id: sessionId, status: "stopping" } });
}
