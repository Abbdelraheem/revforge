import crypto from "node:crypto";

export const LEAKAGE_SIMILARITY_THRESHOLD = 0.25;

/**
 * Creates k-shingles (substring n-grams) from text.
 */
export function createShingles(text: string, k = 5): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const shingles = new Set<string>();
  if (normalized.length < k) {
    shingles.add(normalized);
    return shingles;
  }
  for (let i = 0; i <= normalized.length - k; i++) {
    shingles.add(normalized.substring(i, i + k));
  }
  return shingles;
}

/**
 * Calculates Jaccard similarity between two shingle sets.
 */
export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface LeakageCheckResult {
  hasLeakage: boolean;
  maxSimilarity: number;
  threshold: number;
  matchedSamples: string[];
}

/**
 * Checks reconstructed code against proprietary reference code using MinHash / k-shingles.
 * Flags leakage if Jaccard similarity exceeds the strict 0.25 threshold.
 */
export function scanCodebaseLeakage(
  generatedFiles: Array<{ path: string; content: string }>,
  referenceCorpus: string[]
): LeakageCheckResult {
  let maxSimilarity = 0;
  const matchedSamples: string[] = [];

  const referenceShingles = referenceCorpus.map((text) => createShingles(text, 9));

  for (const file of generatedFiles) {
    if (!file.content || file.content.length < 50) continue;
    const genShingles = createShingles(file.content, 9);

    for (let i = 0; i < referenceShingles.length; i++) {
      const refSet = referenceShingles[i];
      if (!refSet) continue;
      const sim = calculateJaccardSimilarity(genShingles, refSet);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
      }
      if (sim >= 0.25) {
        matchedSamples.push(
          `File ${file.path} exceeded leakage threshold with reference snippet ${i + 1} (similarity: ${sim.toFixed(3)} >= 0.25)`
        );
      }
    }
  }

  return {
    hasLeakage: maxSimilarity >= 0.25,
    maxSimilarity,
    threshold: 0.25,
    matchedSamples,
  };
}
