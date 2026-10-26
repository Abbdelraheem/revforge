import { describe, it, expect } from "vitest";
import {
  priceQuote,
  DEFAULT_PRICING_CONFIG_V1,
  MIN_BUILD_MARGIN_PCT,
} from "@/lib/pricing/engine";
import {
  checkIpFreeTrialUsage,
  recordIpFreeTrial,
  MAX_FREE_TRIALS_PER_IP,
  MAX_CONCURRENT_BUILDS_PER_WORKSPACE,
  MAX_DAILY_EDITS_PER_WORKSPACE,
} from "@/lib/billing/budget-guards";
import { computeProjectMargin } from "@/lib/billing/margin";

describe("Unit Economics & Margin Control", () => {
  it("enforces MIN_BUILD_MARGIN_PCT and exposes formula inputs in quotes", () => {
    const result = priceQuote(
      [
        {
          id: "landing-hero",
          name: "Hero Section",
          tier: "portfolio",
          estimatedHours: 4,
          selected: true,
        },
      ],
      DEFAULT_PRICING_CONFIG_V1
    );

    expect(result.formulaInputs).toBeDefined();
    expect(result.formulaInputs.hours).toBe(4);
    expect(result.formulaInputs.marketHourlyRateCents).toBe(4000);
    expect(result.formulaInputs.minOrderCents).toBe(DEFAULT_PRICING_CONFIG_V1.tiers.portfolio.minOrderCents);
    expect(result.projectedMarginPct).toBeGreaterThanOrEqual(MIN_BUILD_MARGIN_PCT);
    expect(result.marginApproved).toBe(true);
  });

  it("applies hard floor when projected provider cost requires higher price to maintain 65% margin", () => {
    // Artificial high cost override triggers hard floor calculation: cost / (1 - 0.65)
    const result = priceQuote(
      [
        {
          id: "landing-hero",
          name: "Hero Section",
          tier: "portfolio",
          estimatedHours: 1,
          selected: true,
        },
      ],
      DEFAULT_PRICING_CONFIG_V1,
      0,
      { portfolio: 2500 } // $25 cost requires floor of ceil(2500 / 0.35) = 7143 cents ($71.43)
    );

    expect(result.subtotalCents).toBeGreaterThanOrEqual(7143);
    expect(result.projectedMarginPct).toBeGreaterThanOrEqual(MIN_BUILD_MARGIN_PCT);
    expect(result.marginApproved).toBe(true);
  });

  it("enforces per-IP free trial limits", () => {
    const testIp = "198.51.100.42";
    expect(checkIpFreeTrialUsage(testIp).allowed).toBe(true);

    recordIpFreeTrial(testIp);
    const check = checkIpFreeTrialUsage(testIp);
    expect(check.allowed).toBe(false);
    expect(check.timesUsed).toBe(MAX_FREE_TRIALS_PER_IP);
    expect(check.reason).toContain("Complimentary architectural analysis already claimed");
  });

  it("accurately allocates infra costs in project margin calculation", () => {
    const margin = computeProjectMargin({
      payments: [{ amountCents: 10000 }], // $100 payment
      costEvents: [
        { source: "build", providerCostMicros: 2000000 }, // $2 model cost
      ],
      infraAllocationCents: 50, // $0.50 worker/storage infra
      feePercent: 5,
      feeFixedCents: 50,
    });

    expect(margin.revenueCents).toBe(10000);
    expect(margin.providerCostCents).toBe(2000);
    expect(margin.infraCents).toBe(50);
    expect(margin.feesCents).toBe(550); // 5% of 10000 + 50 = 550
    // grossProfit = 10000 - 550 - 2000 - 50 = 7400
    expect(margin.grossProfitCents).toBe(7400);
    expect(margin.marginPct).toBe(74.0);
  });
});
