import { and, desc, eq, sql } from "drizzle-orm";
import { systemDb } from "@/db";
import {
  buildJobs,
  costEvents,
  creditsLedger,
  orders,
  payments,
  projects,
  studioEdits,
} from "@/db/schema";
import { env } from "@/env";
import { computeProjectMargin, type ProjectMargin } from "./margin";

export interface MarginFilters {
  from?: Date;
  to?: Date;
  projectId?: string;
}

export interface ProjectMarginRow extends ProjectMargin {
  projectId: string;
  projectName: string;
  workspaceId: string;
}

export interface DailyMarginRow {
  day: string;
  revenueCents: number;
  providerCostCents: number;
  feesCents: number;
  grossProfitCents: number;
  marginPct: number | null;
}

export interface MarginAlert {
  projectId: string;
  projectName: string;
  kind: "low_margin" | "cost_cap";
  detail: string;
}

export interface PricingHealth {
  studioAverageChargeCents: number | null;
  studioAverageCostCents: number | null;
  studioEffectiveMarkup: number | null;
  averageBuildPriceCents: number | null;
  averageBuildCostCents: number | null;
  suggestedStudioMarkup: number | null;
  suggestedCostCapRatio: number | null;
  notes: string[];
}

export interface MarginReport {
  projects: ProjectMarginRow[];
  days: DailyMarginRow[];
  alerts: MarginAlert[];
  pricingHealth: PricingHealth;
  totals: ProjectMargin;
}

function inRange(value: Date, filters: MarginFilters): boolean {
  if (filters.from && value < filters.from) return false;
  if (filters.to && value > filters.to) return false;
  return true;
}

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export const EMPTY_MARGIN_REPORT: MarginReport = {
  projects: [],
  days: [],
  alerts: [],
  pricingHealth: {
    studioAverageChargeCents: null,
    studioAverageCostCents: null,
    studioEffectiveMarkup: null,
    averageBuildPriceCents: null,
    averageBuildCostCents: null,
    suggestedStudioMarkup: 1.5,
    suggestedCostCapRatio: null,
    notes: ["Local development mode: database connection offline."],
  },
  totals: computeProjectMargin({ payments: [], costEvents: [] }),
};

export async function loadMarginReport(filters: MarginFilters = {}): Promise<MarginReport> {
  try {
    const [projectRows, paymentRows, refundRows, grantRows, editRows, eventRows, jobRows] =
      await Promise.all([
        systemDb.select().from(projects).orderBy(desc(projects.createdAt)),
        systemDb
          .select({
            amountCents: payments.amountCents,
            createdAt: payments.createdAt,
            projectId: orders.projectId,
            kind: orders.kind,
            status: orders.status,
          })
          .from(payments)
          .innerJoin(orders, eq(payments.orderId, orders.id)),
        systemDb
          .select({
            amountCents: orders.amountCents,
            createdAt: orders.updatedAt,
            projectId: orders.projectId,
          })
          .from(orders)
          .where(eq(orders.status, "refunded")),
        systemDb
          .select({
            deltaCents: creditsLedger.deltaCents,
            createdAt: creditsLedger.createdAt,
            projectId: orders.projectId,
            workspaceId: creditsLedger.workspaceId,
          })
          .from(creditsLedger)
          .leftJoin(orders, eq(creditsLedger.orderId, orders.id))
          .where(
            and(
              eq(creditsLedger.kind, "grant"),
              sql`${creditsLedger.deltaCents} > 0`
            )
          ),
        systemDb
          .select({
            projectId: studioEdits.projectId,
            tokensSettledCents: studioEdits.tokensSettledCents,
            createdAt: studioEdits.createdAt,
          })
          .from(studioEdits)
          .where(eq(studioEdits.status, "committed")),
        systemDb
          .select({
            projectId: costEvents.projectId,
            source: costEvents.source,
            providerCostMicros: costEvents.providerCostMicros,
            createdAt: costEvents.createdAt,
          })
          .from(costEvents),
        systemDb
          .select({
            id: buildJobs.id,
            projectId: buildJobs.projectId,
            spentCents: buildJobs.spentCents,
            costCapCents: buildJobs.costCapCents,
            status: buildJobs.status,
          })
          .from(buildJobs),
      ]);

    const filteredProjects = filters.projectId
      ? projectRows.filter((row) => row.id === filters.projectId)
      : projectRows;

  const projectRowsOut: ProjectMarginRow[] = [];

  const workerHourCostCents = Number(process.env.INFRA_WORKER_HOUR_CENTS || 10);
  const storageCostCents = Number(process.env.INFRA_STORAGE_CENTS_PER_PROJECT || 5);
  const deliveryCostCents = Number(process.env.INFRA_BANDWIDTH_CENTS_PER_DELIVERY || 2);

  for (const project of filteredProjects) {
    const projectPayments = paymentRows
      .filter(
        (row) =>
          row.projectId === project.id &&
          (row.status === "paid" || row.status === "paid_by_credit") &&
          inRange(row.createdAt, filters)
      )
      .map((row) => ({ amountCents: row.amountCents }));

    const refundsCents = refundRows
      .filter((row) => row.projectId === project.id && inRange(row.createdAt, filters))
      .reduce((sum, row) => sum + row.amountCents, 0);

    const creditsGrantedCents = grantRows
      .filter((row) => row.projectId === project.id && inRange(row.createdAt, filters))
      .reduce((sum, row) => sum + row.deltaCents, 0);

    const creditsConsumedCents = editRows
      .filter((row) => row.projectId === project.id && inRange(row.createdAt, filters))
      .reduce((sum, row) => sum + row.tokensSettledCents, 0);

    const projectEvents = eventRows
      .filter((row) => row.projectId === project.id && inRange(row.createdAt, filters))
      .map((row) => ({
        source: row.source,
        providerCostMicros: row.providerCostMicros,
      }));

    const projectJobs = jobRows.filter((j) => j.projectId === project.id);
    const workerHours = Math.max(0.1, projectJobs.length * 0.25);
    const infraAllocationCents = Math.round(
      workerHours * workerHourCostCents +
        storageCostCents +
        (projectJobs.length > 0 ? deliveryCostCents : 0)
    );

    const margin = computeProjectMargin({
      payments: projectPayments,
      refundsCents,
      creditsGrantedCents,
      creditsConsumedCents,
      costEvents: projectEvents,
      feePercent: env.PAYMENT_FEE_PERCENT,
      feeFixedCents: env.PAYMENT_FEE_FIXED_CENTS,
      infraAllocationCents,
    });

    projectRowsOut.push({
      ...margin,
      projectId: project.id,
      projectName: project.name,
      workspaceId: project.workspaceId,
    });
  }

  const byDay = new Map<string, { revenue: number; cost: number; fees: number }>();
  for (const row of paymentRows) {
    if (
      !["paid", "paid_by_credit"].includes(row.status) ||
      !inRange(row.createdAt, filters) ||
      (filters.projectId && row.projectId !== filters.projectId)
    ) {
      continue;
    }
    const key = dayKey(row.createdAt);
    const bucket = byDay.get(key) || { revenue: 0, cost: 0, fees: 0 };
    bucket.revenue += row.amountCents;
    bucket.fees += Math.round((row.amountCents * env.PAYMENT_FEE_PERCENT) / 100) + env.PAYMENT_FEE_FIXED_CENTS;
    byDay.set(key, bucket);
  }
  for (const row of eventRows) {
    if (!inRange(row.createdAt, filters) || (filters.projectId && row.projectId !== filters.projectId)) {
      continue;
    }
    const key = dayKey(row.createdAt);
    const bucket = byDay.get(key) || { revenue: 0, cost: 0, fees: 0 };
    bucket.cost += row.providerCostMicros / 1000;
    byDay.set(key, bucket);
  }

  const days: DailyMarginRow[] = [...byDay.entries()]
    .map(([day, bucket]) => {
      const revenueCents = Math.round(bucket.revenue);
      const providerCostCents = Math.round(bucket.cost);
      const feesCents = Math.round(bucket.fees);
      const grossProfitCents = revenueCents - feesCents - providerCostCents;
      return {
        day,
        revenueCents,
        providerCostCents,
        feesCents,
        grossProfitCents,
        marginPct: revenueCents <= 0 ? null : (grossProfitCents / revenueCents) * 100,
      };
    })
    .sort((a, b) => b.day.localeCompare(a.day));

  const alerts: MarginAlert[] = [];
  for (const row of projectRowsOut) {
    if (row.marginPct !== null && row.marginPct < env.MARGIN_ALERT_PCT) {
      alerts.push({
        projectId: row.projectId,
        projectName: row.projectName,
        kind: "low_margin",
        detail: `Margin ${row.marginPct.toFixed(1)}% is below the ${env.MARGIN_ALERT_PCT}% alert threshold.`,
      });
    }
  }

  for (const job of jobRows) {
    if (!filters.projectId || job.projectId === filters.projectId) {
      if (job.spentCents !== null && job.costCapCents !== null && job.spentCents >= job.costCapCents) {
        const project = projectRows.find((entry) => entry.id === job.projectId);
        alerts.push({
          projectId: job.projectId,
          projectName: project?.name || job.projectId,
          kind: "cost_cap",
          detail: `Build job ${job.id.slice(0, 8)} reached its cost cap (${job.spentCents}¢ / ${job.costCapCents}¢, ${job.status}).`,
        });
      }
    }
  }

  const totalPayments = paymentRows
    .filter(
      (row) =>
        ["paid", "paid_by_credit"].includes(row.status) &&
        inRange(row.createdAt, filters) &&
        (!filters.projectId || row.projectId === filters.projectId)
    )
    .map((row) => ({ amountCents: row.amountCents }));
  const totalRefunds = refundRows
    .filter((row) => inRange(row.createdAt, filters) && (!filters.projectId || row.projectId === filters.projectId))
    .reduce((sum, row) => sum + row.amountCents, 0);
  const totalGrants = grantRows
    .filter((row) => inRange(row.createdAt, filters) && (!filters.projectId || row.projectId === filters.projectId))
    .reduce((sum, row) => sum + row.deltaCents, 0);
  const totalConsumed = editRows
    .filter((row) => inRange(row.createdAt, filters) && (!filters.projectId || row.projectId === filters.projectId))
    .reduce((sum, row) => sum + row.tokensSettledCents, 0);
  const totalEvents = eventRows
    .filter((row) => inRange(row.createdAt, filters) && (!filters.projectId || row.projectId === filters.projectId))
    .map((row) => ({ source: row.source, providerCostMicros: row.providerCostMicros }));

  const totalInfraCents = projectRowsOut.reduce((sum, p) => sum + p.infraCents, 0);

  const totals = computeProjectMargin({
    payments: totalPayments,
    refundsCents: totalRefunds,
    creditsGrantedCents: totalGrants,
    creditsConsumedCents: totalConsumed,
    costEvents: totalEvents,
    feePercent: env.PAYMENT_FEE_PERCENT,
    feeFixedCents: env.PAYMENT_FEE_FIXED_CENTS,
    infraAllocationCents: totalInfraCents,
  });

  const studioCharges = editRows
    .filter((row) => inRange(row.createdAt, filters))
    .reduce((sum, row) => sum + row.tokensSettledCents, 0);
  const studioCostMicros = eventRows
    .filter(
      (row) =>
        row.source === "studio_edit" &&
        inRange(row.createdAt, filters)
    )
    .reduce((sum, row) => sum + row.providerCostMicros, 0);
  const studioCostCents = Math.round(studioCostMicros / 1000);

  const buildOrders = paymentRows.filter(
    (row) =>
      row.kind === "build" &&
      ["paid", "paid_by_credit"].includes(row.status) &&
      inRange(row.createdAt, filters)
  );
  const buildCostMicros = eventRows
    .filter((row) => row.source === "build" && inRange(row.createdAt, filters))
    .reduce((sum, row) => sum + row.providerCostMicros, 0);
  const averageBuildPriceCents =
    buildOrders.length > 0
      ? Math.round(buildOrders.reduce((sum, row) => sum + row.amountCents, 0) / buildOrders.length)
      : null;
  const averageBuildCostCents =
    buildOrders.length > 0 ? Math.round(buildCostMicros / 1000 / buildOrders.length) : null;

  const studioEffectiveMarkup =
    studioCostCents > 0 ? studioCharges / studioCostCents : null;
  const suggestedStudioMarkup =
    studioEffectiveMarkup === null
      ? null
      : Math.max(1.5, Math.ceil((studioEffectiveMarkup + 0.25) * 100) / 100);
  const suggestedCostCapRatio =
    averageBuildPriceCents && averageBuildCostCents
      ? Math.min(
          0.9,
          Math.max(
            env.COST_CAP_RATIO,
            Math.ceil(((averageBuildCostCents / averageBuildPriceCents) * 1.25) * 100) / 100
          )
        )
      : null;

  return {
    projects: projectRowsOut,
    days,
    alerts,
    pricingHealth: {
      studioAverageChargeCents:
        editRows.length > 0 ? Math.round(studioCharges / Math.max(1, editRows.length)) : null,
      studioAverageCostCents:
        editRows.length > 0 ? Math.round(studioCostCents / Math.max(1, editRows.length)) : null,
      studioEffectiveMarkup,
      averageBuildPriceCents,
      averageBuildCostCents,
      suggestedStudioMarkup,
      suggestedCostCapRatio,
      notes: [
        "Suggestions are computed from recorded payments, Studio settlements, and cost_events; they are not applied automatically.",
        "Liability is unspent granted or purchased Studio credit and is shown separately from profit.",
      ],
    },
    totals,
  };
  } catch (err: any) {
    if (process.env.NODE_ENV === "development") {
      return EMPTY_MARGIN_REPORT;
    }
    throw err;
  }
}
