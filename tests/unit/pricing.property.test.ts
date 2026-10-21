import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1, TierKey } from "@/lib/pricing/engine";

describe("Pricing Property-Based Verification (fast-check)", () => {
  const tiers: TierKey[] = ["portfolio", "web_app", "mobile_app", "desktop_binary", "enterprise_saas"];

  it("always enforces category minimum order floors regardless of small hours", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...tiers),
        fc.integer({ min: 1, max: 10 }),
        (tier, hours) => {
          const quote = priceQuote(
            [{ id: "feat-1", name: "Feature", tier, estimatedHours: hours, selected: true }],
            DEFAULT_PRICING_CONFIG_V1
          );

          const floor = DEFAULT_PRICING_CONFIG_V1.tiers[tier].minOrderCents;
          return quote.totalCents >= floor;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("strictly produces integer cents with zero decimal fractions", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...tiers),
        fc.integer({ min: 1, max: 200 }),
        (tier, hours) => {
          const quote = priceQuote(
            [{ id: "feat-1", name: "Feature", tier, estimatedHours: hours, selected: true }],
            DEFAULT_PRICING_CONFIG_V1
          );

          return Number.isInteger(quote.totalCents) && Number.isInteger(quote.subtotalCents);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("monotonically increases or stays equal with increasing hours", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...tiers),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (tier, baseHours, additionalHours) => {
          const q1 = priceQuote(
            [{ id: "feat-1", name: "Feature", tier, estimatedHours: baseHours, selected: true }],
            DEFAULT_PRICING_CONFIG_V1
          );
          const q2 = priceQuote(
            [{ id: "feat-1", name: "Feature", tier, estimatedHours: baseHours + additionalHours, selected: true }],
            DEFAULT_PRICING_CONFIG_V1
          );

          return q2.totalCents >= q1.totalCents;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Exhaustive tier matrix verification
  const testHours = [1, 5, 10, 25, 50, 100, 200, 400];
  tiers.forEach((tier) => {
    testHours.forEach((hours) => {
      it(`calculates deterministic quote for tier ${tier} at ${hours}h`, () => {
        const quote = priceQuote(
          [{ id: `feat-${tier}-${hours}`, name: `Feature ${tier}`, tier, estimatedHours: hours, selected: true }],
          DEFAULT_PRICING_CONFIG_V1
        );
        const floor = DEFAULT_PRICING_CONFIG_V1.tiers[tier].minOrderCents;
        expect(quote.totalCents).toBeGreaterThanOrEqual(floor);
        expect(Number.isInteger(quote.totalCents)).toBe(true);
        expect(Number.isInteger(quote.subtotalCents)).toBe(true);
      });
    });
  });
});
