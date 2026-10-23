import { describe, it, expect } from "vitest";
import {
  priceEdit,
  maxProviderCostForHold,
  settleEdit,
  STUDIO_MIN_FLOOR_CENTS,
} from "@/lib/studio/pricing";

describe("Studio pricing contracts", () => {
  it("applies the minimum charge floor to tiny provider costs", () => {
    expect(
      priceEdit({ providerCostCents: 0, markup: 3, minChargeCents: 50 })
    ).toBe(STUDIO_MIN_FLOOR_CENTS);
    expect(
      priceEdit({ providerCostCents: 5, markup: 1, minChargeCents: 50 })
    ).toBe(50);
  });

  it("charges ceil(cost * markup) above the floor", () => {
    expect(
      priceEdit({ providerCostCents: 90, markup: 1.3, minChargeCents: 50 })
    ).toBe(117);
    expect(
      priceEdit({ providerCostCents: 1, markup: 3, minChargeCents: 0 })
    ).toBe(3);
  });

  it("derives the maximum provider spend from the hold", () => {
    expect(maxProviderCostForHold({ heldCents: 200, markup: 1.3 })).toBe(153);
    expect(maxProviderCostForHold({ heldCents: 0, markup: 1.3 })).toBe(0);
  });

  it("charges only accepted edits and always balances to the hold", () => {
    const accepted = settleEdit({
      heldCents: 200,
      providerCostCents: 75,
      markup: 1.3,
      minChargeCents: 50,
      outcome: "accepted",
    });
    expect(accepted.chargeCents).toBe(98);
    expect(accepted.chargeCents + accepted.refundCents).toBe(200);

    for (const outcome of [
      "failed",
      "rejected_by_guard",
      "no_changes",
    ] as const) {
      const result = settleEdit({
        heldCents: 200,
        providerCostCents: 75,
        markup: 1.3,
        minChargeCents: 50,
        outcome,
      });
      expect(result.chargeCents).toBe(0);
      expect(result.refundCents).toBe(200);
      expect(result.chargeCents + result.refundCents).toBe(200);
    }
  });

  it("caps an accepted charge at the held amount", () => {
    const result = settleEdit({
      heldCents: 100,
      providerCostCents: 500,
      markup: 3,
      minChargeCents: 50,
      outcome: "accepted",
    });
    expect(result.chargeCents).toBe(100);
    expect(result.refundCents).toBe(0);
  });
});
