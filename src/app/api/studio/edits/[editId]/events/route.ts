import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { withTenant } from "@/db/tenant";
import { studioEdits } from "@/db/schema";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["committed", "failed", "refunded"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ editId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { editId } = await params;

  const [edit] = await withTenant(
    { userId: session.user.id, workspaceId: session.workspace.id },
    (tx) =>
      tx
        .select()
        .from(studioEdits)
        .where(
          and(
            eq(studioEdits.id, editId),
            eq(studioEdits.workspaceId, session.workspace.id)
          )
        )
        .limit(1)
  );

  if (!edit) {
    return new Response(JSON.stringify({ error: "Edit not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const routeData = await loadStudioRouteData(session, edit.projectId);
  const auth = authorizeStudio({
    session,
    project: routeData.project,
    orders: routeData.orders,
    balanceCents: routeData.balanceCents,
  });
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let lastPayload = "";
      let idleCount = 0;

      const close = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // Already closed by the client.
          }
        }
      };

      req.signal.addEventListener("abort", close);
      try {
        controller.enqueue(enc.encode("retry: 3000\n\n"));
      } catch {
        close();
        return;
      }

      while (!closed) {
        const [row] = await withTenant(
          { userId: session.user.id, workspaceId: session.workspace.id },
          (tx) =>
            tx
              .select({
                id: studioEdits.id,
                status: studioEdits.status,
                promptRaw: studioEdits.promptRaw,
                tokensHeldCents: studioEdits.tokensHeldCents,
                tokensSettledCents: studioEdits.tokensSettledCents,
                resultingVersionId: studioEdits.resultingVersionId,
                failureReason: studioEdits.failureReason,
                diffStat: studioEdits.diffStat,
                cancelRequested: studioEdits.cancelRequested,
                finishedAt: studioEdits.finishedAt,
              })
              .from(studioEdits)
              .where(
                and(
                  eq(studioEdits.id, editId),
                  eq(studioEdits.workspaceId, session.workspace.id)
                )
              )
              .limit(1)
        );

        if (!row) {
          close();
          return;
        }

        const payload = JSON.stringify({
          ...row,
          finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
        });

        try {
          if (payload !== lastPayload) {
            lastPayload = payload;
            idleCount = 0;
            controller.enqueue(
              enc.encode(`event: status\ndata: ${payload}\n\n`)
            );
          } else if (++idleCount % 15 === 0) {
            controller.enqueue(enc.encode(": hb\n\n"));
          }
        } catch {
          close();
          return;
        }

        if (TERMINAL.has(row.status)) {
          close();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
