import { NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health/probe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await checkSystemHealth();
    const statusCode = report.status === "healthy" ? 200 : 503;
    return NextResponse.json(report, { status: statusCode });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "down",
        services: {
          postgres: false,
          postgresSystem: false,
          redis: false,
          s3: false,
          docker: false,
          worker: false,
        },
        timestamp: new Date().toISOString(),
        error: err.message || "Failed to probe health dependencies",
      },
      { status: 503 }
    );
  }
}
