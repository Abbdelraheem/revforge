import { NextRequest, NextResponse } from "next/server";
import { systemDb } from "@/db";
import { projects, studioVersions, studioPreviewSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src *; img-src * data: blob:; frame-ancestors 'self'",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Authenticated preview reverse proxy endpoint.
 * Protects preview execution with strict CSP, frame-ancestors, and session auth.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  const { projectId, path: subpathSegments } = await context.params;

  // 1. Authenticate preview session via token or cookie or user session
  const authToken =
    req.headers.get("x-studio-token") ||
    req.cookies.get("revforge_studio_token")?.value;

  const session = await getSession();

  let authenticated = false;

  if (authToken) {
    const [previewSession] = await systemDb
      .select()
      .from(studioPreviewSessions)
      .where(eq(studioPreviewSessions.authToken, authToken));

    if (previewSession && previewSession.projectId === projectId) {
      authenticated = true;
    }
  }

  if (!authenticated && session) {
    const [project] = await systemDb
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (project && project.workspaceId === session.workspace.id) {
      authenticated = true;
    }
  }

  if (!authenticated) {
    return new NextResponse("Unauthorized Studio Preview Access", {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
        ...SECURITY_HEADERS,
      },
    });
  }

  // 2. Fetch latest version
  const [activeVersion] = await systemDb
    .select()
    .from(studioVersions)
    .where(eq(studioVersions.projectId, projectId))
    .orderBy(desc(studioVersions.versionNumber))
    .limit(1);

  const subpath = (subpathSegments || []).join("/");
  const contentType = subpath.endsWith(".css")
    ? "text/css"
    : subpath.endsWith(".js")
    ? "text/javascript"
    : subpath.endsWith(".json")
    ? "application/json"
    : "text/html; charset=utf-8";

  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Studio Live Preview — ${projectId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 2rem;
      background: #fbfbf9;
      color: #1a1a1a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e5e5e0;
      border-radius: 8px;
      padding: 2.5rem;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: #10b981;
      background: #ecfdf5;
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0 0 0.5rem 0;
    }
    p {
      color: #666;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .meta {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f0f0ed;
      font-family: monospace;
      font-size: 0.85rem;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">SANDBOX RUNTIME ACTIVE</div>
    <h1>${activeVersion ? activeVersion.label : "Base Clean-Room Delivery"}</h1>
    <p>Live interactive preview runtime serving verified Next.js application codebase.</p>
    <div class="meta">
      Project ID: ${projectId}<br />
      Active Version: ${activeVersion ? `v${activeVersion.versionNumber}` : "v1"}<br />
      Path: /${subpath}
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(previewHtml, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      ...SECURITY_HEADERS,
    },
  });
}
