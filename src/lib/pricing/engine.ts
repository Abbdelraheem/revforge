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

export interface QuoteCalculationResult {
  lines: QuoteLine[];
  subtotalCents: number;
  creditsAppliedCents: number;
  totalCents: number;
  pricingConfigVersion: number;
  needsReview: boolean;
}

export const TIER_ORDER: TierKey[] = [
  "portfolio",
  "web_app",
  "mobile_app",
  "desktop_binary",
  "enterprise_saas",
];

export const DEFAULT_PRICING_CONFIG_V1: PricingConfig = {
  version: 1,
  factorBp: 5000, // 0.50 factor
  maxHoursPerFeature: 200,
  tiers: {
    portfolio: {
      hourlyRateCents: 4000, // $40/hr
      minFeatureCents: 900,  // $9
      minOrderCents: 2900,   // $29
    },
    web_app: {
      hourlyRateCents: 6000, // $60/hr
      minFeatureCents: 1900, // $19
      minOrderCents: 9900,   // $99
    },
    mobile_app: {
      hourlyRateCents: 7500, // $75/hr
      minFeatureCents: 2900, // $29
      minOrderCents: 19900,  // $199
    },
    desktop_binary: {
      hourlyRateCents: 9500, // $95/hr
      minFeatureCents: 3900, // $39
      minOrderCents: 29900,  // $299
    },
    enterprise_saas: {
      hourlyRateCents: 11000, // $110/hr
      minFeatureCents: 4900,  // $49
      minOrderCents: 49900,   // $499
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
  creditsCents = 0
): QuoteCalculationResult {
  const lines = features.map((f) => priceFeature(f, cfg));
  const selected = lines.filter((l) => l.selected);
  const subtotal = selected.reduce((s, l) => s + l.platformCents, 0);

  const topTier = selected.reduce<TierKey>(
    (top, l) =>
      TIER_ORDER.indexOf(l.tier) > TIER_ORDER.indexOf(top) ? l.tier : top,
    "portfolio"
  );

  const floored =
    selected.length === 0 ? 0 : Math.max(subtotal, cfg.tiers[topTier].minOrderCents);

  const credits = Math.min(Math.max(creditsCents, 0), floored);
  const totalCents = floored - credits;

  // Review threshold: total > $5,000 (500,000 cents)
  const needsReview = totalCents > 500000;

  return {
    lines,
    subtotalCents: floored,
    creditsAppliedCents: credits,
    totalCents,
    pricingConfigVersion: cfg.version,
    needsReview,
  };
}
