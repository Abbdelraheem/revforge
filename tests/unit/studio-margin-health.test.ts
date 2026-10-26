import { describe, it, expect } from "vitest";
import { studioMarginHealth } from "@/lib/studio/margin-health";

describe("studioMarginHealth", () => {
  it("calculates expected margin and health correctly when healthy", () => {
    // 80% success rate, 1.5x markup -> expected margin = 0.8 * 1.5 - 1 = 0.20 (20%)
    // bufferTarget = 0.15 -> healthy is true
    const result = studioMarginHealth({
      markup: 1.5,
      successRate: 0.8,
      bufferTarget: 0.15,
    });

    expect(result.expectedMargin).toBeCloseTo(0.2);
    expect(result.healthy).toBe(true);
    // recommendedMarkup = (1 + 0.15) / 0.8 = 1.4375
    expect(result.recommendedMarkup).toBeCloseTo(1.4375);
  });

  it("marks as unhealthy when expected margin is below buffer target", () => {
    // 60% success rate, 1.5x markup -> expected margin = 0.6 * 1.5 - 1 = -0.10 (-10%)
    const result = studioMarginHealth({
      markup: 1.5,
      successRate: 0.6,
      bufferTarget: 0.2,
    });

    expect(result.expectedMargin).toBeCloseTo(-0.1);
    expect(result.healthy).toBe(false);
    // recommendedMarkup = (1 + 0.20) / 0.6 = 2.0
    expect(result.recommendedMarkup).toBeCloseTo(2.0);
  });

  it("handles zero success rate safely without dividing by zero", () => {
    const result = studioMarginHealth({
      markup: 1.5,
      successRate: 0,
      bufferTarget: 0.2,
    });

    expect(result.expectedMargin).toBe(-1);
    expect(result.healthy).toBe(false);
    expect(result.recommendedMarkup).toBeNull();
  });
});
