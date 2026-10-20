import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, jobEvents, buildJobs } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isTerminalEvent(eventType: string): boolean {
  return [
    "build.completed",
    "build.failed",
    "build.delivered",
    "build.delivered_partial",
  ].includes(eventType);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const session = await getSession();

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Tenant and ownership verification
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.workspaceId, session.workspace.id)
      )
    );

  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check last event id from header or query param
  let last = Number(
    req.headers.get("last-event-id") ??
      req.nextUrl.searchParams.get("after") ??
      0
  );
  if (!Number.isSafeInteger(last) || last < 0) last = 0;

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
        }
      };

      req.signal.addEventListener("abort", close);
      controller.enqueue(enc.encode("retry: 3000\n\n"));

      let idleCount = 0;

      while (!closed) {
        // Query database events strictly ordered by id
        const rows = await db
          .select()
          .from(jobEvents)
          .where(
            and(
              eq(jobEvents.workspaceId, session.workspace.id),
              gt(jobEvents.id, last)
            )
          )
          .limit(100);

        for (const e of rows) {
          last = e.id;
          idleCount = 0;
          controller.enqueue(
            enc.encode(
              `id: ${e.id}\nevent: ${e.type}\ndata: ${JSON.stringify(e.payload)}\n\n`
            )
          );
          if (isTerminalEvent(e.type)) {
            close();
            return;
          }
        }

        // Heartbeat comment every 15s of idle
        if (rows.length === 0 && ++idleCount % 15 === 0) {
          controller.enqueue(enc.encode(": hb\n\n"));
        }

        await new Promise((r) => setTimeout(r, 1000));
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
