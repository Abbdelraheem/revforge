export const STUDIO_GUARD_TOLERANCE = 0.05;
export const STUDIO_GUARD_COVERAGE_TOLERANCE = 0.1;

export interface EditScoreSnapshot {
  overall: number;
  buildHealth: number;
  coverage: number;
}

export interface EvaluateEditInput {
  baseline: EditScoreSnapshot;
  after: EditScoreSnapshot;
  tolerance?: number;
}

export interface EvaluateEditResult {
  accept: boolean;
  reason: string;
}

/**
 * Pure post-edit quality gate. An edit is rejected when it breaks the build,
 * meaningfully regresses overall parity, or loses more than ten percentage
 * points of verification coverage. It never invents a score.
 */
export function evaluateEdit({
  baseline,
  after,
  tolerance = STUDIO_GUARD_TOLERANCE,
}: EvaluateEditInput): EvaluateEditResult {
  const toleranceValue = Number.isFinite(tolerance) && tolerance > 0 ? tolerance : 0;

  if (!Number.isFinite(after.buildHealth) || after.buildHealth <= 0) {
    return {
      accept: false,
      reason: "Build health is zero after the edit.",
    };
  }

  if (after.overall < baseline.overall - toleranceValue) {
    return {
      accept: false,
      reason: `Overall parity regressed from ${baseline.overall.toFixed(4)} to ${after.overall.toFixed(4)} (tolerance ${toleranceValue.toFixed(4)}).`,
    };
  }

  if (after.coverage < baseline.coverage - STUDIO_GUARD_COVERAGE_TOLERANCE) {
    return {
      accept: false,
      reason: `Verification coverage dropped from ${baseline.coverage.toFixed(4)} to ${after.coverage.toFixed(4)}.`,
    };
  }

  return {
    accept: true,
    reason: "Edit preserved build health, parity, and verification coverage.",
  };
}
