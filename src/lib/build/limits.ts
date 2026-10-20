export interface BuildLimits {
  maxIterations: number;
  maxWallClockMs: number;
  costCapCents: number;
  stagnationThreshold: number; // max iterations without parity improvement
}

export const DEFAULT_BUILD_LIMITS: BuildLimits = {
  maxIterations: 10,
  maxWallClockMs: 45 * 60 * 1000, // 45 minutes
  costCapCents: 5000, // $50 max LLM cost
  stagnationThreshold: 3, // abort if score does not improve for 3 cycles
};

export interface StagnationCheck {
  isStagnant: boolean;
  cyclesWithoutImprovement: number;
}

export function checkStagnation(history: number[], threshold = 3): StagnationCheck {
  if (history.length <= 1) return { isStagnant: false, cyclesWithoutImprovement: 0 };
  let best = history[0] ?? 0;
  let stagnantCount = 0;
  for (let i = 1; i < history.length; i++) {
    const current = history[i] ?? 0;
    if (current > best + 0.005) {
      best = current;
      stagnantCount = 0;
    } else {
      stagnantCount++;
    }
  }
  return {
    isStagnant: stagnantCount >= threshold,
    cyclesWithoutImprovement: stagnantCount,
  };
}

export function calculateCreditRefund(
  status: "delivered" | "delivered_partial" | "build_failed",
  paidCents: number,
  parityScore: number
): { refundCents: number; reason: string } {
  if (status === "delivered") {
    return { refundCents: 0, reason: "Full delivery completed" };
  }
  if (status === "delivered_partial") {
    // Partial delivery credit pro-rated by missing parity gap
    const penaltyRate = Math.max(0, 1 - parityScore);
    const refundCents = Math.round(paidCents * penaltyRate);
    return {
      refundCents,
      reason: `Partial delivery credit compensation (${Math.round(penaltyRate * 100)}% gap)`,
    };
  }
  // build_failed: 100% platform credit refund
  return {
    refundCents: paidCents,
    reason: "Full credit refund due to build failure",
  };
}
