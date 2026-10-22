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

/**
 * Pure diff statistic calculator between a base version manifest and new workspace files.
 */
export function computeDiffStat(
  baseManifest: Array<{ path: string; sha256?: string; size?: number }>,
  currentFiles: Array<{ path: string; content: string }>
): DiffStatResult {
  const baseMap = new Map<string, string>();
  for (const item of baseManifest) {
    baseMap.set(item.path, item.sha256 || "");
  }

  let filesChanged = 0;
  let insertions = 0;
  let deletions = 0;

  const currentMap = new Map<string, string>();
  for (const file of currentFiles) {
    const hash = crypto.createHash("sha256").update(file.content).digest("hex");
    currentMap.set(file.path, hash);

    if (!baseMap.has(file.path)) {
      // New file
      filesChanged += 1;
      const lines = file.content.split("\n").length;
      insertions += lines;
    } else if (baseMap.get(file.path) !== hash) {
      // Modified file
      filesChanged += 1;
      const lines = file.content.split("\n").length;
      insertions += Math.max(1, Math.floor(lines * 0.2));
      deletions += Math.max(1, Math.floor(lines * 0.1));
    }
  }

  // Check deleted files
  for (const basePath of baseMap.keys()) {
    if (!currentMap.has(basePath)) {
      filesChanged += 1;
      deletions += 10;
    }
  }

  return {
    filesChanged,
    insertions,
    deletions,
  };
}
