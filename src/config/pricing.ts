import { BUILD_MODELS } from "@/config/models";

/**
 * Real Token Pricing Table (prices per million tokens in USD, converted to cents).
 *
 * Source: Anthropic Published Pricing (https://www.anthropic.com/pricing, verified October 25, 2026):
 * - Claude Opus 5.5: $4.00 / million input, $20.00 / million output,
 *   $5.00 / million cache write (5-min TTL), $0.20 / million cache read, batch discount -50%.
 * - Claude 3.5 Sonnet: $3.00 / million input, $15.00 / million output,
 *   $3.75 / million cache write, $0.30 / million cache read.
 * - Claude 3.5 Haiku: $0.80 / million input, $4.00 / million output,
 *   $1.00 / million cache write, $0.08 / million cache read.
 */
export interface ModelTokenPricing {
  inputCentsPerMillion: number;
  outputCentsPerMillion: number;
  cacheWriteCentsPerMillion?: number;
  cacheReadCentsPerMillion?: number;
}

export const TOKEN_PRICING: Record<string, ModelTokenPricing> = {
  // Claude 3.5 Haiku / FAST
  "claude-3-5-haiku-20241022": {
    inputCentsPerMillion: 80,
    outputCentsPerMillion: 400,
    cacheWriteCentsPerMillion: 100,
    cacheReadCentsPerMillion: 8,
  },
  "claude-3-5-haiku-latest": {
    inputCentsPerMillion: 80,
    outputCentsPerMillion: 400,
    cacheWriteCentsPerMillion: 100,
    cacheReadCentsPerMillion: 8,
  },
  "claude-haiku-5-5": {
    inputCentsPerMillion: 80,
    outputCentsPerMillion: 400,
    cacheWriteCentsPerMillion: 100,
    cacheReadCentsPerMillion: 8,
  },

  // Claude 3.5 Sonnet / STANDARD
  "claude-3-5-sonnet-20241022": {
    inputCentsPerMillion: 300,
    outputCentsPerMillion: 1500,
    cacheWriteCentsPerMillion: 375,
    cacheReadCentsPerMillion: 30,
  },
  "claude-3-5-sonnet-latest": {
    inputCentsPerMillion: 300,
    outputCentsPerMillion: 1500,
    cacheWriteCentsPerMillion: 375,
    cacheReadCentsPerMillion: 30,
  },
  "claude-sonnet-5-5": {
    inputCentsPerMillion: 300,
    outputCentsPerMillion: 1500,
    cacheWriteCentsPerMillion: 375,
    cacheReadCentsPerMillion: 30,
  },

  // Claude 3.7 Sonnet
  "claude-3-7-sonnet-latest": {
    inputCentsPerMillion: 300,
    outputCentsPerMillion: 1500,
    cacheWriteCentsPerMillion: 375,
    cacheReadCentsPerMillion: 30,
  },
  "claude-3-7-sonnet-20250219": {
    inputCentsPerMillion: 300,
    outputCentsPerMillion: 1500,
    cacheWriteCentsPerMillion: 375,
    cacheReadCentsPerMillion: 30,
  },

  // Claude Opus 5.5 / Claude 3 Opus
  "claude-opus-5-5": {
    inputCentsPerMillion: 400,
    outputCentsPerMillion: 2000,
    cacheWriteCentsPerMillion: 500,
    cacheReadCentsPerMillion: 20,
  },
  "claude-3-opus-latest": {
    inputCentsPerMillion: 400,
    outputCentsPerMillion: 2000,
    cacheWriteCentsPerMillion: 500,
    cacheReadCentsPerMillion: 20,
  },
  "claude-3-opus-20240229": {
    inputCentsPerMillion: 1500,
    outputCentsPerMillion: 7500,
    cacheWriteCentsPerMillion: 1875,
    cacheReadCentsPerMillion: 150,
  },

  // NVIDIA NIM Models
  "minimaxai/minimax-m3.1-flash": { inputCentsPerMillion: 20, outputCentsPerMillion: 20 },
  "nvidia/nemotron-3-ultra-550b-a55b": { inputCentsPerMillion: 50, outputCentsPerMillion: 150 },
};

/**
 * Startup assertion: ensures every configured build model (FAST, STANDARD, PREMIUM)
 * has an explicit rate defined in TOKEN_PRICING.
 */
export function assertModelPricingConfigured(): void {
  const configuredModels = [BUILD_MODELS.FAST, BUILD_MODELS.STANDARD, BUILD_MODELS.PREMIUM];
  for (const model of configuredModels) {
    if (!TOKEN_PRICING[model]) {
      throw new Error(
        `[Pricing] Configured build model "${model}" has no defined token pricing in TOKEN_PRICING table.`
      );
    }
  }
}

// Enforce configuration at startup
assertModelPricingConfigured();

export interface UsageCostInput {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number | null;
  cacheReadInputTokens?: number | null;
}

/**
 * Calculates real execution cost in cents for model token consumption including prompt caching.
 * Throws on unknown models without any fallback.
 */
export function calculateUsageCostCents(usage: UsageCostInput): number {
  const pricing = TOKEN_PRICING[usage.model];
  if (!pricing) {
    throw new Error(
      `[Pricing] Unknown model "${usage.model}". Pricing is strictly configured without fallback.`
    );
  }
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputCentsPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputCentsPerMillion;
  const cacheWriteCost =
    ((usage.cacheCreationInputTokens || 0) / 1_000_000) *
    (pricing.cacheWriteCentsPerMillion ?? pricing.inputCentsPerMillion * 1.25);
  const cacheReadCost =
    ((usage.cacheReadInputTokens || 0) / 1_000_000) *
    (pricing.cacheReadCentsPerMillion ?? pricing.inputCentsPerMillion * 0.1);
  return Math.ceil(inputCost + outputCost + cacheWriteCost + cacheReadCost);
}

/**
 * Exact usage cost in micro-cents (1 cent = 1,000 micros). This keeps
 * fractional-cent provider charges in the cost ledger instead of rounding
 * every small call up to a cent.
 */
export function calculateUsageCostMicros(usage: UsageCostInput): number {
  const pricing = TOKEN_PRICING[usage.model];
  if (!pricing) {
    throw new Error(
      `[Pricing] Unknown model "${usage.model}". Pricing is strictly configured without fallback.`
    );
  }
  const inputCostCents =
    (usage.inputTokens / 1_000_000) * pricing.inputCentsPerMillion;
  const outputCostCents =
    (usage.outputTokens / 1_000_000) * pricing.outputCentsPerMillion;
  const cacheWriteCostCents =
    ((usage.cacheCreationInputTokens || 0) / 1_000_000) *
    (pricing.cacheWriteCentsPerMillion ?? pricing.inputCentsPerMillion * 1.25);
  const cacheReadCostCents =
    ((usage.cacheReadInputTokens || 0) / 1_000_000) *
    (pricing.cacheReadCentsPerMillion ?? pricing.inputCentsPerMillion * 0.1);
  return Math.round(
    (inputCostCents + outputCostCents + cacheWriteCostCents + cacheReadCostCents) * 1000
  );
}

/**
 * Platform Token & Credit System:
 * 1,000 Credits = $1.00 USD (i.e. 1 Credit = 0.1 cent = 1 token/cent in Studio pricing).
 * Balances are denominated in thousands (like LLM tokens).
 */
export const CREDITS_PER_USD = 1_000;

export function centsToCredits(cents: number): number {
  return Math.round(cents * 10);
}

export function centsToCreditsDisplay(cents: number): number {
  return Math.round(cents * 10);
}

export function formatCredits(cents: number): string {
  return (Math.round(cents * 10)).toLocaleString("en-US");
}

export function creditsToCents(credits: number): number {
  return Math.round((credits / CREDITS_PER_USD) * 100);
}

/**
 * System 1: Direct Clone (Pay-Per-Clone) Pricing
 * Flat, transparent rates for clean-room reconstruction.
 */
export interface CloneTierPricing {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  priceUsd: number;
  creditsRequired: number;
  maxRoutes: number;
  includedFeatures: string[];
}

export const DIRECT_CLONE_TIERS: CloneTierPricing[] = [
  {
    id: "portfolio",
    name: "Landing / Portfolio",
    subtitle: "Landing & Portfolio",
    description: "Single-page landing, marketing site, or personal portfolio with responsive layout.",
    priceUsd: 39,
    creditsRequired: 39_000,
    maxRoutes: 3,
    includedFeatures: ["Clean Next.js 15 source", "Tailwind CSS styling", "Responsive viewports", "Full commercial use rights"],
  },
  {
    id: "web_app",
    name: "Web App",
    subtitle: "Web App & Content",
    description: "Multi-page website, dynamic blog, documentation, or lightweight dashboard.",
    priceUsd: 79,
    creditsRequired: 79_000,
    maxRoutes: 8,
    includedFeatures: ["App Router architecture", "State management", "Server Actions", "Full test suites"],
  },
  {
    id: "mobile_app",
    name: "Mobile Binary",
    subtitle: "Mobile App & Portal",
    description: "Full-featured web/mobile app, auth flows, CRUD resources, and relational models.",
    priceUsd: 149,
    creditsRequired: 149_000,
    maxRoutes: 20,
    includedFeatures: ["PostgreSQL & Drizzle schema", "Protected route guards", "Mock API synthesis", "Pixelmatch verification"],
  },
  {
    id: "desktop_binary",
    name: "Desktop Binary",
    subtitle: "Desktop Binary Executable",
    description: "Cross-platform desktop application binary or native binary reverse engineering target.",
    priceUsd: 249,
    creditsRequired: 249_000,
    maxRoutes: 35,
    includedFeatures: ["Mobile responsive views", "Offline caching / SQLite", "Deep linking", "Optimized binaries"],
  },
  {
    id: "enterprise_saas",
    name: "Full SaaS",
    subtitle: "Complex SaaS Architecture",
    description: "Complex multi-role SaaS workflows, high-concurrency testing, and integrations.",
    priceUsd: 399,
    creditsRequired: 399_000,
    maxRoutes: 50,
    includedFeatures: ["Deep boundary deconstruction", "High-concurrency testing", "Custom domain routing", "Priority synthesis"],
  },
];

/**
 * System 2: Studio Token Credit Packs
 * STUDIO_MARKUP default 3.0, 1 token = 1¢.
 * Packs: $10 -> 1,100 tokens, $25 -> 2,900 tokens, $60 -> 7,200 tokens.
 */
export interface CreditBundle {
  id: string;
  name: string;
  tierLabel: string;
  credits: number;
  priceUsd: number;
  discountPct: number;
  badge?: string;
  description: string;
}

export const CREDIT_BUNDLES: CreditBundle[] = [
  {
    id: "bundle_10",
    name: "Starter Pack",
    tierLabel: "Entry Level",
    credits: 1_100,
    priceUsd: 10,
    discountPct: 10,
    description: "Ideal for initial studio customizations and component tweaks.",
  },
  {
    id: "bundle_25",
    name: "Builder Pack",
    tierLabel: "Professional",
    credits: 2_900,
    priceUsd: 25,
    discountPct: 16,
    badge: "Most Popular",
    description: "Covers extensive Studio AI refinements, UI polishing, and new screens.",
  },
  {
    id: "bundle_60",
    name: "Scale Pack",
    tierLabel: "Scale & Teams",
    credits: 7_200,
    priceUsd: 60,
    discountPct: 20,
    badge: "Best Value",
    description: "Sufficient for ongoing iterative edits, complex integrations, and large teams.",
  },
];
