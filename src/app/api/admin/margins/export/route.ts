import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadMarginReport } from "@/lib/billing/margin-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function cell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.platformRole !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"), true);
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;

  const report = await loadMarginReport({ from, to, projectId });
  const lines: string[] = [];

  lines.push(
    [
      "scope",
      "key",
      "revenue_cents",
      "fees_cents",
      "provider_cost_cents",
      "infra_cents",
      "gross_profit_cents",
      "margin_pct",
      "liability_cents",
      "analysis_cents",
      "build_cents",
      "studio_cents",
      "preview_cents",
    ]
      .map(cell)
      .join(",")
  );

  for (const project of report.projects) {
    lines.push(
      [
        "project",
        project.projectId,
        project.revenueCents,
        project.feesCents,
        project.providerCostCents,
        project.infraCents,
        project.grossProfitCents,
        project.marginPct === null ? "" : project.marginPct.toFixed(4),
        project.liabilityCents,
        project.byStage.analysis,
        project.byStage.build,
        project.byStage.studio,
        project.byStage.preview,
      ]
        .map(cell)
        .join(",")
    );
  }

  for (const day of report.days) {
    lines.push(
      [
        "day",
        day.day,
        day.revenueCents,
        day.feesCents,
        day.providerCostCents,
        "",
        day.grossProfitCents,
        day.marginPct === null ? "" : day.marginPct.toFixed(4),
        "",
        "",
        "",
        "",
        "",
      ]
        .map(cell)
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="revforge-margins-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
