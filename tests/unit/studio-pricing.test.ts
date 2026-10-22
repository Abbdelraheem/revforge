import { describe, it, expect } from "vitest";
import {
  priceEdit,
  maxProviderCostForHold,
  settleEdit,
  STUDIO_MIN_FLOOR_CENTS,
  STUDIO_MARGIN_MULTIPLIER,
} from "@/lib/studio/pricing";

describe("Studio Pricing & Credit Economy Suite", () => {
  it("enforces $0.50 minimum floor on tiny token consumptions", () => {
    // 100 in / 100 out on FAST model -> negligible provider cost (< 1¢)
    const result = priceEdit("claude-3-5-haiku-20241022", 100, 100);
    expect(result.providerCostCents).toBeLessThanOrEqual(1);
    expect(result.userChargeCents).toBe(STUDIO_MIN_FLOOR_CENTS);
    expect(Number.isInteger(result.userChargeCents)).toBe(true);
  });

  it("applies 30% platform margin when cost exceeds floor", () => {
    // 50,000 in / 50,000 out on STANDARD (claude-3-5-sonnet-20241022: $3/M in, $15/M out)
    // input: 50k / 1M * 300 = 15¢
    // output: 50k / 1M * 1500 = 75¢
    // provider: 90¢
    const result = priceEdit("claude-3-5-sonnet-20241022", 50000, 50000);
    expect(result.providerCostCents).toBe(90);
    expect(result.userChargeCents).toBe(Math.ceil(90 * STUDIO_MARGIN_MULTIPLIER)); // 117¢
    expect(result.userChargeCents).toBeGreaterThan(STUDIO_MIN_FLOOR_CENTS);
  });

  it("calculates max provider cost for hold correctly", () => {
    const maxProviderCost = maxProviderCostForHold(200); // $2.00 cap
    expect(maxProviderCost).toBe(Math.floor(200 / 1.3)); // 153¢
    expect(maxProviderCost * 1.3).toBeLessThanOrEqual(200);
  });

  it("settles failed edits with 100% refund of held credits", () => {
    const heldCents = 200;
    const actualCents = 0; // failed edit before compile
    const result = settleEdit(heldCents, actualCents);

    expect(result.chargeCents).toBe(0);
    expect(result.refundCents).toBe(200);
  });

  it("settles completed edits by charging actual and refunding the difference", () => {
    const heldCents = 200;
    const actualCents = 75; // e.g. 75¢ actual charge
    const result = settleEdit(heldCents, actualCents);

    expect(result.chargeCents).toBe(75);
    expect(result.refundCents).toBe(125);
    expect(result.chargeCents + result.refundCents).toBe(heldCents);
  });

  it("caps charge to held amount if actual exceeds held", () => {
    const heldCents = 100;
    const actualCents = 150;
    const result = settleEdit(heldCents, actualCents);

    expect(result.chargeCents).toBe(100);
    expect(result.refundCents).toBe(0);
  });
});
