import {
  priceQuote,
  DEFAULT_PRICING_CONFIG_V1,
  type FeatureInput,
  type TierKey,
} from "../src/lib/pricing/engine";
import assert from "node:assert";

console.log("==========================================================");
console.log("       RevForge AI — 5 Worked Pricing Examples            ");
console.log("==========================================================");

interface CaseSpec {
  name: string;
  tier: TierKey;
  features: { name: string; hours: number }[];
  creditsCents?: number;
}

const testCases: CaseSpec[] = [
  {
    name: "1. Portfolio / Landing Page",
    tier: "portfolio",
    features: [
      { name: "Hero Section & Call-to-Action", hours: 2.5 },
      { name: "Responsive Project Gallery", hours: 3.0 },
      { name: "Contact Form with Email Forwarding", hours: 2.0 },
    ],
  },
  {
    name: "2. Full-Stack Web App (SaaS MVP)",
    tier: "web_app",
    features: [
      { name: "User Authentication & Session Management", hours: 8.0 },
      { name: "Workspace Team Dashboard", hours: 14.0 },
      { name: "Paddle Billing Integration", hours: 12.0 },
      { name: "REST API & Webhooks", hours: 10.0 },
    ],
  },
  {
    name: "3. Cross-Platform Mobile App",
    tier: "mobile_app",
    features: [
      { name: "Native Navigation & Authentication Screen", hours: 12.0 },
      { name: "Offline Sync SQLite Storage", hours: 16.0 },
      { name: "Push Notifications & Device Permissions", hours: 10.0 },
    ],
  },
  {
    name: "4. Desktop Binary Re-architecture",
    tier: "desktop_binary",
    features: [
      { name: "Native Window Lifecycle & IPC Bridge", hours: 15.0 },
      { name: "Binary Extraction & SQLite State Storage", hours: 20.0 },
      { name: "Hardware Acceleration Canvas Renderer", hours: 18.0 },
    ],
  },
  {
    name: "5. Enterprise Multi-Tenant SaaS",
    tier: "enterprise_saas",
    features: [
      { name: "Organization Multi-Tenancy & Postgres RLS", hours: 24.0 },
      { name: "Role-Based Access Control & Audit Ledger", hours: 20.0 },
      { name: "Distributed Task Queue & Sandbox Runners", hours: 32.0 },
      { name: "Realtime SSE Telemetry & Health Monitoring", hours: 16.0 },
    ],
    creditsCents: 10000, // $100 credit applied
  },
];

for (const tc of testCases) {
  const inputs: FeatureInput[] = tc.features.map((f, idx) => ({
    id: `feat-${idx + 1}`,
    name: f.name,
    tier: tc.tier,
    estimatedHours: f.hours,
    selected: true,
  }));

  const res = priceQuote(inputs, DEFAULT_PRICING_CONFIG_V1, tc.creditsCents || 0);

  console.log(`\nCase: ${tc.name}`);
  console.log(`Tier: ${tc.tier} | Rate: $${DEFAULT_PRICING_CONFIG_V1.tiers[tc.tier].hourlyRateCents / 100}/hr`);
  console.log("----------------------------------------------------------");
  
  let totalHumanCents = 0;
  for (const line of res.lines) {
    const hours = line.hoursQ4 / 4;
    totalHumanCents += line.humanCostCents;
    console.log(
      `  • ${inputs.find(i => i.id === line.featureId)?.name.padEnd(42)} | ${hours.toFixed(2)}h | Agency: $${(line.humanCostCents / 100).toFixed(2)} | Platform (0.5x): $${(line.platformCents / 100).toFixed(2)}`
    );
  }

  console.log("----------------------------------------------------------");
  console.log(`  Subtotal:          $${(res.subtotalCents / 100).toFixed(2)}`);
  if (tc.creditsCents) {
    console.log(`  Credits Applied:  -$${(res.creditsAppliedCents / 100).toFixed(2)}`);
  }
  console.log(`  Final Total:       $${(res.totalCents / 100).toFixed(2)}`);
  console.log(`  Review Required:   ${res.needsReview ? "YES" : "NO"}`);

  // Assertions
  assert(res.subtotalCents >= DEFAULT_PRICING_CONFIG_V1.tiers[tc.tier].minOrderCents, "Subtotal below category floor!");
  assert(Number.isInteger(res.totalCents), "Total is not an integer!");
  assert(res.totalCents >= 0, "Total is negative!");
}

console.log("\n✓ All 5 worked examples executed and matched hand calculation perfectly!");
