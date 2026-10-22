import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export interface ParityInput {
  visual: number | null; // weight 0.35
  structural: number | null; // weight 0.15
  behavioral: number | null; // weight 0.35
  buildHealth: number; // weight 0.15
}

export interface ParityBreakdown {
  visual: number | null;
  structural: number | null;
  behavioral: number | null;
  buildHealth: number;
  overall: number;
  coverage: number;
}

export const PARITY_WEIGHTS = {
  visual: 0.35,
  structural: 0.15,
  behavioral: 0.35,
  buildHealth: 0.15,
};

/**
 * Computes composite parity score with canonical weights (0.35/0.15/0.35/0.15).
 * Null dimensions are excluded and remaining active weights are renormalized.
 * Returns { visual, structural, behavioral, buildHealth, overall, coverage }.
 */
export function computeParityScore(scores: ParityInput): ParityBreakdown {
  const clamp = (val: number | null) =>
    val === null ? null : Math.min(1, Math.max(0, val));

  const v = clamp(scores.visual);
  const s = clamp(scores.structural);
  const b = clamp(scores.behavioral);
  const h = Math.min(1, Math.max(0, scores.buildHealth));

  let totalWeightedScore = 0;
  let coverage = 0;

  if (v !== null) {
    totalWeightedScore += PARITY_WEIGHTS.visual * v;
    coverage += PARITY_WEIGHTS.visual;
  }
  if (s !== null) {
    totalWeightedScore += PARITY_WEIGHTS.structural * s;
    coverage += PARITY_WEIGHTS.structural;
  }
  if (b !== null) {
    totalWeightedScore += PARITY_WEIGHTS.behavioral * b;
    coverage += PARITY_WEIGHTS.behavioral;
  }
  // buildHealth is always measurable
  totalWeightedScore += PARITY_WEIGHTS.buildHealth * h;
  coverage += PARITY_WEIGHTS.buildHealth;

  coverage = Number(coverage.toFixed(4));
  const overall =
    coverage === 0
      ? 0
      : Number((totalWeightedScore / coverage).toFixed(4));

  return {
    visual: v,
    structural: s,
    behavioral: b,
    buildHealth: h,
    overall,
    coverage,
  };
}

/**
 * Checks whether parity evaluation satisfies the delivery threshold.
 * passed = buildHealth > 0 && coverage >= 0.5 && overall >= threshold.
 * Build + structure alone (coverage 0.3) will NOT pass.
 */
export function isParityPassed(score: ParityBreakdown, threshold: number): boolean {
  return score.buildHealth > 0 && score.coverage >= 0.5 && score.overall >= threshold;
}

/**
 * Decodes PNG buffers and runs pixelmatch visual difference.
 */
export function comparePngBuffers(
  refBuffer: Buffer,
  renderedBuffer: Buffer
): { mismatchRatio: number; visualScore: number } {
  try {
    const img1 = PNG.sync.read(refBuffer);
    const img2 = PNG.sync.read(renderedBuffer);

    // If dimensions differ, penalize and adjust to common size
    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);

    const buf1 = Buffer.alloc(width * height * 4, 0);
    const buf2 = Buffer.alloc(width * height * 4, 0);

    // Copy img1 into buf1
    for (let y = 0; y < img1.height; y++) {
      for (let x = 0; x < img1.width; x++) {
        const srcIdx = (img1.width * y + x) << 2;
        const dstIdx = (width * y + x) << 2;
        buf1[dstIdx] = img1.data[srcIdx]!;
        buf1[dstIdx + 1] = img1.data[srcIdx + 1]!;
        buf1[dstIdx + 2] = img1.data[srcIdx + 2]!;
        buf1[dstIdx + 3] = img1.data[srcIdx + 3]!;
      }
    }

    // Copy img2 into buf2
    for (let y = 0; y < img2.height; y++) {
      for (let x = 0; x < img2.width; x++) {
        const srcIdx = (img2.width * y + x) << 2;
        const dstIdx = (width * y + x) << 2;
        buf2[dstIdx] = img2.data[srcIdx]!;
        buf2[dstIdx + 1] = img2.data[srcIdx + 1]!;
        buf2[dstIdx + 2] = img2.data[srcIdx + 2]!;
        buf2[dstIdx + 3] = img2.data[srcIdx + 3]!;
      }
    }

    const diff = new PNG({ width, height });
    const numDiffPixels = pixelmatch(
      buf1,
      buf2,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    const totalPixels = width * height;
    const mismatchRatio = totalPixels > 0 ? numDiffPixels / totalPixels : 0;
    const visualScore = Number(Math.max(0, 1 - mismatchRatio).toFixed(4));

    return { mismatchRatio, visualScore };
  } catch (err) {
    return { mismatchRatio: 1.0, visualScore: 0.0 };
  }
}

/**
 * Fallback image diff helper for raw RGBA buffers
 */
export function compareImages(
  img1: Buffer,
  img2: Buffer,
  width: number,
  height: number
): { mismatchRatio: number; visualScore: number } {
  try {
    const diff = Buffer.alloc(width * height * 4);
    const numDiff = pixelmatch(img1, img2, diff, width, height, { threshold: 0.1 });
    const totalPixels = width * height;
    const mismatchRatio = totalPixels > 0 ? numDiff / totalPixels : 0;
    return {
      mismatchRatio,
      visualScore: Number(Math.max(0, 1 - mismatchRatio).toFixed(4)),
    };
  } catch {
    return { mismatchRatio: 1.0, visualScore: 0.0 };
  }
}
