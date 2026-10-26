export type TierKey = "portfolio" | "web_app" | "mobile_app" | "desktop_binary" | "enterprise_saas";

export interface TierCfg {
  hourlyRateCents: number;
  minFeatureCents: number;
  minOrderCents: number;
}

export interface PricingConfig {
  version: number;
  factorBp: number;
  maxHoursPerFeature: number;
  tiers: Record<TierKey, TierCfg>;
}

export interface FeatureInput {
  id: string;
  name: string;
  tier: TierKey;
  estimatedHours: number;
  selected: boolean;
}

export interface QuoteLine {
  featureId: string;
  tier: TierKey;
  hoursQ4: number;
  hourlyRateCents: number;
  humanCostCents: number;
  platformCents: number;
  selected: boolean;
}

export const MIN_BUILD_MARGIN_PCT = 65; // 65% minimum gross margin requirement

export interface QuoteCalculationResult {
  lines: QuoteLine[];
  subtotalCents: number;
  creditsAppliedCents: number;
  totalCents: number;
  pricingConfigVersion: number;
  needsReview: boolean;
  projectedCostCents: number;
  projectedMarginPct: number;
  marginApproved: boolean;
  rejectionReason?: string;
  formulaInputs: {
    hours: number;
    marketHourlyRateCents: number;
    platformDiscountBp: number;
    minOrderCents: number;
    estimatedProviderCostCents: number;
  };
}

export const TIER_ORDER: TierKey[] = [
  "portfolio",
  "web_app",
  "mobile_app",
  "desktop_binary",
  "enterprise_saas",
];

// Baseline historical provider cost estimates per tier in cents
export const HISTORICAL_TIER_COST_CENTS: Record<TierKey, number> = {
  portfolio: 35, // ~$0.35
  web_app: 75,   // ~$0.75
  mobile_app: 95, // ~$0.95
  desktop_binary: 120, // ~$1.20
  enterprise_saas: 180, // ~$1.80
};

export const DEFAULT_PRICING_CONFIG_V1: PricingConfig = {
  version: 1,
  factorBp: 5000, // 0.50 factor
  maxHoursPerFeature: 200,
  tiers: {
    portfolio: {
      hourlyRateCents: 4000, // $40/hr
      minFeatureCents: 900,  // $9
      minOrderCents: 3900,   // $39 Landing / Portfolio
    },
    web_app: {
      hourlyRateCents: 6000, // $60/hr
      minFeatureCents: 1900, // $19
      minOrderCents: 7900,   // $79 Web App
    },
    mobile_app: {
      hourlyRateCents: 7500, // $75/hr
      minFeatureCents: 2900, // $29
      minOrderCents: 14900,  // $149 Mobile Binary
    },
    desktop_binary: {
      hourlyRateCents: 9500, // $95/hr
      minFeatureCents: 3900, // $39
      minOrderCents: 24900,  // $249 Desktop Binary
    },
    enterprise_saas: {
      hourlyRateCents: 11000, // $110/hr
      minFeatureCents: 4900,  // $49
      minOrderCents: 39900,   // $399 Full SaaS
    },
  },
};

export function priceFeature(f: FeatureInput, cfg: PricingConfig): QuoteLine {
  const t = cfg.tiers[f.tier];
  const clamped = Math.min(
    Math.max(Number.isFinite(f.estimatedHours) ? f.estimatedHours : 0.25, 0.25),
    cfg.maxHoursPerFeature
  );
  const hoursQ4 = Math.round(clamped * 4); // integer quarter-hours
  const humanCostCents = Math.round((hoursQ4 * t.hourlyRateCents) / 4);
  const platformCents = Math.max(
    t.minFeatureCents,
    Math.round((humanCostCents * cfg.factorBp) / 10000)
  );

  return {
    featureId: f.id,
    tier: f.tier,
    hoursQ4,
    hourlyRateCents: t.hourlyRateCents,
    humanCostCents,
    platformCents,
    selected: f.selected,
  };
}

export function priceQuote(
  features: FeatureInput[],
  cfg: PricingConfig,
  creditsCents = 0,
  customTierCosts?: Partial<Record<TierKey, number>>
): QuoteCalculationResult {
  const lines = features.map((f) => priceFeature(f, cfg));
  const selected = lines.filter((l) => l.selected);
  const subtotal = selected.reduce((s, l) => s + l.platformCents, 0);

  const topTier = selected.reduce<TierKey>(
    (top, l) =>
      TIER_ORDER.indexOf(l.tier) > TIER_ORDER.indexOf(top) ? l.tier : top,
    "portfolio"
  );

  // Estimate provider cost based on selected features & top tier
  const tierCost = customTierCosts?.[topTier] ?? HISTORICAL_TIER_COST_CENTS[topTier];
  const totalHours = selected.reduce((s, l) => s + l.hoursQ4 / 4, 0);
  const projectedCostCents = Math.max(
    tierCost,
    Math.round((totalHours / 10) * tierCost)
  );

  // Hard floor: projected cost / (1 - MIN_BUILD_MARGIN_PCT)
  const marginFloorCents = Math.ceil(projectedCostCents / (1 - MIN_BUILD_MARGIN_PCT / 100));
  const floored =
    selected.length === 0
      ? 0
      : Math.max(subtotal, cfg.tiers[topTier].minOrderCents, marginFloorCents);

  const credits = Math.min(Math.max(creditsCents, 0), floored);
  const totalCents = floored - credits;

  // Projected margin calculation
  const projectedMarginPct =
    floored > 0
      ? Math.round(((floored - projectedCostCents) / floored) * 1000) / 10
      : 100;

  const marginApproved =
    floored === 0 || projectedMarginPct >= MIN_BUILD_MARGIN_PCT;

  const rejectionReason = !marginApproved
    ? `Projected gross margin (${projectedMarginPct}%) falls below required ${MIN_BUILD_MARGIN_PCT}% threshold for tier ${topTier}.`
    : undefined;

  // Review threshold: total > $5,000 (500,000 cents)
  const needsReview = totalCents > 500000 || !marginApproved;

  return {
    lines,
    subtotalCents: floored,
    creditsAppliedCents: credits,
    totalCents,
    pricingConfigVersion: cfg.version,
    needsReview,
    projectedCostCents,
    projectedMarginPct,
    marginApproved,
    rejectionReason,
    formulaInputs: {
      hours: totalHours,
      marketHourlyRateCents: cfg.tiers[topTier].hourlyRateCents,
      platformDiscountBp: cfg.factorBp,
      minOrderCents: cfg.tiers[topTier].minOrderCents,
      estimatedProviderCostCents: projectedCostCents,
    },
  };
}
