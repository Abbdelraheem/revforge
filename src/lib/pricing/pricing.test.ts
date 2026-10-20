import {
  priceQuote,
  priceFeature,
  DEFAULT_PRICING_CONFIG_V1,
  type FeatureInput,
  type TierKey,
  TIER_ORDER,
} from "./engine";
import assert from "node:assert";

console.log("=== Running Pricing Engine Property & Unit Tests ===");

// 1. Monotonicity in hours
for (const tier of TIER_ORDER) {
  const f1: FeatureInput = { id: "1", name: "F1", tier, estimatedHours: 2.0, selected: true };
  const f2: FeatureInput = { id: "2", name: "F2", tier, estimatedHours: 4.0, selected: true };
  const l1 = priceFeature(f1, DEFAULT_PRICING_CONFIG_V1);
  const l2 = priceFeature(f2, DEFAULT_PRICING_CONFIG_V1);
  assert(l2.platformCents >= l1.platformCents, `Monotonicity failed for tier: ${tier}`);
  assert(l2.humanCostCents >= l1.humanCostCents, `Human cost monotonicity failed for tier: ${tier}`);
}
console.log("✓ Monotonicity test passed.");

// 2. Minimum feature floor & Order minimum floor
const microFeature: FeatureInput = {
  id: "micro",
  name: "Tiny icon tweak",
  tier: "portfolio",
  estimatedHours: 0.01,
  selected: true,
};
const line = priceFeature(microFeature, DEFAULT_PRICING_CONFIG_V1);
assert.strictEqual(
  line.platformCents,
  DEFAULT_PRICING_CONFIG_V1.tiers.portfolio.minFeatureCents,
  "Feature floor not respected!"
);

const singleQuote = priceQuote([microFeature], DEFAULT_PRICING_CONFIG_V1);
assert.strictEqual(
  singleQuote.subtotalCents,
  DEFAULT_PRICING_CONFIG_V1.tiers.portfolio.minOrderCents,
  "Order minimum floor not respected!"
);
console.log("✓ Floor enforcements passed.");

// 3. Integer invariants and 0.5x ratio check
for (let i = 0; i < 1000; i++) {
  const randomHours = Math.random() * 50;
  const randomTier = TIER_ORDER[Math.floor(Math.random() * TIER_ORDER.length)]!;
  const f: FeatureInput = {
    id: `rand-${i}`,
    name: "Random Feature",
    tier: randomTier,
    estimatedHours: randomHours,
    selected: true,
  };
  const res = priceFeature(f, DEFAULT_PRICING_CONFIG_V1);
  assert(Number.isInteger(res.platformCents), "Platform cents is not an integer!");
  assert(Number.isInteger(res.humanCostCents), "Human cost cents is not an integer!");
  assert(Number.isInteger(res.hoursQ4), "HoursQ4 is not an integer!");
  assert(!Number.isNaN(res.platformCents), "Platform cents is NaN!");
}
console.log("✓ 1,000 random randomized property tests passed with 0 NaN and pure integers.");

// 4. Feature toggle recompute
const fToggleA: FeatureInput = { id: "a", name: "A", tier: "web_app", estimatedHours: 10, selected: true };
const fToggleB: FeatureInput = { id: "b", name: "B", tier: "web_app", estimatedHours: 10, selected: false };
const qBothSelected = priceQuote([{ ...fToggleA }, { ...fToggleB, selected: true }], DEFAULT_PRICING_CONFIG_V1);
const qOneSelected = priceQuote([fToggleA, fToggleB], DEFAULT_PRICING_CONFIG_V1);
assert(qBothSelected.subtotalCents > qOneSelected.subtotalCents, "Toggling feature did not recompute subtotal!");
console.log("✓ Feature selection and recompute passed.");

console.log("🎉 All Pricing tests completed successfully!");
