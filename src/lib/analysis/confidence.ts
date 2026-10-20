import { TechnicalReportOutput, EvidenceItemOutputSchema } from "./types";

/**
 * Computes deterministic analysis confidence score based on empirical evidence coverage.
 * Formula:
 * - baseConfidence = 0.50
 * - Seen components add 0.20 per item (max +0.35)
 * - Inferred components add 0.10 per item (max +0.10)
 * - Unknown components subtract 0.05 (penalty for missing insight, min penalty 0.0)
 * Final score clamped to [0.50, 0.98]. Never returns a fabricated flat 0.98.
 */
export function computeEvidenceConfidence(
  evidenceLedger: Array<{ status: "seen" | "inferred" | "unknown_server_side" }>
): number {
  if (!evidenceLedger || evidenceLedger.length === 0) {
    return 0.50;
  }

  let seenCount = 0;
  let inferredCount = 0;
  let unknownCount = 0;

  for (const item of evidenceLedger) {
    if (item.status === "seen") seenCount++;
    else if (item.status === "inferred") inferredCount++;
    else if (item.status === "unknown_server_side") unknownCount++;
  }

  const seenBonus = Math.min(0.35, seenCount * 0.15);
  const inferredBonus = Math.min(0.10, inferredCount * 0.05);
  const unknownPenalty = Math.min(0.15, unknownCount * 0.03);

  const rawConfidence = 0.50 + seenBonus + inferredBonus - unknownPenalty;
  const clamped = Math.max(0.50, Math.min(0.98, rawConfidence));

  // Round to two decimal places
  return Math.round(clamped * 100) / 100;
}
