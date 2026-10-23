import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
import { systemDb } from "@/db";
import {
  previewTunnelRequests,
  studioPreviewSessions,
} from "@/db/schema";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREVIEW_CSP =
  "sandbox allow-scripts allow-forms allow-same-origin; default-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'";

const STRIPPED_REQUEST_HEADERS = new Set([
  "cookie",
  "authorization",
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
]);

function errorResponse(
  status: number,
  message: string,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    { error: message, ...extra },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  const { projectId, path: subpathSegments } = await context.params;
  const session = await getSession();
  if (!session) return errorResponse(401, "Unauthorized Studio Preview Access");

  let data;
  try {
    data = await loadStudioRouteData(session, projectId);
  } catch {
    return errorResponse(500, "Failed to load the Studio project.");
  }

  const auth = authorizeStudio({
    session,
    project: data.project,
    orders: data.orders,
    balanceCents: data.balanceCents,
  });
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error || "Studio access denied.");
  }

  const requestedVersion = req.nextUrl.searchParams.get("version");
  const version = requestedVersion
    ? data.versions.find((entry) => entry.id === requestedVersion)
    : data.versions[0];

  if (!version) {
    return errorResponse(404, "No Studio version exists for this project.");
  }

  const sessions = await systemDb
    .select()
    .from(studioPreviewSessions)
    .where(
      and(
        eq(studioPreviewSessions.projectId, projectId),
        eq(studioPreviewSessions.versionId, version.id)
      )
    )
    .orderBy(desc(studioPreviewSessions.createdAt))
    .limit(1);

  const preview = sessions[0];
  if (!preview) {
    return errorResponse(
      503,
      "No preview session has been requested for this version.",
      { state: "stopped", fallback: "screenshots" }
    );
  }

  if (preview.status === "error") {
    return errorResponse(
      503,
      preview.lastError || "Preview failed to start.",
      { state: "error", fallback: "screenshots", sessionId: preview.id }
    );
  }

  if (preview.status !== "ready") {
    return errorResponse(
      503,
      `Preview is ${preview.status}.`,
      { state: preview.status, fallback: "state", sessionId: preview.id }
    );
  }

  if (preview.expiresAt.getTime() <= Date.now()) {
    return errorResponse(410, "Preview session expired.", {
      state: "error",
      fallback: "screenshots",
      sessionId: preview.id,
    });
  }

  const relativePath = (subpathSegments || [])
    .filter((segment) => segment.length > 0)
    .join("/");
  const forwardPath = `/${relativePath}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  });
  headers["x-revforge-preview-session"] = preview.id;

  const bodyBuffer =
    req.method === "GET" || req.method === "HEAD"
      ? Buffer.alloc(0)
      : Buffer.from(await req.arrayBuffer());

  const timeoutMs = env.PREVIEW_REQUEST_TIMEOUT_MS;
  const [tunnelRequest] = await systemDb
    .insert(previewTunnelRequests)
    .values({
      sessionId: preview.id,
      method: req.method,
      path: forwardPath,
      requestHeaders: headers,
      requestBody: bodyBuffer.length > 0 ? bodyBuffer.toString("base64") : null,
      expiresAt: new Date(Date.now() + timeoutMs),
    })
    .returning({ id: previewTunnelRequests.id });

  if (!tunnelRequest) {
    return errorResponse(502, "Failed to allocate a preview tunnel request.");
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [row] = await systemDb
      .select()
      .from(previewTunnelRequests)
      .where(eq(previewTunnelRequests.id, tunnelRequest.id))
      .limit(1);

    if (row?.status === "completed") {
      const responseBody = row.responseBody
        ? Buffer.from(row.responseBody, "base64")
        : Buffer.alloc(0);

      if (responseBody.length > env.PREVIEW_MAX_RESPONSE_BYTES) {
        return errorResponse(502, "Preview response exceeded the size limit.");
      }

      const responseHeaders: Record<string, string> = {
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": PREVIEW_CSP,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      };
      for (const [key, value] of Object.entries(row.responseHeaders || {})) {
        if (
          !["content-security-policy", "x-frame-options", "set-cookie"].includes(
            key.toLowerCase()
          )
        ) {
          responseHeaders[key] = value;
        }
      }

      return new NextResponse(responseBody, {
        status: row.responseStatus || 502,
        headers: responseHeaders,
      });
    }

    if (row?.status === "expired" || row?.status === "claimed") {
      // A claimed request still has a chance to be answered before the
      // deadline. Only an explicit expiry is terminal.
      if (row.status === "expired") break;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await systemDb
    .update(previewTunnelRequests)
    .set({ status: "expired", completedAt: new Date() })
    .where(
      and(
        eq(previewTunnelRequests.id, tunnelRequest.id),
        eq(previewTunnelRequests.status, "pending")
      )
    );

  return errorResponse(
    504,
    "Preview worker did not answer before the request timeout.",
    {
      state: preview.status,
      fallback: "screenshots",
      sessionId: preview.id,
      lastError: preview.lastError,
    }
  );
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  return proxy(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  return proxy(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  return proxy(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  return proxy(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  return proxy(req, context);
}
