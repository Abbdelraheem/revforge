import { describe, it, expect } from "vitest";
import {
  evaluateTierCaps,
  checkCostFloor,
  calculateJobCostCap,
  DEFAULT_PRICING_TIERS,
} from "@/lib/pricing/tiers";

describe("evaluateTierCaps", () => {
  it("keeps portfolio tier when scope is completely within caps", () => {
    const res = evaluateTierCaps("portfolio", {
      screensCount: 2,
      entitiesCount: 1,
      integrationsCount: 1,
      estimatedHours: 8,
    });
    expect(res.wasReclassified).toBe(false);
    expect(res.effectiveTier.id).toBe("portfolio");
    expect(res.violations).toHaveLength(0);
  });

  it("auto-reclassifies from portfolio to web_app when screens exceed portfolio cap", () => {
    const res = evaluateTierCaps("portfolio", {
      screensCount: 6, // portfolio max is 3, web_app max is 8
      entitiesCount: 2,
      integrationsCount: 1,
      estimatedHours: 10,
    });
    expect(res.wasReclassified).toBe(true);
    expect(res.effectiveTier.id).toBe("web_app");
    expect(res.violations).toContain("6 screens (max 3)");
    expect(res.reclassificationReason).toContain("Portfolio limits");
    expect(res.reclassificationReason).toContain("Web App");
  });

  it("auto-reclassifies to enterprise_saas when scope is large SaaS scope", () => {
    const res = evaluateTierCaps("portfolio", {
      screensCount: 45,
      entitiesCount: 30,
      integrationsCount: 10,
      estimatedHours: 120,
    });
    expect(res.wasReclassified).toBe(true);
    expect(res.effectiveTier.id).toBe("enterprise_saas");
  });
});

describe("checkCostFloor", () => {
  it("allows price when it covers p90 cost at acquisition margin (40%)", () => {
    // p90 = 2000 cents ($20). At 40% margin: floor = ceil(2000 / 0.6) = 3334 cents ($33.34).
    // price = 3900 cents ($39) -> passes
    const res = checkCostFloor({
      priceCents: 3900,
      projectedCostP90Cents: 2000,
      acquisitionMode: true,
    });
    expect(res.allowed).toBe(true);
    expect(res.deficitCents).toBe(0);
    expect(res.costFloorCents).toBe(3334);
  });

  it("rejects price when below p90 cost floor and calculates exact deficit", () => {
    // p90 = 3000 cents ($30). Floor at 40% margin = ceil(3000 / 0.6) = 5000 cents ($50).
    // price = 3900 cents -> deficit = 1100 cents
    const res = checkCostFloor({
      priceCents: 3900,
      projectedCostP90Cents: 3000,
      acquisitionMode: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.deficitCents).toBe(1100);
    expect(res.costFloorCents).toBe(5000);
  });

  it("raises floor margin requirement to 65% when acquisitionMode is false", () => {
    // p90 = 2000 cents. At 65% margin: floor = ceil(2000 / 0.35) = 5715 cents.
    // price = 3900 cents -> fails with deficit
    const res = checkCostFloor({
      priceCents: 3900,
      projectedCostP90Cents: 2000,
      acquisitionMode: false,
    });
    expect(res.allowed).toBe(false);
    expect(res.costFloorCents).toBe(5715);
    expect(res.deficitCents).toBe(1815);
  });
});

describe("calculateJobCostCap", () => {
  it("never exceeds COST_CAP_RATIO (0.35) of price", () => {
    // price = 10,000 cents ($100). 35% cap ratio -> max 3,500 cents
    const cap = calculateJobCostCap({
      priceCents: 10000,
      feeEstimatePct: 0.05,
      costCapRatio: 0.35,
    });
    expect(cap).toBeLessThanOrEqual(3500);
    expect(cap).toBe(3500);
  });
});
