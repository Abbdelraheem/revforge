/**
 * Studio Economics Margin Health Model
 *
 * Failed or rejected edits cost model provider money but are free to the customer,
 * so expected gross margin = successRate * markup - 1.
 */

export interface StudioMarginHealthInput {
  markup: number;
  successRate: number; // between 0 and 1
  bufferTarget: number; // e.g. 0.30 for 30% gross margin target
}

export interface StudioMarginHealthResult {
  expectedMargin: number;
  healthy: boolean;
  recommendedMarkup: number | null;
}

export function studioMarginHealth({
  markup,
  successRate,
  bufferTarget,
}: StudioMarginHealthInput): StudioMarginHealthResult {
  if (successRate <= 0) {
    return {
      expectedMargin: -1,
      healthy: false,
      recommendedMarkup: null,
    };
  }

  const expectedMargin = successRate * markup - 1;
  const healthy = expectedMargin >= bufferTarget;
  const recommendedMarkup = (1 + bufferTarget) / successRate;

  return {
    expectedMargin,
    healthy,
    recommendedMarkup,
  };
}
