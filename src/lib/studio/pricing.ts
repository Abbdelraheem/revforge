import { calculateUsageCostCents } from "@/config/pricing";

export const STUDIO_MIN_FLOOR_CENTS = 50; // $0.50 minimum floor
export const STUDIO_DEFAULT_CAP_CENTS = 200; // $2.00 default cap
export const STUDIO_MARGIN_MULTIPLIER = 1.3; // 30% platform margin

export interface EditPriceResult {
  providerCostCents: number;
  userChargeCents: number;
}

export interface SettleEditResult {
  chargeCents: number;
  refundCents: number;
}

/**
 * Calculates raw provider cost and customer charge for an edit.
 * User charge includes a 30% platform margin with a minimum floor of $0.50 (50 cents).
 */
export function priceEdit(
  model: string,
  inputTokens: number,
  outputTokens: number
): EditPriceResult {
  const providerCostCents = calculateUsageCostCents({
    model,
    inputTokens,
    outputTokens,
  });

  const costWithMargin = Math.ceil(providerCostCents * STUDIO_MARGIN_MULTIPLIER);
  const userChargeCents = Math.max(STUDIO_MIN_FLOOR_CENTS, costWithMargin);

  return {
    providerCostCents,
    userChargeCents,
  };
}

/**
 * Computes maximum provider LLM cost permissible under a customer-approved maximum charge cap.
 */
export function maxProviderCostForHold(maxChargeCents: number): number {
  if (maxChargeCents <= 0) return 0;
  return Math.floor(maxChargeCents / STUDIO_MARGIN_MULTIPLIER);
}

/**
 * Determines final charge and refund amounts from a credit hold.
 * If actualCents is 0 (edit failure), the full hold amount is refunded.
 */
export function settleEdit(heldCents: number, actualCents: number): SettleEditResult {
  if (heldCents <= 0) {
    return { chargeCents: 0, refundCents: 0 };
  }

  if (actualCents <= 0) {
    // 100% refund on failed or uncompleted edits
    return {
      chargeCents: 0,
      refundCents: heldCents,
    };
  }

  const chargeCents = Math.min(heldCents, actualCents);
  const refundCents = Math.max(0, heldCents - chargeCents);

  return {
    chargeCents,
    refundCents,
  };
}
