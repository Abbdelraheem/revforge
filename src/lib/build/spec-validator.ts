export interface SpecValidationResult {
  valid: boolean;
  violations: string[];
}

/**
 * Validates that clean-room specifications do not leak raw decompiled source code,
 * proprietary strings, or raw substrings > 200 characters from evidence dumps.
 */
export function validateCleanRoomSpec(
  specText: string,
  rawForbiddenCorpus: string[] = []
): SpecValidationResult {
  const violations: string[] = [];

  // 1. Check for raw source leakage using 200-character n-gram shingles
  const SHINGLE_SIZE = 200;
  if (specText.length >= SHINGLE_SIZE) {
    for (const rawSnippet of rawForbiddenCorpus) {
      if (!rawSnippet || rawSnippet.length < SHINGLE_SIZE) continue;
      // Extract sliding ngram windows
      for (let i = 0; i <= rawSnippet.length - SHINGLE_SIZE; i += 50) {
        const window = rawSnippet.slice(i, i + SHINGLE_SIZE);
        if (specText.includes(window)) {
          violations.push(
            `Raw source leakage detected: found exact ${SHINGLE_SIZE}-char continuous shingle match.`
          );
          break;
        }
      }
    }
  }

  // 2. Disallow raw secret strings or credentials
  const credentialPatterns = [
    /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
    /ghp_[a-zA-Z0-9]{36}/,
    /sk_live_[a-zA-Z0-9]{24}/,
    /AKIA[0-9A-Z]{16}/,
  ];

  for (const pattern of credentialPatterns) {
    if (pattern.test(specText)) {
      violations.push(`Security violation: raw secret/credential pattern detected in spec.`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
