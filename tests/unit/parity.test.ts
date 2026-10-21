import { describe, it, expect } from "vitest";
import { computeParityScore, compareImages, PARITY_WEIGHTS } from "@/lib/build/parity";

describe("Parity Evaluation Suite", () => {
  it("enforces canonical weights (0.35 visual, 0.15 structural, 0.35 behavioral, 0.15 buildHealth)", () => {
    expect(PARITY_WEIGHTS.visual).toBe(0.35);
    expect(PARITY_WEIGHTS.structural).toBe(0.15);
    expect(PARITY_WEIGHTS.behavioral).toBe(0.35);
    expect(PARITY_WEIGHTS.buildHealth).toBe(0.15);

    const score = computeParityScore({
      visual: 1.0,
      structural: 1.0,
      behavioral: 1.0,
      buildHealth: 1.0,
    });

    expect(score.overall).toBe(1.0);

    const partialScore = computeParityScore({
      visual: 0.8,
      structural: 0.5,
      behavioral: 0.9,
      buildHealth: 1.0,
    });

    // 0.35*0.8 + 0.15*0.5 + 0.35*0.9 + 0.15*1.0 = 0.28 + 0.075 + 0.315 + 0.15 = 0.82
    expect(partialScore.overall).toBe(0.82);
  });

  it("performs pixel comparison between image buffers", () => {
    const width = 10;
    const height = 10;
    const totalBytes = width * height * 4;

    const img1 = Buffer.alloc(totalBytes, 255);
    const img2 = Buffer.alloc(totalBytes, 255);

    const identicalResult = compareImages(img1, img2, width, height);
    expect(identicalResult.mismatchRatio).toBe(0.0);
    expect(identicalResult.visualScore).toBe(1.0);

    // Modify half the pixels in img2
    for (let i = 0; i < totalBytes / 2; i += 4) {
      img2[i] = 0; // black red channel
    }

    const modifiedResult = compareImages(img1, img2, width, height);
    expect(modifiedResult.mismatchRatio).toBeGreaterThan(0.4);
    expect(modifiedResult.visualScore).toBeLessThan(0.6);
  });

  const parityPermutations = [
    { v: 1.0, s: 1.0, b: 1.0, h: 1.0, expected: 1.0 },
    { v: 0.0, s: 0.0, b: 0.0, h: 0.0, expected: 0.0 },
    { v: 1.0, s: 0.0, b: 0.0, h: 0.0, expected: 0.35 },
    { v: 0.0, s: 1.0, b: 0.0, h: 0.0, expected: 0.15 },
    { v: 0.0, s: 0.0, b: 1.0, h: 0.0, expected: 0.35 },
    { v: 0.0, s: 0.0, b: 0.0, h: 1.0, expected: 0.15 },
    { v: 0.5, s: 0.5, b: 0.5, h: 0.5, expected: 0.5 },
    { v: 0.9, s: 0.8, b: 0.7, h: 0.6, expected: 0.77 },
    { v: 0.2, s: 0.4, b: 0.6, h: 0.8, expected: 0.46 },
    { v: 0.85, s: 0.95, b: 0.75, h: 0.65, expected: 0.80 },
    { v: 0.6, s: 0.7, b: 0.8, h: 0.9, expected: 0.73 },
    { v: 0.95, s: 0.9, b: 0.85, h: 0.8, expected: 0.885 },
  ];

  parityPermutations.forEach(({ v, s, b, h, expected }, idx) => {
    it(`evaluates weighted composite parity score permutation #${idx + 1}`, () => {
      const score = computeParityScore({
        visual: v,
        structural: s,
        behavioral: b,
        buildHealth: h,
      });
      expect(score.overall).toBeCloseTo(expected, 2);
    });
  });
});
