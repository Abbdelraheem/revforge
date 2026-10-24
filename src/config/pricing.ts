import { BUILD_MODELS } from "@/config/models";

/**
 * Real Token Pricing Table (prices per million tokens in USD)
 * Converted to cents for integer math.
 *
 * Source: Anthropic Published Pricing (https://www.anthropic.com/pricing, verified February 2025 / October 2024):
 * - Claude 3.5 Haiku: $0.80 / million input, $4.00 / million output
 * - Claude 3.5 Sonnet: $3.00 / million input, $15.00 / million output
 * - Claude 3.7 Sonnet: $3.00 / million input, $15.00 / million output
 * - Claude 3 Opus: $15.00 / million input, $75.00 / million output
 */
export interface ModelTokenPricing {
  inputCentsPerMillion: number;
  outputCentsPerMillion: number;
}

export const TOKEN_PRICING: Record<string, ModelTokenPricing> = {
  // Claude 3.5 Haiku / FAST
  "claude-3-5-haiku-20241022": { inputCentsPerMillion: 80, outputCentsPerMillion: 400 },
  "claude-3-5-haiku-latest": { inputCentsPerMillion: 80, outputCentsPerMillion: 400 },
  "claude-haiku-5-5": { inputCentsPerMillion: 80, outputCentsPerMillion: 400 },

  // Claude 3.5 Sonnet / STANDARD
  "claude-3-5-sonnet-20241022": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },
  "claude-3-5-sonnet-latest": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },
  "claude-sonnet-5-5": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },

  // Claude 3.7 Sonnet
  "claude-3-7-sonnet-latest": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },
  "claude-3-7-sonnet-20250219": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },

  // Claude 3 Opus / PREMIUM
  "claude-3-opus-20240229": { inputCentsPerMillion: 1500, outputCentsPerMillion: 7500 },
  "claude-3-opus-latest": { inputCentsPerMillion: 1500, outputCentsPerMillion: 7500 },
  "claude-opus-5-5": { inputCentsPerMillion: 1500, outputCentsPerMillion: 7500 },

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

/**
 * Calculates real execution cost in cents for model token consumption.
 * Throws on unknown models without any fallback.
 */
export function calculateUsageCostCents(usage: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const pricing = TOKEN_PRICING[usage.model];
  if (!pricing) {
    throw new Error(
      `[Pricing] Unknown model "${usage.model}". Pricing is strictly configured without fallback.`
    );
  }
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputCentsPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputCentsPerMillion;
  return Math.ceil(inputCost + outputCost);
}

/**
 * Exact usage cost in micro-cents (1 cent = 1,000 micros). This keeps
 * fractional-cent provider charges in the cost ledger instead of rounding
 * every small call up to a cent.
 */
export function calculateUsageCostMicros(usage: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
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
  return Math.round((inputCostCents + outputCostCents) * 1000);
}

/**
 * Platform Token & Credit System:
 * 1,000 Credits = $1.00 USD (i.e. 1 Credit = 0.1 cent = 10 millicents).
 * Balances are denominated in thousands (like LLM tokens).
 */
export const CREDITS_PER_USD = 1_000;

export function centsToCredits(cents: number): number {
  return Math.round((cents / 100) * CREDITS_PER_USD);
}

export function creditsToCents(credits: number): number {
  return Math.round((credits / CREDITS_PER_USD) * 100);
}

/**
 * System 1: Direct Clone (Pay-Per-Clone) Pricing
 * Flat, affordable rates for clean-room reconstruction without Studio editing access.
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
    name: "Static / Landing Page",
    subtitle: "Landing & Portfolio",
    description: "Single-page landing, marketing site, or personal portfolio with responsive layout.",
    priceUsd: 19,
    creditsRequired: 19_000,
    maxRoutes: 3,
    includedFeatures: ["Clean Next.js 15 source", "Tailwind CSS styling", "Responsive viewports", "Full IP ownership"],
  },
  {
    id: "web_app",
    name: "Standard Web Application",
    subtitle: "Web App & Portal",
    description: "Multi-page website, dynamic blog, documentation, or lightweight dashboard.",
    priceUsd: 39,
    creditsRequired: 39_000,
    maxRoutes: 8,
    includedFeatures: ["App Router architecture", "State management", "Server Actions", "Full test suites"],
  },
  {
    id: "interactive_saas",
    name: "Interactive SaaS Application",
    subtitle: "Full SaaS Architecture",
    description: "Full-featured SaaS dashboard, auth flows, CRUD resources, and relational models.",
    priceUsd: 79,
    creditsRequired: 79_000,
    maxRoutes: 20,
    includedFeatures: ["PostgreSQL & Drizzle schema", "Protected route guards", "Mock API synthesis", "Pixelmatch verification"],
  },
  {
    id: "enterprise_binary",
    name: "Enterprise & Binary Target",
    subtitle: "Enterprise Systems",
    description: "Complex enterprise workflows, mobile APK extraction, or native desktop binaries.",
    priceUsd: 149,
    creditsRequired: 149_000,
    maxRoutes: 50,
    includedFeatures: ["Deep boundary deconstruction", "High-concurrency testing", "Custom domain routing", "Priority synthesis"],
  },
];

/**
 * System 2: Credit Token Bundles (Prepaid Balances)
 * Credits can be used for cloning, studio edits, and iterative enhancements.
 * Studio edits markup is 1.5x of provider API costs ($1.00 API = 1,500 credits deducted).
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
    id: "bundle_starter",
    name: "Starter Bundle",
    tierLabel: "Entry Level",
    credits: 25_000,
    priceUsd: 25,
    discountPct: 0,
    description: "Ideal for 1 landing page clone plus initial studio customizations.",
  },
  {
    id: "bundle_pro",
    name: "Pro Builder Bundle",
    tierLabel: "Professional",
    credits: 50_000,
    priceUsd: 45,
    discountPct: 10,
    badge: "Most Popular",
    description: "Covers a complete web app clone plus extensive studio AI refinements.",
  },
  {
    id: "bundle_agency",
    name: "Agency Pack",
    tierLabel: "Scale & Teams",
    credits: 120_000,
    priceUsd: 99,
    discountPct: 17.5,
    badge: "Best Value",
    description: "Sufficient for multiple complex SaaS applications and ongoing iterative edits.",
  },
];
