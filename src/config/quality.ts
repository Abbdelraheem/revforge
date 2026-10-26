/**
 * Real-world quality benchmarks and calibration configuration.
 * Single source of truth for benchmark thresholds and quality gates.
 */

export interface QualityThresholds {
  /**
   * Minimum median parity across all benchmark targets.
   * Benchmarks below this threshold fail the gate.
   */
  minMedianParity: number;

  /**
   * Minimum overall parity required for an individual target to be considered delivered.
   */
  minOverallParity: number;

  /**
   * Minimum coverage required for delivered status (below this = delivered_partial).
   */
  minCoverage: number;

  /**
   * Maximum acceptable code similarity against reference corpus to prevent copyright leakage.
   */
  maxLeakageSimilarity: number;

  /**
   * Minimum success rate on scripted post-delivery Studio edits.
   */
  minStudioEditSuccessRate: number;
}

export const QUALITY_THRESHOLDS: QualityThresholds = {
  minMedianParity: 0.85,
  minOverallParity: 0.80,
  minCoverage: 0.80,
  maxLeakageSimilarity: 0.30,
  minStudioEditSuccessRate: 0.70,
};

export type TargetDifficultyTier =
  | "landing"
  | "multi-page"
  | "dashboard"
  | "content"
  | "ecommerce"
  | "crud"
  | "pwa"
  | "har"
  | "desktop"
  | "mobile"
  | "documentation"
  | "portfolio";

export interface ScriptedEditDefinition {
  id: string;
  instruction: string;
  checkType: "contains_text" | "route_exists" | "file_exists" | "custom";
  targetFile: string;
  expectedPattern: string;
}

export interface BenchmarkManifest {
  id: string;
  name: string;
  difficultyTier: TargetDifficultyTier;
  targetType: "web" | "har" | "asar" | "apk" | "pwa";
  entryPoint: string;
  expectedRoutes: string[];
  expectedFeatures: string[];
  estimatedHours: number;
  scriptedEdits: ScriptedEditDefinition[];
}

export interface TargetBenchmarkResult {
  targetId: string;
  name: string;
  tier: TargetDifficultyTier;
  targetType: BenchmarkManifest["targetType"];
  status: "delivered" | "delivered_partial" | "build_failed";
  parity: {
    visual: number | null;
    structural: number | null;
    behavioral: number | null;
    buildHealth: number;
    overall: number;
    coverage: number;
  };
  iterations: number;
  modelsUsed: string[];
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  totalTokens: number;
  providerCostCents: number;
  wallTimeMs: number;
  leakageMaxSimilarity: number;
  studioEditSuccessRate: number;
  studioEditsPassed: number;
  studioEditsTotal: number;
  diagnostics?: string[];
}

export interface BenchmarkSuiteResult {
  date: string;
  startedAt: string;
  finishedAt: string;
  mode: "live" | "dry";
  commitHash: string;
  host: string;
  modelIds: string[];
  targetCount: number;
  medianParity: number;
  medianCoverage: number;
  totalProviderCostCents: number;
  totalTokens: number;
  medianWallTimeMs: number;
  overallStudioEditSuccessRate: number;
  targets: TargetBenchmarkResult[];
  passed: boolean;
  failureReason?: string;
}

/**
 * Calculates median value for a list of numbers.
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1] ?? 0;
    const right = sorted[mid] ?? 0;
    return (left + right) / 2;
  }
  return sorted[mid] ?? 0;
}

/**
 * Validates a benchmark suite result against the launch thresholds. This is
 * intentionally strict: a suite only counts when it was produced by the live
 * pipeline, covered the full target set, and every web target has a real
 * visual score.
 */
export function validateBenchmarkSuite(
  suite: Omit<BenchmarkSuiteResult, "passed" | "failureReason">
): { passed: boolean; failureReason?: string } {
  if (suite.mode !== "live") {
    return { passed: false, failureReason: "Benchmark mode is not live." };
  }
  if (suite.targetCount < 12 || suite.targets.length < 12) {
    return {
      passed: false,
      failureReason: `Only ${suite.targets.length} targets ran; at least 12 are required.`,
    };
  }
  if (suite.modelIds.length === 0 || suite.modelIds.some((id) => !id)) {
    return { passed: false, failureReason: "Benchmark did not record its model ids." };
  }

  // 1. No target can end in build_failed
  const failedTarget = suite.targets.find((t) => t.status === "build_failed");
  if (failedTarget) {
    return {
      passed: false,
      failureReason: `Target ${failedTarget.targetId} ended in build_failed.`,
    };
  }

  // 2. Median parity must meet or exceed minMedianParity
  if (suite.medianParity < QUALITY_THRESHOLDS.minMedianParity) {
    return {
      passed: false,
      failureReason: `Median parity ${suite.medianParity.toFixed(3)} is below threshold ${QUALITY_THRESHOLDS.minMedianParity.toFixed(3)}.`,
    };
  }

  // 3. Median coverage must meet the delivery threshold
  if (suite.medianCoverage < QUALITY_THRESHOLDS.minCoverage) {
    return {
      passed: false,
      failureReason: `Median coverage ${suite.medianCoverage.toFixed(3)} is below threshold ${QUALITY_THRESHOLDS.minCoverage.toFixed(3)}.`,
    };
  }

  // 4. At least half of the targets must be fully delivered.
  const delivered = suite.targets.filter((t) => t.status === "delivered").length;
  if (delivered * 2 < suite.targets.length) {
    return {
      passed: false,
      failureReason: `Only ${delivered}/${suite.targets.length} targets were delivered.`,
    };
  }

  // 5. Web targets need a real visual score, not a missing measurement.
  const webWithoutVisual = suite.targets.find(
    (t) => t.targetType === "web" && t.parity.visual === null
  );
  if (webWithoutVisual) {
    return {
      passed: false,
      failureReason: `Web target ${webWithoutVisual.targetId} has no visual score.`,
    };
  }

  // 6. Prompt caching must have been exercised once a target needed more
  // than one builder iteration.
  const uncached = suite.targets.find(
    (t) => t.iterations >= 2 && t.cacheReadInputTokens <= 0
  );
  if (uncached) {
    return {
      passed: false,
      failureReason: `Target ${uncached.targetId} ran ${uncached.iterations} iterations without any cache-read tokens.`,
    };
  }

  // 7. Leakage max similarity must not exceed limit
  const leakingTarget = suite.targets.find(
    (t) => t.leakageMaxSimilarity > QUALITY_THRESHOLDS.maxLeakageSimilarity
  );
  if (leakingTarget) {
    return {
      passed: false,
      failureReason: `Target ${leakingTarget.targetId} exceeded leakage limit (${leakingTarget.leakageMaxSimilarity.toFixed(3)} > ${QUALITY_THRESHOLDS.maxLeakageSimilarity}).`,
    };
  }

  // 8. Studio edit success rate must meet minimum
  if (suite.overallStudioEditSuccessRate < QUALITY_THRESHOLDS.minStudioEditSuccessRate) {
    return {
      passed: false,
      failureReason: `Studio edit success rate ${suite.overallStudioEditSuccessRate.toFixed(2)} is below minimum ${QUALITY_THRESHOLDS.minStudioEditSuccessRate.toFixed(2)}.`,
    };
  }

  return { passed: true };
}
