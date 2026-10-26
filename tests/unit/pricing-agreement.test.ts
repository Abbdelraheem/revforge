import { describe, it, expect } from "vitest";
import { DEFAULT_PRICING_TIERS, TIER_ORDER, TierId } from "@/lib/pricing/tiers";
import { DEFAULT_PRICING_CONFIG_V1, priceQuote, TierKey } from "@/lib/pricing/engine";
import { DIRECT_CLONE_TIERS } from "@/config/pricing";
import { centsToCreditsDisplay } from "@/lib/billing/credits";

describe("Pricing Agreement Across System", () => {
  it("ensures pricing_tiers, quote engine, direct clone tiers, and checkout agree on prices for every tier", () => {
    for (const tierId of TIER_ORDER) {
      const tierDef = DEFAULT_PRICING_TIERS[tierId];
      expect(tierDef, `Missing pricing tier definition for ${tierId}`).toBeDefined();

      // 1. Check quote engine minOrderCents
      const engineTier = DEFAULT_PRICING_CONFIG_V1.tiers[tierId as TierKey];
      expect(engineTier, `Missing engine tier config for ${tierId}`).toBeDefined();
      expect(
        engineTier.minOrderCents,
        `Tier ${tierId} priceCents (${tierDef.priceCents}) does not match engine minOrderCents (${engineTier.minOrderCents})`
      ).toBe(tierDef.priceCents);

      // 2. Check DIRECT_CLONE_TIERS
      const directTier = DIRECT_CLONE_TIERS.find((t) => t.id === tierId);
      expect(directTier, `Missing direct clone tier for ${tierId}`).toBeDefined();
      expect(
        directTier!.priceUsd * 100,
        `Tier ${tierId} priceUsd (${directTier!.priceUsd}) does not match tier priceCents (${tierDef.priceCents})`
      ).toBe(tierDef.priceCents);

      // 3. Check credits consistency (1,000 credits = $1.00 USD)
      const expectedCredits = centsToCreditsDisplay(tierDef.priceCents);
      expect(directTier!.creditsRequired).toBe(expectedCredits);

      // 4. Check priceQuote with minimal scope defaults to tier price
      const quote = priceQuote(
        [
          {
            id: "spec",
            name: "Rebuild",
            tier: tierId as TierKey,
            estimatedHours: 0.25,
            selected: true,
          },
        ],
        DEFAULT_PRICING_CONFIG_V1
      );
      expect(quote.totalCents).toBe(tierDef.priceCents);
    }
  });
});
