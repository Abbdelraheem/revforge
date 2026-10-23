import { describe, expect, it } from "vitest";
import {
  computeProjectMargin,
  computeStudioEditMargin,
} from "@/lib/billing/margin";

describe("margin accounting", () => {
  it("recognizes cash revenue, fees, provider cost, and liability", () => {
    const margin = computeProjectMargin({
      payments: [{ amountCents: 10_000 }],
      refundsCents: 0,
      creditsGrantedCents: 2_000,
      creditsConsumedCents: 500,
      costEvents: [
        { source: "analysis", providerCostMicros: 1_250_000 },
        { source: "build", providerCostMicros: 2_000_000 },
        { source: "studio_edit", providerCostMicros: 500_000 },
        { source: "preview", providerCostMicros: 250_000 },
      ],
      feePercent: 5,
      feeFixedCents: 50,
      infraAllocationCents: 300,
    });

    expect(margin.revenueCents).toBe(8_500);
    expect(margin.feesCents).toBe(550);
    expect(margin.providerCostCents).toBe(4_000);
    expect(margin.byStage).toEqual({
      analysis: 1_250,
      build: 2_000,
      studio: 500,
      preview: 250,
    });
    expect(margin.liabilityCents).toBe(1_500);
    expect(margin.grossProfitCents).toBe(3_650);
    expect(margin.marginPct).toBeCloseTo((3_650 / 8_500) * 100);
  });

  it("returns a null margin percentage when revenue is zero", () => {
    const margin = computeProjectMargin({
      payments: [],
      refundsCents: 0,
      creditsGrantedCents: 0,
      creditsConsumedCents: 0,
      costEvents: [{ source: "analysis", providerCostMicros: 100_000 }],
      feePercent: 5,
      feeFixedCents: 50,
      infraAllocationCents: 0,
    });

    expect(margin.revenueCents).toBe(0);
    expect(margin.marginPct).toBeNull();
    expect(margin.liabilityCents).toBe(0);
  });

  it("computes Studio edit margin from real charge and cost", () => {
    expect(
      computeStudioEditMargin({ chargedCents: 600, providerCostCents: 200 })
    ).toEqual({
      chargedCents: 600,
      providerCostCents: 200,
      grossProfitCents: 400,
      marginPct: (400 / 600) * 100,
    });

    expect(
      computeStudioEditMargin({ chargedCents: 0, providerCostCents: 10 })
    ).toMatchObject({ grossProfitCents: -10, marginPct: null });
  });
});
