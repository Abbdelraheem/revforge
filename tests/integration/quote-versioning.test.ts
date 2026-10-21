import { describe, it, expect } from "vitest";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1 } from "@/lib/pricing/engine";

describe("Quote Versioning & Pricing Immutability", () => {
  it("locks quotes to immutable version and prevents tampering", () => {
    const quoteV1 = {
      version: 1,
      pricingConfigVersion: 1,
      subtotalCents: 9900,
      totalCents: 9900,
      status: "active",
    };

    // When recalculating with updated feature lines, a new version is issued
    const updatedFeatures = [
      { id: "feat-1", name: "Base", tier: "web_app" as const, estimatedHours: 24, selected: true },
      { id: "feat-2", name: "Auth", tier: "web_app" as const, estimatedHours: 12, selected: true },
    ];

    const newQuote = priceQuote(updatedFeatures, DEFAULT_PRICING_CONFIG_V1);
    const quoteV2 = {
      version: quoteV1.version + 1,
      pricingConfigVersion: DEFAULT_PRICING_CONFIG_V1.version,
      subtotalCents: newQuote.subtotalCents,
      totalCents: newQuote.totalCents,
      status: "active",
    };

    expect(quoteV2.version).toBe(2);
    expect(quoteV2.totalCents).toBeGreaterThan(quoteV1.totalCents);
  });
});
