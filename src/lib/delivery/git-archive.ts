import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fflate from "fflate";

const execFileAsync = promisify(execFile);

export interface GitSnapshot {
  label: string;
  createdAt: Date;
  zip: Buffer;
}

export interface GitArchiveResult {
  buffer: Buffer;
  sha256: string;
  sizeBytes: number;
  commitCount: number;
  headCommit: string;
}

const EXCLUDED_TOP_LEVEL = new Set(["node_modules", ".next", "dist", "build", "coverage"]);

function safeRelativePath(entryPath: string): string | null {
  const normalized = entryPath.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0")) return null;
  if (normalized.split("/").some((part) => part === ".." || part === "")) return null;
  return normalized;
}

function extractSnapshot(zip: Buffer): Map<string, Uint8Array> {
  const entries = fflate.unzipSync(new Uint8Array(zip));
  const files = new Map<string, Uint8Array>();

  for (const [entryPath, bytes] of Object.entries(entries)) {
    if (entryPath.endsWith("/")) continue;
    const safe = safeRelativePath(entryPath);
    if (!safe) continue;
    const top = safe.split("/")[0] || "";
    if (EXCLUDED_TOP_LEVEL.has(top) || top === ".git") continue;
    files.set(safe, bytes);
  }

  return files;
}

async function runGit(
  args: string[],
  cwd: string,
  env?: Record<string, string>
): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    env: { ...process.env, ...(env || {}) },
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trim();
}

async function collectDirectoryEntries(
  root: string,
  current: string,
  entries: Record<string, Uint8Array>
): Promise<void> {
  const dir = path.join(root, current);
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const relative = current ? `${current}/${item.name}` : item.name;
    if (item.isDirectory()) {
      await collectDirectoryEntries(root, relative, entries);
    } else if (item.isFile()) {
      entries[relative] = new Uint8Array(await fs.readFile(path.join(root, relative)));
    }
  }
}

/**
 * Builds a real Git repository from actual Studio version snapshots and returns
 * a ZIP that contains `.git` and one commit per snapshot. If git is unavailable
 * the caller receives the real command failure; no archive is fabricated.
 */
export async function buildGitArchive(
  snapshots: GitSnapshot[]
): Promise<GitArchiveResult> {
  if (snapshots.length === 0) {
    throw new Error("No delivered version is available to build a Git archive.");
  }

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "revforge-git-"));

  try {
    await runGit(["init", "-b", "main"], workspace);
    await runGit(["config", "user.name", "RevForge Delivery"], workspace);
    await runGit(["config", "user.email", "delivery@revforge.ai"], workspace);

    let previousFiles = new Set<string>();

    for (let index = 0; index < snapshots.length; index += 1) {
      const snapshot = snapshots[index];
      if (!snapshot) continue;
      const files = extractSnapshot(snapshot.zip);

      if (index > 0) {
        for (const previous of previousFiles) {
          if (!files.has(previous)) {
            await fs.rm(path.join(workspace, previous), { force: true });
          }
        }
      }

      for (const [filePath, bytes] of files) {
        const fullPath = path.join(workspace, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, bytes);
      }

      previousFiles = new Set(files.keys());
      await runGit(["add", "-A"], workspace);

      const message = (snapshot.label || `Version ${index + 1}`)
        .replace(/[\r\n]+/g, " ")
        .slice(0, 120);
      const isoDate = snapshot.createdAt.toISOString();
      await runGit(
        ["commit", "--allow-empty", "-m", message],
        workspace,
        { GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate }
      );
    }

    const headCommit = await runGit(["rev-parse", "HEAD"], workspace);
    const entries: Record<string, Uint8Array> = {};
    await collectDirectoryEntries(workspace, "", entries);
    const buffer = Buffer.from(fflate.zipSync(entries, { level: 6 }));

    return {
      buffer,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      sizeBytes: buffer.length,
      commitCount: snapshots.length,
      headCommit,
    };
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
