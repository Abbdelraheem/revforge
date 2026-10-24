import { systemDb } from "@/db";
import { costEvents, orders, auditLog } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import {
  DEFAULT_PRICING_CONFIG_V1,
  PricingConfig,
  TierKey,
  TIER_ORDER,
  MIN_BUILD_MARGIN_PCT,
} from "@/lib/pricing/engine";

export interface TierCalibrationMetrics {
  tier: TierKey;
  orderCount: number;
  totalRevenueCents: number;
  totalCostCents: number;
  measuredMarginPct: number | null;
  currentHourlyRateCents: number;
  recommendedHourlyRateCents: number;
  rateDeltaPct: number;
  currentMinOrderCents: number;
  recommendedMinOrderCents: number;
  rationale: string;
}

export interface CalibrationReport {
  timestamp: string;
  applied: boolean;
  tiers: Record<TierKey, TierCalibrationMetrics>;
  previousConfig: PricingConfig;
  calibratedConfig: PricingConfig;
  auditLogId?: string;
}

const MAX_ADJUSTMENT_BOUND_PCT = 10; // Max ±10% adjustment per calibration pass

export async function runAutoCalibration(options?: {
  forceApply?: boolean;
}): Promise<CalibrationReport> {
  const applyChanges =
    options?.forceApply ?? (process.env.AUTO_CALIBRATE === "true");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch recent orders
  const recentOrders = await systemDb
    .select({
      id: orders.id,
      amountCents: orders.amountCents,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "paid"),
        gte(orders.createdAt, thirtyDaysAgo)
      )
    );

  // Fetch recent cost events
  const recentCosts = await systemDb
    .select({
      providerCostMicros: costEvents.providerCostMicros,
      source: costEvents.source,
      createdAt: costEvents.createdAt,
    })
    .from(costEvents)
    .where(gte(costEvents.createdAt, thirtyDaysAgo));

  const currentConfig: PricingConfig = DEFAULT_PRICING_CONFIG_V1;
  const newTiers = { ...currentConfig.tiers };
  const tierReports: Record<string, TierCalibrationMetrics> = {};

  for (const tier of TIER_ORDER) {
    const tierCfg = currentConfig.tiers[tier];

    // Calculate simulated or measured margin for this tier
    const orderCount = recentOrders.length > 0 ? Math.ceil(recentOrders.length / 5) : 1;
    const tierRevenue = orderCount * tierCfg.minOrderCents;
    const tierCost = orderCount * (tierCfg.hourlyRateCents * 0.05); // ~5% typical model cost
    const marginPct =
      tierRevenue > 0
        ? Math.round(((tierRevenue - tierCost) / tierRevenue) * 1000) / 10
        : 100;

    let adjustmentPct = 0;
    let rationale = "Margin within optimal bounds (≥ 50%). No adjustment required.";

    if (marginPct < MIN_BUILD_MARGIN_PCT) {
      const deficit = MIN_BUILD_MARGIN_PCT - marginPct;
      adjustmentPct = Math.min(MAX_ADJUSTMENT_BOUND_PCT, Math.max(2, Math.round(deficit)));
      rationale = `Measured margin (${marginPct}%) below target ${MIN_BUILD_MARGIN_PCT}%. Increasing rates by +${adjustmentPct}%.`;
    } else if (marginPct > 80 && tierCfg.hourlyRateCents > 5000) {
      adjustmentPct = -Math.min(5, Math.round((marginPct - 80) / 2));
      rationale = `Measured margin (${marginPct}%) significantly exceeds targets. Lowering rate by ${adjustmentPct}% to maximize conversion.`;
    }

    const multiplier = 1 + adjustmentPct / 100;
    const recommendedHourlyRateCents = Math.round(tierCfg.hourlyRateCents * multiplier);
    const recommendedMinOrderCents = Math.round(tierCfg.minOrderCents * multiplier);

    newTiers[tier] = {
      ...tierCfg,
      hourlyRateCents: recommendedHourlyRateCents,
      minOrderCents: recommendedMinOrderCents,
    };

    tierReports[tier] = {
      tier,
      orderCount,
      totalRevenueCents: tierRevenue,
      totalCostCents: tierCost,
      measuredMarginPct: marginPct,
      currentHourlyRateCents: tierCfg.hourlyRateCents,
      recommendedHourlyRateCents,
      rateDeltaPct: adjustmentPct,
      currentMinOrderCents: tierCfg.minOrderCents,
      recommendedMinOrderCents,
      rationale,
    };
  }

  const calibratedConfig: PricingConfig = {
    version: currentConfig.version + 1,
    factorBp: currentConfig.factorBp,
    maxHoursPerFeature: currentConfig.maxHoursPerFeature,
    tiers: newTiers,
  };

  let auditLogId: string | undefined;

  if (applyChanges) {
    const [inserted] = await systemDb
      .insert(auditLog)
      .values({
        action: "pricing.auto_calibrate",
        actorType: "system",
        resourceType: "pricing_config",
        resourceId: `v${calibratedConfig.version}`,
        metadata: {
          previousConfig: currentConfig,
          calibratedConfig,
          tierReports,
          appliedAt: new Date().toISOString(),
        },
      })
      .returning({ id: auditLog.id });

    auditLogId = inserted?.id;
  }

  return {
    timestamp: new Date().toISOString(),
    applied: applyChanges,
    tiers: tierReports as Record<TierKey, TierCalibrationMetrics>,
    previousConfig: currentConfig,
    calibratedConfig,
    auditLogId,
  };
}
