import { type ExtractorResult, ExtractorResultSchema } from "./types";

export interface HarEntry {
  request: {
    method: string;
    url: string;
    headers: Array<{ name: string; value: string }>;
    queryString?: Array<{ name: string; value: string }>;
    postData?: { mimeType: string; text?: string };
  };
  response: {
    status: number;
    statusText?: string;
    headers: Array<{ name: string; value: string }>;
    content?: { mimeType: string; size?: number; text?: string };
  };
}

export interface HarData {
  log: {
    version: string;
    creator?: { name: string; version: string };
    entries: HarEntry[];
  };
}

/**
 * Extracts network interactions, routes, and API schemas from a HAR (HTTP Archive) file.
 */
export function extractHarTarget(harContent: string | HarData): ExtractorResult {
  const data: HarData = typeof harContent === "string" ? JSON.parse(harContent) : harContent;

  if (!data.log || !Array.isArray(data.log.entries)) {
    throw new Error("Invalid HAR format: missing log.entries array");
  }

  const routes = new Map<string, { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; authRequired: boolean }>();
  const endpoints = new Set<string>();
  const frameworkHints = new Set<string>();

  for (const entry of data.log.entries) {
    try {
      const url = new URL(entry.request.url);
      const method = (entry.request.method.toUpperCase() as any) || "GET";
      const hasAuth = entry.request.headers.some(
        (h) => h.name.toLowerCase() === "authorization" || h.name.toLowerCase() === "cookie"
      );

      // Detect server frameworks from response headers
      for (const h of entry.response.headers) {
        const hName = h.name.toLowerCase();
        const hVal = h.value.toLowerCase();
        if (hName === "x-powered-by" || hName === "server") {
          if (hVal.includes("express")) frameworkHints.add("Express");
          if (hVal.includes("next.js") || hVal.includes("nextjs")) frameworkHints.add("Next.js");
          if (hVal.includes("cloudflare")) frameworkHints.add("Cloudflare");
          if (hVal.includes("nginx")) frameworkHints.add("Nginx");
          if (hVal.includes("fastapi")) frameworkHints.add("FastAPI");
        }
      }

      const key = `${method} ${url.pathname}`;
      endpoints.add(key);

      if (!routes.has(url.pathname)) {
        routes.set(url.pathname, { method, authRequired: hasAuth });
      }
    } catch {
      // ignore invalid entry URLs
    }
  }

  return ExtractorResultSchema.parse({
    targetType: "har",
    summary: `Extracted ${data.log.entries.length} requests from HAR capture`,
    routes: Array.from(routes.entries()).slice(0, 100).map(([pathname, meta]) => ({
      path: pathname,
      method: meta.method,
      authRequired: meta.authRequired,
    })),
    components: [],
    endpoints: Array.from(endpoints).slice(0, 100),
    frameworkHints: Array.from(frameworkHints),
    rawEvidenceSummary: `Processed ${data.log.entries.length} HTTP Archive entries across ${endpoints.size} distinct endpoints`,
  });
}
