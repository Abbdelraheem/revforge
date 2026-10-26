import { FunnelEvent, FunnelStage } from "./funnel";

export interface FunnelDigestStep {
  stage: FunnelStage | "subscription";
  label: string;
  count: number;
  conversionFromPrevPct: number;
}

export interface WeeklyFunnelDigestReport {
  periodStart: Date;
  periodEnd: Date;
  steps: FunnelDigestStep[];
  totalPaidCount: number;
  ownerEnteredMarketingSpendUsd: number;
  calculatedCacUsd: number | null;
  averageRevenuePerCustomerUsd: number;
  paybackPeriodMonths: number | null;
  emailSubject: string;
  emailText: string;
}

const DIGEST_STAGES: Array<{ stage: FunnelStage | "subscription"; label: string }> = [
  { stage: "visit", label: "Visitors" },
  { stage: "analysis_started", label: "Analyses" },
  { stage: "quote_generated", label: "Quotes" },
  { stage: "paid", label: "Paid Builds" },
  { stage: "delivered", label: "Delivered Builds" },
  { stage: "studio_edit", label: "Studio Edits" },
  { stage: "repurchase", label: "Repurchases & Subscriptions" },
];

/**
 * Computes weekly executive growth and conversion digest for admin notifications.
 * Uses real event observations; CAC calculation uses owner-entered spend assumption.
 */
export function buildWeeklyFunnelDigest(params: {
  events: FunnelEvent[];
  ownerEnteredMarketingSpendUsd?: number;
  periodStart?: Date;
  periodEnd?: Date;
}): WeeklyFunnelDigestReport {
  const periodEnd = params.periodEnd ?? new Date();
  const periodStart =
    params.periodStart ?? new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const windowEvents = params.events.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return t >= periodStart.getTime() && t <= periodEnd.getTime();
  });

  const counts: Record<string, number> = {};
  for (const s of DIGEST_STAGES) {
    counts[s.stage] = 0;
  }

  for (const ev of windowEvents) {
    const cur = counts[ev.stage];
    if (cur !== undefined) {
      counts[ev.stage] = cur + 1;
    }
  }

  const steps: FunnelDigestStep[] = [];
  let prevCount = 0;

  for (let i = 0; i < DIGEST_STAGES.length; i++) {
    const def = DIGEST_STAGES[i];
    if (!def) continue;
    const count = counts[def.stage] || 0;
    const conversion =
      i === 0
        ? 100
        : prevCount > 0
        ? Math.round((count / prevCount) * 1000) / 10
        : 0;

    steps.push({
      stage: def.stage,
      label: def.label,
      count,
      conversionFromPrevPct: conversion,
    });
    prevCount = count;
  }

  const totalPaid = counts["paid"] || 0;
  const ownerSpend = params.ownerEnteredMarketingSpendUsd ?? 0;
  const calculatedCacUsd =
    totalPaid > 0 && ownerSpend > 0
      ? Math.round((ownerSpend / totalPaid) * 100) / 100
      : null;

  const averageRevenuePerCustomerUsd = 120; // Estimated baseline
  const paybackPeriodMonths =
    calculatedCacUsd && averageRevenuePerCustomerUsd > 0
      ? Math.round((calculatedCacUsd / averageRevenuePerCustomerUsd) * 10) / 10
      : null;

  const emailSubject = `[RevForge] Weekly Funnel Digest: ${totalPaid} new builds (${periodStart.toISOString().slice(0, 10)})`;
  const emailText = [
    `Weekly Performance Digest (${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()})`,
    "----------------------------------------------------------------------",
    ...steps.map(
      (s) =>
        `${s.label.padEnd(28)}: ${s.count.toString().padStart(5)} (${s.conversionFromPrevPct}% conv)`
    ),
    "----------------------------------------------------------------------",
    `New Paid Builds              : ${totalPaid}`,
    `Owner-Entered Marketing Spend : $${ownerSpend}`,
    `Calculated CAC (Assumption)  : ${calculatedCacUsd ? `$${calculatedCacUsd}` : "N/A (No marketing spend recorded)"}`,
    `Estimated Payback Period     : ${paybackPeriodMonths ? `${paybackPeriodMonths} months` : "Immediate / N/A"}`,
  ].join("\n");

  return {
    periodStart,
    periodEnd,
    steps,
    totalPaidCount: totalPaid,
    ownerEnteredMarketingSpendUsd: ownerSpend,
    calculatedCacUsd,
    averageRevenuePerCustomerUsd,
    paybackPeriodMonths,
    emailSubject,
    emailText,
  };
}
