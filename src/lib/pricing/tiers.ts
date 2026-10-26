import { env } from "@/env";

export type TierId = "portfolio" | "web_app" | "mobile_app" | "desktop_binary" | "enterprise_saas";

export interface PricingTierDef {
  id: TierId;
  name: string;
  priceCents: number;
  maxScreens: number;
  maxEntities: number;
  maxIntegrations: number;
  maxHours: number;
}

export const TIER_ORDER: TierId[] = [
  "portfolio",
  "web_app",
  "mobile_app",
  "desktop_binary",
  "enterprise_saas",
];

export const DEFAULT_PRICING_TIERS: Record<TierId, PricingTierDef> = {
  portfolio: {
    id: "portfolio",
    name: "Landing / Portfolio",
    priceCents: 3900, // $39 flat
    maxScreens: 3,
    maxEntities: 2,
    maxIntegrations: 1,
    maxHours: 12,
  },
  web_app: {
    id: "web_app",
    name: "Web App",
    priceCents: 7900, // $79 flat
    maxScreens: 8,
    maxEntities: 6,
    maxIntegrations: 3,
    maxHours: 24,
  },
  mobile_app: {
    id: "mobile_app",
    name: "Mobile Binary",
    priceCents: 14900, // $149 flat
    maxScreens: 20,
    maxEntities: 15,
    maxIntegrations: 5,
    maxHours: 48,
  },
  desktop_binary: {
    id: "desktop_binary",
    name: "Desktop Binary",
    priceCents: 24900, // $249 flat
    maxScreens: 35,
    maxEntities: 25,
    maxIntegrations: 8,
    maxHours: 80,
  },
  enterprise_saas: {
    id: "enterprise_saas",
    name: "Full SaaS",
    priceCents: 39900, // $399 flat
    maxScreens: 50,
    maxEntities: 40,
    maxIntegrations: 15,
    maxHours: 160,
  },
};

export interface TargetScope {
  screensCount: number;
  entitiesCount: number;
  integrationsCount: number;
  estimatedHours: number;
}

export interface ReclassificationResult {
  effectiveTier: PricingTierDef;
  wasReclassified: boolean;
  reclassificationReason?: string;
  violations: string[];
}

/**
 * Validates target scope against tier caps.
 * If target exceeds tier caps, auto-reclassifies to the next appropriate tier
 * to prevent "Landing-page price for a SaaS" abuse.
 */
export function evaluateTierCaps(
  initialTierId: TierId | string,
  scope: TargetScope,
  tierTable: Record<string, PricingTierDef> = DEFAULT_PRICING_TIERS
): ReclassificationResult {
  const fallbackTier = DEFAULT_PRICING_TIERS.portfolio;
  const initialTier = tierTable[initialTierId] ?? tierTable.portfolio ?? fallbackTier;
  const safeInitial = (tierTable[initialTierId] ? initialTierId : "portfolio") as TierId;

  const violations: string[] = [];
  if (scope.screensCount > initialTier.maxScreens) {
    violations.push(`${scope.screensCount} screens (max ${initialTier.maxScreens})`);
  }
  if (scope.entitiesCount > initialTier.maxEntities) {
    violations.push(`${scope.entitiesCount} entities (max ${initialTier.maxEntities})`);
  }
  if (scope.integrationsCount > initialTier.maxIntegrations) {
    violations.push(`${scope.integrationsCount} integrations (max ${initialTier.maxIntegrations})`);
  }
  if (scope.estimatedHours > initialTier.maxHours) {
    violations.push(`${scope.estimatedHours} estimated hours (max ${initialTier.maxHours}h)`);
  }

  if (violations.length === 0) {
    return {
      effectiveTier: initialTier,
      wasReclassified: false,
      violations: [],
    };
  }

  // Find lowest tier that accommodates the scope
  const startIndex = TIER_ORDER.indexOf(safeInitial);
  for (let i = startIndex + 1; i < TIER_ORDER.length; i++) {
    const tierId = TIER_ORDER[i];
    if (!tierId) continue;
    const candidate = tierTable[tierId];
    if (!candidate) continue;
    if (
      scope.screensCount <= candidate.maxScreens &&
      scope.entitiesCount <= candidate.maxEntities &&
      scope.integrationsCount <= candidate.maxIntegrations &&
      scope.estimatedHours <= candidate.maxHours
    ) {
      return {
        effectiveTier: candidate,
        wasReclassified: true,
        violations,
        reclassificationReason: `Target complexity (${violations.join(", ")}) exceeds ${initialTier.name} limits. Automatically upgraded to ${candidate.name}.`,
      };
    }
  }

  // If even top tier caps are exceeded, assign enterprise_saas
  const topTierId = TIER_ORDER[TIER_ORDER.length - 1] ?? "enterprise_saas";
  const topTier = tierTable[topTierId] ?? DEFAULT_PRICING_TIERS.enterprise_saas;
  return {
    effectiveTier: topTier,
    wasReclassified: true,
    violations,
    reclassificationReason: `Target complexity exceeds standard limits (${violations.join(", ")}). Classified as ${topTier.name}.`,
  };
}

export interface CostFloorCheckInput {
  priceCents: number;
  projectedCostP90Cents: number;
  acquisitionMode?: boolean;
}

export interface CostFloorCheckResult {
  allowed: boolean;
  costFloorCents: number;
  minMarginPct: number;
  deficitCents: number;
}

/**
 * Checks price against measured p90 cost floor:
 * price >= projected_cost_p90 / (1 - MIN_BUILD_MARGIN_PCT)
 * MIN_BUILD_MARGIN_PCT is 0.40 during acquisition mode, 0.65 otherwise.
 */
export function checkCostFloor({
  priceCents,
  projectedCostP90Cents,
  acquisitionMode = env.ACQUISITION_MODE,
}: CostFloorCheckInput): CostFloorCheckResult {
  const minMarginPct = acquisitionMode ? 0.40 : 0.65;
  const costFloorCents = Math.ceil(projectedCostP90Cents / (1 - minMarginPct));
  const allowed = priceCents >= costFloorCents;
  const deficitCents = allowed ? 0 : costFloorCents - priceCents;

  return {
    allowed,
    costFloorCents,
    minMarginPct,
    deficitCents,
  };
}

/**
 * Calculates deterministic job cost cap:
 * price * (1 - fee_estimate) * (1 - MIN_BUILD_MARGIN_PCT_FLOOR)
 * and never above COST_CAP_RATIO * price (default 0.35).
 */
export function calculateJobCostCap(params: {
  priceCents: number;
  feeEstimatePct?: number; // e.g. 0.05 (5%)
  acquisitionMode?: boolean;
  costCapRatio?: number;
}): number {
  const fee = params.feeEstimatePct ?? (env.PAYMENT_FEE_PERCENT / 100);
  const minMarginFloor = params.acquisitionMode ?? env.ACQUISITION_MODE ? 0.40 : 0.65;
  const capRatio = params.costCapRatio ?? env.COST_CAP_RATIO;

  const rawCap = params.priceCents * (1 - fee) * (1 - minMarginFloor);
  const maxCap = params.priceCents * capRatio;

  return Math.max(1, Math.round(Math.min(rawCap, maxCap)));
}
