/**
 * Studio edit pricing contracts.
 *
 * These functions are deliberately pure and integer-safe. The amount a customer
 * is charged is derived from the provider spend that actually occurred, never
 * from a token estimate.
 */

export const STUDIO_MIN_FLOOR_CENTS = 50; // $0.50 minimum charge
export const STUDIO_DEFAULT_MARKUP = 3.0;
export const STUDIO_DEFAULT_CAP_CENTS = 200;

/** Retained for callers that still express markup as a margin multiplier. */
export const STUDIO_MARGIN_MULTIPLIER = 1.3;

export interface PriceEditInput {
  providerCostCents: number;
  markup: number;
  minChargeCents: number;
}

export type EditOutcome =
  | "accepted"
  | "failed"
  | "rejected_by_guard"
  | "no_changes";

export interface SettleEditInput {
  heldCents: number;
  providerCostCents: number;
  markup: number;
  minChargeCents: number;
  outcome: EditOutcome;
}

export interface SettleEditResult {
  chargeCents: number;
  refundCents: number;
}

/**
 * priceEdit = max(minCharge, ceil(providerCost * markup)).
 */
export function priceEdit({
  providerCostCents,
  markup,
  minChargeCents,
}: PriceEditInput): number {
  const cost = Number.isFinite(providerCostCents) && providerCostCents > 0
    ? providerCostCents
    : 0;
  const rate = Number.isFinite(markup) && markup > 0 ? markup : 0;
  const floor = Number.isFinite(minChargeCents) && minChargeCents > 0
    ? Math.ceil(minChargeCents)
    : 0;

  return Math.max(floor, Math.ceil(cost * rate));
}

/**
 * Maximum provider spend that can be incurred while still fitting inside the
 * customer-approved hold: floor(heldCents / markup).
 */
export function maxProviderCostForHold({
  heldCents,
  markup,
}: {
  heldCents: number;
  markup: number;
}): number {
  if (!Number.isFinite(heldCents) || heldCents <= 0) return 0;
  if (!Number.isFinite(markup) || markup <= 0) return 0;
  return Math.floor(heldCents / markup);
}

/**
 * Only an accepted edit is charged. Every other terminal outcome refunds the
 * entire hold. charge + refund always equals held.
 */
export function settleEdit({
  heldCents,
  providerCostCents,
  markup,
  minChargeCents,
  outcome,
}: SettleEditInput): SettleEditResult {
  const held = Number.isFinite(heldCents) && heldCents > 0
    ? Math.floor(heldCents)
    : 0;

  if (held === 0) {
    return { chargeCents: 0, refundCents: 0 };
  }

  if (outcome !== "accepted") {
    return { chargeCents: 0, refundCents: held };
  }

  const price = priceEdit({ providerCostCents, markup, minChargeCents });
  const chargeCents = Math.min(held, Math.max(0, price));

  return {
    chargeCents,
    refundCents: held - chargeCents,
  };
}
