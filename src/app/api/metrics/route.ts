import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { collectMetrics, formatPrometheusMetrics } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const metricsToken = process.env.METRICS_TOKEN;

  let authorized = false;

  // 1. Bearer token authorization for Prometheus scraper
  if (metricsToken && authHeader === `Bearer ${metricsToken}`) {
    authorized = true;
  }

  // 2. Superadmin session authorization
  if (!authorized) {
    const session = await getSession();
    if (session?.user?.platformRole === "superadmin") {
      authorized = true;
    }
  }

  // 3. Localhost development fallback
  if (!authorized && process.env.NODE_ENV !== "production") {
    authorized = true;
  }

  if (!authorized) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const metrics = await collectMetrics();
    const body = formatPrometheusMetrics(metrics);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error gathering metrics: ${err.message}`, { status: 500 });
  }
}
