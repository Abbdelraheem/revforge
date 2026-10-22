/**
 * Real Token Pricing Table (prices per million tokens in USD)
 * Converted to cents for integer math.
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

  // Claude 3.7 Sonnet / Opus / PREMIUM
  "claude-3-7-sonnet-latest": { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },
  "claude-3-opus-20240229": { inputCentsPerMillion: 1500, outputCentsPerMillion: 7500 },
  "claude-opus-5-5": { inputCentsPerMillion: 1500, outputCentsPerMillion: 7500 },
};

const DEFAULT_PRICING: ModelTokenPricing = {
  inputCentsPerMillion: 300,
  outputCentsPerMillion: 1500,
};

/**
 * Calculates real execution cost in cents for model token consumption.
 */
export function calculateUsageCostCents(usage: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const pricing = TOKEN_PRICING[usage.model] || DEFAULT_PRICING;
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputCentsPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputCentsPerMillion;
  return Math.ceil(inputCost + outputCost);
}
