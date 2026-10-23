import crypto from "node:crypto";

export interface FileEntry {
  path: string;
  content?: string;
  size?: number;
  sha256?: string;
}

export interface DiffStatResult {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

function splitLines(content: string): string[] {
  if (content.length === 0) return [];
  const lines = content.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Exact line-level diff using an LCS table. For very large files the table is
 * bounded and the result falls back to honest insert/delete counts rather than
 * an invented ratio.
 */
function diffLines(
  before: string[],
  after: string[]
): { insertions: number; deletions: number } {
  if (before.length === 0) return { insertions: after.length, deletions: 0 };
  if (after.length === 0) return { insertions: 0, deletions: before.length };

  const LIMIT = 2_000;
  if (before.length > LIMIT || after.length > LIMIT) {
    return {
      insertions: after.length,
      deletions: before.length,
    };
  }

  const rows = before.length + 1;
  const cols = after.length + 1;
  const table: number[] = new Array(rows * cols).fill(0);

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      table[i * cols + j] =
        before[i - 1] === after[j - 1]
          ? (table[(i - 1) * cols + (j - 1)] ?? 0) + 1
          : Math.max(
              table[(i - 1) * cols + j] ?? 0,
              table[i * cols + (j - 1)] ?? 0
            );
    }
  }

  const lcs = table[before.length * cols + after.length] ?? 0;
  return {
    insertions: after.length - lcs,
    deletions: before.length - lcs,
  };
}

/**
 * Computes a diff statistic from real file contents. When a base file's
 * content is unavailable, only the changed-file count is reported; insertions
 * and deletions are left at zero instead of being estimated.
 */
export function computeDiffStat(
  baseManifest: Array<{
    path: string;
    sha256?: string;
    size?: number;
    content?: string;
  }>,
  currentFiles: Array<{ path: string; content: string }>
): DiffStatResult {
  const baseMap = new Map<string, { sha256: string; content?: string }>();
  for (const item of baseManifest) {
    baseMap.set(item.path, {
      sha256: item.sha256 || "",
      ...(typeof item.content === "string" ? { content: item.content } : {}),
    });
  }

  let filesChanged = 0;
  let insertions = 0;
  let deletions = 0;

  const currentMap = new Map<string, string>();
  for (const file of currentFiles) {
    const hash = crypto.createHash("sha256").update(file.content).digest("hex");
    currentMap.set(file.path, hash);

    const base = baseMap.get(file.path);
    if (!base) {
      filesChanged += 1;
      insertions += splitLines(file.content).length;
      continue;
    }

    if (base.sha256 !== hash) {
      filesChanged += 1;
      if (typeof base.content === "string") {
        const delta = diffLines(
          splitLines(base.content),
          splitLines(file.content)
        );
        insertions += delta.insertions;
        deletions += delta.deletions;
      }
    }
  }

  for (const [basePath, base] of baseMap.entries()) {
    if (!currentMap.has(basePath)) {
      filesChanged += 1;
      if (typeof base.content === "string") {
        deletions += splitLines(base.content).length;
      }
    }
  }

  return {
    filesChanged,
    insertions,
    deletions,
  };
}

export function computeDiffStatFromContents(
  baseFiles: Array<{ path: string; content: string }>,
  currentFiles: Array<{ path: string; content: string }>
): DiffStatResult {
  const manifest = baseFiles.map((file) => ({
    path: file.path,
    content: file.content,
    sha256: crypto.createHash("sha256").update(file.content).digest("hex"),
  }));
  return computeDiffStat(manifest, currentFiles);
}
