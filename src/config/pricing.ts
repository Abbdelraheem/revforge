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

  // Claude 3.5 Sonnet / STANDARD
  "claude-3-5-sonnet-20241022": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },
  "claude-3-5-sonnet-latest": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },

  // Claude 3.7 Sonnet
  "claude-3-7-sonnet-latest": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },
  "claude-3-7-sonnet-20250219": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },

  // Claude 3 Opus / PREMIUM
  "claude-3-opus-20240229": { inputCentsPerMillion: 1500, outputCentsPerMillion: 7500 },
  "claude-3-opus-latest": { inputCentsPerMillion: 1500, outputCentsPerMillion: 7500 },
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
