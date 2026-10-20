/**
 * Computes 8-token shingle MinHash similarity between generated code and raw extracted source.
 * Strict Clean-Room Gate: Similarity >= 0.25 triggers independent re-write from Behavior Spec.
 */

function tokenize(code: string): string[] {
  // Strip comments and normalize whitespace
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
    .replace(/["'`][\s\S]*?["'`]/g, " STR ")
    .replace(/[^\w$]+/g, " ")
    .trim();
  return stripped.split(/\s+/).filter(Boolean);
}

function getShingles(tokens: string[], k: number = 8): Set<string> {
  const shingles = new Set<string>();
  if (tokens.length < k) {
    if (tokens.length > 0) shingles.add(tokens.join("_"));
    return shingles;
  }
  for (let i = 0; i <= tokens.length - k; i++) {
    shingles.add(tokens.slice(i, i + k).join("_"));
  }
  return shingles;
}

export function computeLeakageSimilarity(
  generatedCode: string,
  rawSourceCode: string,
  k: number = 8
): number {
  const genTokens = tokenize(generatedCode);
  const rawTokens = tokenize(rawSourceCode);

  if (genTokens.length === 0 || rawTokens.length === 0) {
    return 0.0;
  }

  const genShingles = getShingles(genTokens, k);
  const rawShingles = getShingles(rawTokens, k);

  if (genShingles.size === 0 || rawShingles.size === 0) {
    return 0.0;
  }

  let intersectionCount = 0;
  for (const s of genShingles) {
    if (rawShingles.has(s)) {
      intersectionCount++;
    }
  }

  const unionSize = genShingles.size + rawShingles.size - intersectionCount;
  if (unionSize <= 0) return 0.0;

  const similarity = intersectionCount / unionSize;
  return Math.round(similarity * 1000) / 1000;
}

export const LEAKAGE_THRESHOLD = 0.25;

export function evaluateLeakageGate(
  generatedFiles: Array<{ path: string; content: string }>,
  rawFiles: Array<{ path: string; content: string }>
): { passed: boolean; maxSimilarity: number; failingFiles: string[] } {
  let maxSimilarity = 0.0;
  const failingFiles: string[] = [];

  for (const gen of generatedFiles) {
    for (const raw of rawFiles) {
      const sim = computeLeakageSimilarity(gen.content, raw.content);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
      }
      if (sim >= LEAKAGE_THRESHOLD && !failingFiles.includes(gen.path)) {
        failingFiles.push(gen.path);
      }
    }
  }

  return {
    passed: failingFiles.length === 0,
    maxSimilarity,
    failingFiles,
  };
}
