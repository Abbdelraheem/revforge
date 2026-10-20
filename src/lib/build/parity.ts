export interface ParityBreakdown {
  visual: number; // weight 0.35
  structural: number; // weight 0.15
  behavioral: number; // weight 0.35
  buildHealth: number; // weight 0.15
  overall: number;
}

export const PARITY_WEIGHTS = {
  visual: 0.35,
  structural: 0.15,
  behavioral: 0.35,
  buildHealth: 0.15,
};

/**
 * Computes composite parity score with canonical weights:
 * 0.35 Visual (pixelmatch / ssim visual diff)
 * 0.15 Structural (AST route / component hierarchy match)
 * 0.35 Behavioral (integration tests / API payload contract)
 * 0.15 Build Health (clean compile, zero type errors, lint passed)
 */
export function computeParityScore(scores: {
  visual: number;
  structural: number;
  behavioral: number;
  buildHealth: number;
}): ParityBreakdown {
  const v = Math.min(1, Math.max(0, scores.visual));
  const s = Math.min(1, Math.max(0, scores.structural));
  const b = Math.min(1, Math.max(0, scores.behavioral));
  const h = Math.min(1, Math.max(0, scores.buildHealth));

  const overall = Number(
    (
      0.35 * v +
      0.15 * s +
      0.35 * b +
      0.15 * h
    ).toFixed(4)
  );

  return {
    visual: v,
    structural: s,
    behavioral: b,
    buildHealth: h,
    overall,
  };
}

/**
 * Image diff helper using pixel comparison or structural similarity (ssim / pixelmatch).
 * Compares two RGBA image buffers of dimensions width x height.
 */
export function compareImages(
  img1: Buffer,
  img2: Buffer,
  width: number,
  height: number
): { mismatchRatio: number; visualScore: number } {
  if (img1.length === 0 || img2.length === 0 || img1.length !== img2.length) {
    return { mismatchRatio: 1.0, visualScore: 0.0 };
  }

  let diffPixels = 0;
  const totalPixels = width * height;

  // Pixel comparison (pixelmatch style byte-by-byte comparison)
  for (let i = 0; i < img1.length; i += 4) {
    const r1 = img1[i] ?? 0;
    const r2 = img2[i] ?? 0;
    const g1 = img1[i + 1] ?? 0;
    const g2 = img2[i + 1] ?? 0;
    const b1 = img1[i + 2] ?? 0;
    const b2 = img2[i + 2] ?? 0;
    const a1 = img1[i + 3] ?? 0;
    const a2 = img2[i + 3] ?? 0;
    const dr = Math.abs(r1 - r2);
    const dg = Math.abs(g1 - g2);
    const db = Math.abs(b1 - b2);
    const da = Math.abs(a1 - a2);
    if (dr > 15 || dg > 15 || db > 15 || da > 15) {
      diffPixels++;
    }
  }

  const mismatchRatio = totalPixels > 0 ? diffPixels / totalPixels : 1.0;
  const visualScore = Number(Math.max(0, 1.0 - mismatchRatio).toFixed(4));

  return { mismatchRatio, visualScore };
}
