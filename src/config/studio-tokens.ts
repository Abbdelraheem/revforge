/**
 * Prepaid Studio token packs. These are product prices, not measured usage.
 * Credits are granted only after the payment provider confirms the exact
 * subtotal in the signed webhook.
 */
export const STUDIO_TOKEN_PACKS = [
  { amountCents: 1000, label: "$10" },
  { amountCents: 2500, label: "$25" },
  { amountCents: 5000, label: "$50" },
] as const;

export function isStudioTokenPack(amountCents: number): boolean {
  return STUDIO_TOKEN_PACKS.some((pack) => pack.amountCents === amountCents);
}
