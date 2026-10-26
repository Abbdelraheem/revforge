/**
 * Pure margin-accounting contracts.
 *
 * All money is integer cents. Provider usage is recorded in micros so a
 * sub-cent model call is never silently rounded away before aggregation.
 * Nothing in this module reads the database or invents numbers.
 */

export type CostSource =
  | "analysis"
  | "build"
  | "studio_edit"
  | "preview"
  | "infra"
  | string;

export interface MarginPayment {
  amountCents?: number;
  amount_cents?: number;
  totalCents?: number;
  status?: string;
}

export interface MarginCostEvent {
  source?: CostSource;
  providerCostMicros?: number | string | bigint;
  provider_cost_micros?: number | string | bigint;
  costMicros?: number | string | bigint;
  providerCostCents?: number;
  costCents?: number;
}

export interface ProjectMarginInput {
  payments: Array<MarginPayment | number>;
  refundsCents?: number;
  creditsGrantedCents?: number;
  creditsConsumedCents?: number;
  costEvents: MarginCostEvent[];
  feePercent?: number;
  feeFixedCents?: number;
  infraAllocationCents?: number;
}

export interface ProjectMargin {
  revenueCents: number;
  feesCents: number;
  providerCostCents: number;
  infraCents: number;
  grossProfitCents: number;
  marginPct: number | null;
  byStage: {
    analysis: number;
    build: number;
    studio: number;
    preview: number;
  };
  liabilityCents: number;
}

export interface StudioEditMargin {
  chargedCents: number;
  providerCostCents: number;
  grossProfitCents: number;
  marginPct: number | null;
}

function integer(value: unknown, fallback = 0): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  }
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : fallback;
}

function paymentAmount(payment: MarginPayment | number): number {
  if (typeof payment === "number") return integer(payment);
  return integer(
    payment.amountCents ?? payment.amount_cents ?? payment.totalCents ?? 0
  );
}

function costMicros(event: MarginCostEvent): number {
  if (event.providerCostMicros !== undefined) return integer(event.providerCostMicros);
  if (event.provider_cost_micros !== undefined) return integer(event.provider_cost_micros);
  if (event.costMicros !== undefined) return integer(event.costMicros);
  if (event.providerCostCents !== undefined) {
    return Math.round(Number(event.providerCostCents) * 1000);
  }
  if (event.costCents !== undefined) return Math.round(Number(event.costCents) * 1000);
  return 0;
}

function sourceBucket(source: CostSource): keyof ProjectMargin["byStage"] | "infra" | null {
  const normalized = String(source || "").toLowerCase();
  if (normalized === "analysis" || normalized === "analyze") return "analysis";
  if (normalized === "build" || normalized === "builder") return "build";
  if (
    normalized === "studio" ||
    normalized === "studio_edit" ||
    normalized === "edit" ||
    normalized === "enhancer"
  ) {
    return "studio";
  }
  if (normalized === "preview") return "preview";
  if (normalized === "infra" || normalized === "infrastructure") return "infra";
  return null;
}

/**
 * Revenue is recognized cash, not booked credit sales. Credit grants are
 * deferred until consumed, so:
 *   revenue = payments - refunds - granted + consumed
 * Unspent granted/bought credits stay visible as liability instead of being
 * counted as profit.
 *
 * Fees apply to the processor-charged payment amount (a refund does not refund
 * the processor fee) plus the fixed fee for each payment.
 */
export function computeProjectMargin({
  payments,
  refundsCents = 0,
  creditsGrantedCents = 0,
  creditsConsumedCents = 0,
  costEvents,
  feePercent = 5,
  feeFixedCents = 50,
  infraAllocationCents = 0,
}: ProjectMarginInput): ProjectMargin {
  const paymentList: Array<MarginPayment | number> = Array.isArray(payments)
    ? payments
    : [];
  const paymentCents = paymentList.reduce<number>(
    (sum, payment) => sum + paymentAmount(payment),
    0
  );
  const paymentCount = paymentList.length;

  const refunds = Math.max(0, integer(refundsCents));
  const granted = Math.max(0, integer(creditsGrantedCents));
  const consumed = Math.max(0, integer(creditsConsumedCents));
  const infra = Math.max(0, integer(infraAllocationCents));

  const revenueCents = paymentCents - refunds - granted + consumed;

  const percent = Number.isFinite(feePercent) ? Number(feePercent) : 0;
  const fixed = Math.max(0, integer(feeFixedCents));
  const feesCents = Math.round((paymentCents * percent) / 100) + fixed * paymentCount;

  const stageMicros = {
    analysis: 0,
    build: 0,
    studio: 0,
    preview: 0,
    infra: 0,
  };

  let totalMicros = 0;
  for (const event of Array.isArray(costEvents) ? costEvents : []) {
    const micros = costMicros(event);
    totalMicros += micros;
    const bucket = sourceBucket(event.source ?? "");
    if (bucket) stageMicros[bucket] += micros;
  }

  const providerCostCents = Math.round(totalMicros / 1000);
  const byStage = {
    analysis: Math.round(stageMicros.analysis / 1000),
    build: Math.round(stageMicros.build / 1000),
    studio: Math.round(stageMicros.studio / 1000),
    preview: Math.round(stageMicros.preview / 1000),
  };

  const grossProfitCents = revenueCents - feesCents - providerCostCents - infra;
  const marginPct =
    revenueCents <= 0 ? null : (grossProfitCents / revenueCents) * 100;

  return {
    revenueCents,
    feesCents,
    providerCostCents,
    infraCents: infra,
    grossProfitCents,
    marginPct,
    byStage,
    liabilityCents: Math.max(0, granted - consumed),
  };
}

/** Margin on one Studio edit, using the amount actually charged. */
export function computeStudioEditMargin({
  chargedCents,
  providerCostCents,
}: {
  chargedCents: number;
  providerCostCents: number;
}): StudioEditMargin {
  const charged = Math.max(0, integer(chargedCents));
  const cost = Math.max(0, integer(providerCostCents));
  const grossProfitCents = charged - cost;

  return {
    chargedCents: charged,
    providerCostCents: cost,
    grossProfitCents,
    marginPct: charged <= 0 ? null : (grossProfitCents / charged) * 100,
  };
}
