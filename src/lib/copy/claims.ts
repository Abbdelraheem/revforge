export const RISKY_PATTERNS: RegExp[] = [
  /\b100%/i,
  new RegExp("\\b" + "guaran" + "tee(d)?\\b", "i"),
  /\bidentical\b/i,
  /\bexact\s+(copy|clone|replica)\b/i,
  /\bpixel[- ]perfect\b/i,
  /\bownership\b/i,
  /\bno\s+legal\s+risk\b/i,
  /\blegal(ly)?\s+safe\b/i,
  /\bundetectable\b/i,
  /\bbypass\b/i,
];

export function splitIntoSentences(text: string): string[] {
  const lines = text.split(/[\r\n]+/);
  const sentences: string[] = [];
  for (const line of lines) {
    const trimmed = line.replace(/[#*`_>]/g, " ").trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/(?<=[.?!])\s+/);
    for (const part of parts) {
      const s = part.trim();
      if (s.length > 0) sentences.push(s);
    }
  }
  return sentences;
}

/**
 * Returns sentences containing unapproved marketing/legal claims.
 * Sentences present verbatim in the allowlist are permitted.
 */
export function findUnapprovedClaims(
  text: string,
  allowlist: string[] = []
): string[] {
  const allowlistSet = new Set(
    allowlist.map((s) => s.trim().toLowerCase().replace(/\s+/g, " "))
  );
  const sentences = splitIntoSentences(text);
  const unapproved: string[] = [];

  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase().replace(/\s+/g, " ");
    if (allowlistSet.has(normalized)) {
      continue;
    }

    const matchesRisky = RISKY_PATTERNS.some((pattern) => pattern.test(sentence));
    if (matchesRisky) {
      unapproved.push(sentence);
    }
  }

  return unapproved;
}
