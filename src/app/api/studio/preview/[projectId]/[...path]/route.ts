import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { unzipSync } from "fflate";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src *; img-src * data: blob:; frame-ancestors 'self'",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
};

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".cjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function errorResponse(status: number, message: string): NextResponse {
  return new NextResponse(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...SECURITY_HEADERS,
    },
  });
}

function resolvePreviewPath(segments: string[]): string | null {
  const joined = segments.filter((segment) => segment.length > 0).join("/");
  const requested = joined.length > 0 ? joined : "index.html";
  const normalized = path.posix.normalize(
    requested.endsWith("/") ? `${requested}index.html` : requested
  );

  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.includes("\0")
  ) {
    return null;
  }

  return normalized;
}

/**
 * Authenticated preview proxy. Every request re-runs the same pure Studio
 * authorization gate used by the edit/version APIs, loads the immutable
 * version archive from object storage, and serves the requested file from it.
 * Nothing is synthesised when the archive has no such file.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  const { projectId, path: subpathSegments } = await context.params;
  const session = await getSession();

  if (!session) {
    return errorResponse(401, "Unauthorized Studio Preview Access");
  }

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

  const requestedKey = req.nextUrl.searchParams.get("version");
  const activeVersion = requestedKey
    ? data.versions.find(
        (version) =>
          version.id === requestedKey || version.zipStorageKey === requestedKey
      )
    : data.versions[0];

  if (!activeVersion) {
    return errorResponse(404, "No Studio version exists for this project.");
  }

  const relativePath = resolvePreviewPath(subpathSegments || []);
  if (!relativePath) {
    return errorResponse(400, "Invalid preview path.");
  }

  let archive: Buffer;
  try {
    archive = await storage.getObject(activeVersion.zipStorageKey);
  } catch {
    return errorResponse(502, "The Studio version archive could not be loaded.");
  }

  let file: Uint8Array | undefined;
  try {
    const entries = unzipSync(new Uint8Array(archive));
    file = entries[relativePath];
  } catch {
    return errorResponse(502, "The Studio version archive is not readable.");
  }

  if (!file) {
    return errorResponse(404, `Preview file not found: /${relativePath}`);
  }

  const contentType =
    CONTENT_TYPES[path.posix.extname(relativePath).toLowerCase()] ||
    "application/octet-stream";

  return new NextResponse(Buffer.from(file), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      ...SECURITY_HEADERS,
    },
  });
}
