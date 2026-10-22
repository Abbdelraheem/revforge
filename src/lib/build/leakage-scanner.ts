import fs from "node:fs";
import path from "node:path";
import { scanCodebaseLeakage } from "./leakage";

export interface LeakageScannerOptions {
  workspaceDir: string;
  referenceCorpus: string[];
}

export interface LeakageScanResult {
  hasLeakage: boolean;
  maxSimilarity: number;
  offenders: string[];
}

const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build"]);
const IGNORED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".DS_Store",
]);

function readWorkspaceFilesRecursively(
  dir: string,
  baseDir: string
): Array<{ path: string; content: string }> {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: Array<{ path: string; content: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      results.push(...readWorkspaceFilesRecursively(path.join(dir, entry.name), baseDir));
    } else if (entry.isFile()) {
      if (IGNORED_FILES.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

      try {
        const stat = fs.statSync(fullPath);
        // Only inspect text files under 2 MB to avoid binary buffer lockup
        if (stat.size <= 2 * 1024 * 1024) {
          const content = fs.readFileSync(fullPath, "utf-8");
          results.push({ path: relPath, content });
        }
      } catch {}
    }
  }

  return results;
}

/**
 * Creates a leakage scanner instance that re-reads the real workspace on every invocation.
 */
export function createLeakageScanner(
  options: LeakageScannerOptions
): () => Promise<LeakageScanResult> {
  const { workspaceDir, referenceCorpus } = options;

  return async (): Promise<LeakageScanResult> => {
    // If reference corpus is empty, no leakage baseline can be evaluated
    if (!referenceCorpus || referenceCorpus.length === 0) {
      return {
        hasLeakage: false,
        maxSimilarity: 0,
        offenders: [],
      };
    }

    const files = readWorkspaceFilesRecursively(workspaceDir, workspaceDir);
    const check = scanCodebaseLeakage(files, referenceCorpus);

    return {
      hasLeakage: check.hasLeakage,
      maxSimilarity: check.maxSimilarity,
      offenders: check.matchedSamples,
    };
  };
}
