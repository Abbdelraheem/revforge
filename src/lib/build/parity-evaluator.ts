export interface ParityWeights {
  visual: number;      // 0.35
  structure: number;   // 0.15
  behavior: number;    // 0.35
  buildHealth: number; // 0.15
}

export const DEFAULT_PARITY_WEIGHTS: ParityWeights = {
  visual: 0.35,
  structure: 0.15,
  behavior: 0.35,
  buildHealth: 0.15,
};

export interface IterationParityInput {
  visualScore: number;    // 0.0 - 1.0 (Playwright SSIM & pixelmatch)
  structureScore: number; // 0.0 - 1.0 (DOM landmark / role tree similarity)
  behaviorScore: number;  // 0.0 - 1.0 (Replay interaction & API contract schema)
  buildHealthScore: number; // 0.0 - 1.0 (Typecheck, lint, build pass, tests pass)
}

export interface ParityScoreResult {
  overallScore: number;
  isSuccessful: boolean;
  weights: ParityWeights;
  breakdown: IterationParityInput;
}

/**
 * Computes composite parity score per Section 8.5
 * Success threshold: score >= 0.95 (visual-heavy) or >= 0.90 (backend/best-effort)
 */
export function computeCompositeParityScore(
  scores: IterationParityInput,
  tier: string = "web_app",
  weights: ParityWeights = DEFAULT_PARITY_WEIGHTS
): ParityScoreResult {
  const overall =
    scores.visualScore * weights.visual +
    scores.structureScore * weights.structure +
    scores.behaviorScore * weights.behavior +
    scores.buildHealthScore * weights.buildHealth;

  const rounded = Math.round(overall * 1000) / 1000;
  const threshold = tier === "enterprise_saas" || tier === "desktop_binary" ? 0.90 : 0.95;

  return {
    overallScore: rounded,
    isSuccessful: rounded >= threshold,
    weights,
    breakdown: scores,
  };
}

/**
 * Detects stagnation across 3 consecutive build iterations (score delta < 0.005)
 */
export function checkParityStagnation(recentScores: number[]): boolean {
  if (recentScores.length < 3) return false;
  const s1 = recentScores[recentScores.length - 3]!;
  const s2 = recentScores[recentScores.length - 2]!;
  const s3 = recentScores[recentScores.length - 1]!;

  const d1 = Math.abs(s2 - s1);
  const d2 = Math.abs(s3 - s2);

  return d1 < 0.005 && d2 < 0.005;
}
