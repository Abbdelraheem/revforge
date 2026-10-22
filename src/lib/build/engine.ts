export interface LoopDeps {
  runBuilder(params: {
    iteration: number;
    role: "FAST" | "STANDARD" | "PREMIUM";
    model: string;
    unmet: string[];
    feedback?: string;
  }): Promise<{
    usage: {
      model: string;
      inputTokens: number;
      outputTokens: number;
    };
  }>;

  verify(params: { iteration: number }): Promise<{
    parity: {
      visual: number | null;
      structural: number | null;
      behavioral: number | null;
      buildHealth: number;
      overall: number;
      coverage: number;
    };
    obligations: Record<string, "verified" | "failed" | "pending">;
    diagnostics: string[];
  }>;

  scanLeakage(): Promise<{
    hasLeakage: boolean;
    maxSimilarity: number;
    offenders: string[];
  }>;

  scanSafety(): Promise<{
    passed: boolean;
    issues: string[];
  }>;

  checkpoint: {
    save(iteration: number, score: number): Promise<string>;
    restore(id: string): Promise<void>;
  };

  priceUsage(usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): number /* cents */;

  now(): number;

  emit(type: string, payload: any): void;
}

export interface LoopInput {
  obligations: string[];
  models: {
    FAST: string;
    STANDARD: string;
    PREMIUM: string;
  };
  limits: {
    maxIterations: number;
    maxWallClockMs: number;
    stagnationWindow: number;
    minImprovement: number;
  };
  costCapCents: number;
  thresholds: {
    success: number;
    partial: number;
  };
  waived?: string[];
}

export interface LoopResult {
  status: "delivered" | "delivered_partial" | "build_failed";
  stopReason:
    | "success"
    | "max_iterations"
    | "timeout"
    | "cost_cap"
    | "stagnation"
    | "fatal_error";
  bestScore: number;
  bestIteration: number;
  bestCheckpointId: string | null;
  iterations: number;
  spentCents: number;
  unmet: string[];
  roleHistory: string[];
}

/**
 * Pure Clean-Room Build Loop Engine
 * Implements strict iteration order: runBuilder -> scanSafety -> scanLeakage -> verify
 */
export async function runBuildLoop(
  input: LoopInput,
  deps: LoopDeps
): Promise<LoopResult> {
  const safeEmit = (type: string, payload: any) => {
    try {
      deps.emit(type, payload);
    } catch {}
  };

  safeEmit("build.loop.started", {
    obligations: input.obligations,
    costCapCents: input.costCapCents,
  });

  const startTime = deps.now();
  let spentCents = 0;
  let bestScore = 0;
  let bestIteration = 0;
  let bestCheckpointId: string | null = null;
  let currentRole: "FAST" | "STANDARD" | "PREMIUM" = "STANDARD";
  let stagnationCounter = 0;
  let consecutiveExceptions = 0;
  let unmet: string[] = [...input.obligations];
  let feedback: string | undefined = undefined;
  const roleHistory: string[] = [];
  let stopReason: LoopResult["stopReason"] | null = null;
  let totalIterationsExecuted = 0;

  const handleStagnation = () => {
    stagnationCounter++;
    if (
      currentRole === "STANDARD" &&
      stagnationCounter >= input.limits.stagnationWindow
    ) {
      currentRole = "PREMIUM";
      stagnationCounter = 0;
    } else if (
      currentRole === "PREMIUM" &&
      stagnationCounter >= input.limits.stagnationWindow
    ) {
      return true; // Stop due to stagnation
    }
    return false;
  };

  for (
    let iteration = 1;
    iteration <= input.limits.maxIterations;
    iteration++
  ) {
    // Check cost cap and timeout at the start of each iteration
    if (spentCents >= input.costCapCents) {
      stopReason = "cost_cap";
      break;
    }

    if (deps.now() - startTime >= input.limits.maxWallClockMs) {
      stopReason = "timeout";
      break;
    }

    totalIterationsExecuted = iteration;
    roleHistory.push(currentRole);
    const model = input.models[currentRole];

    // 1. runBuilder
    let builderRes;
    try {
      builderRes = await deps.runBuilder({
        iteration,
        role: currentRole,
        model,
        unmet,
        feedback,
      });
      consecutiveExceptions = 0;
      feedback = undefined;
    } catch (err: any) {
      consecutiveExceptions++;
      if (consecutiveExceptions >= 3) {
        stopReason = "fatal_error";
        break;
      }
      feedback = `Builder execution error at iteration ${iteration}: ${err?.message || String(err)}`;
      const shouldStop = handleStagnation();
      if (shouldStop) {
        stopReason = "stagnation";
        break;
      }
      continue;
    }

    // Accumulate real spend
    const iterCost = deps.priceUsage(builderRes.usage);
    spentCents += iterCost;

    // 2. scanSafety
    const safety = await deps.scanSafety();
    if (!safety.passed) {
      if (bestCheckpointId) {
        await deps.checkpoint.restore(bestCheckpointId);
      }
      feedback = `Safety policy violation: ${safety.issues.join("; ")}`;
      const shouldStop = handleStagnation();
      if (shouldStop) {
        stopReason = "stagnation";
        break;
      }
      continue;
    }

    // 3. scanLeakage
    const leakage = await deps.scanLeakage();
    if (leakage.hasLeakage) {
      if (bestCheckpointId) {
        await deps.checkpoint.restore(bestCheckpointId);
      }
      feedback = `Proprietary code leakage detected (similarity ${leakage.maxSimilarity.toFixed(2)}): ${leakage.offenders.join(", ")}`;
      const shouldStop = handleStagnation();
      if (shouldStop) {
        stopReason = "stagnation";
        break;
      }
      continue;
    }

    // 4. verify
    const verifyResult = await deps.verify({ iteration });
    const overallScore = verifyResult.parity.overall;

    // Update unmet obligations
    const nonWaived = input.obligations.filter(
      (ob) => !(input.waived || []).includes(ob)
    );
    unmet = nonWaived.filter(
      (ob) => verifyResult.obligations[ob] !== "verified"
    );

    const improvement = overallScore - bestScore;

    // Checkpoint saved only on strict improvement of overall score
    if (overallScore > bestScore) {
      bestScore = overallScore;
      bestIteration = iteration;
      bestCheckpointId = await deps.checkpoint.save(iteration, overallScore);
    }

    // Stagnation evaluation
    if (improvement < input.limits.minImprovement) {
      const shouldStop = handleStagnation();
      if (shouldStop) {
        stopReason = "stagnation";
        break;
      }
    } else {
      stagnationCounter = 0;
    }

    // Check for success
    if (unmet.length === 0 && bestScore >= input.thresholds.success) {
      stopReason = "success";
      break;
    }
  }

  if (!stopReason) {
    stopReason = "max_iterations";
  }

  // Restore the best checkpoint at loop exit
  if (bestCheckpointId) {
    try {
      await deps.checkpoint.restore(bestCheckpointId);
    } catch {}
  }

  // Determine final status
  let status: LoopResult["status"];
  if (stopReason === "success") {
    status = "delivered";
  } else if (bestScore >= input.thresholds.partial) {
    status = "delivered_partial";
  } else {
    status = "build_failed";
  }

  safeEmit("build.loop.finished", { status });

  return {
    status,
    stopReason,
    bestScore,
    bestIteration,
    bestCheckpointId,
    iterations: totalIterationsExecuted,
    spentCents,
    unmet,
    roleHistory,
  };
}
