import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { zipSync, strToU8, unzipSync, strFromU8 } from "fflate";
import { afterEach, describe, expect, it } from "vitest";
import { buildGitArchive } from "@/lib/delivery/git-archive";

const execFileAsync = promisify(execFile);
const temporaryRoots: string[] = [];

function snapshot(files: Record<string, string>): Buffer {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(files)) {
    entries[name] = strToU8(content);
  }
  return Buffer.from(zipSync(entries, { level: 6 }));
}

afterEach(async () => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }
});

describe("Git delivery archive", () => {
  it(
    "creates one real commit per snapshot with the stored timestamps and file state",
    async () => {
      const firstDate = new Date("2026-10-01T10:00:00.000Z");
      const secondDate = new Date("2026-10-02T11:30:00.000Z");

      const result = await buildGitArchive([
        {
          label: "Initial delivery",
          createdAt: firstDate,
          zip: snapshot({
            "index.html": "<h1>One</h1>\n",
            "README.md": "first\n",
          }),
        },
        {
          label: "Tighten the hero",
          createdAt: secondDate,
          zip: snapshot({
            "index.html": "<h1>Two</h1>\n",
            "src/app.ts": "export const answer = 42;\n",
          }),
        },
      ]);

      expect(result.commitCount).toBe(2);
      expect(result.headCommit).toMatch(/^[a-f0-9]{40}$/);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.sizeBytes).toBe(result.buffer.length);

      const entries = unzipSync(new Uint8Array(result.buffer));
      expect(Object.keys(entries)).toContain(".git/HEAD");
      expect(Object.keys(entries).some((name) => name.startsWith(".git/objects/"))).toBe(true);
      expect(strFromU8(entries["index.html"]!)).toBe("<h1>Two</h1>\n");
      expect(entries["README.md"]).toBeUndefined();

      const root = await fs.mkdtemp(path.join(os.tmpdir(), "revforge-git-test-"));
      temporaryRoots.push(root);
      for (const [name, bytes] of Object.entries(entries)) {
        if (name.endsWith("/")) continue;
        const fullPath = path.join(root, name);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, bytes);
      }

      const { stdout: head } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: root,
      });
      expect(head.trim()).toBe(result.headCommit);

      const { stdout: subjects } = await execFileAsync(
        "git",
        ["log", "--reverse", "--format=%s"],
        { cwd: root }
      );
      expect(subjects.trim().split(/\r?\n/)).toEqual([
        "Initial delivery",
        "Tighten the hero",
      ]);

      const { stdout: dates } = await execFileAsync(
        "git",
        ["log", "--reverse", "--format=%aI"],
        { cwd: root }
      );
      expect(dates.trim().split(/\r?\n/).map((value) => new Date(value).toISOString())).toEqual([
        firstDate.toISOString(),
        secondDate.toISOString(),
      ]);

      const { stdout: headFile } = await execFileAsync(
        "git",
        ["show", "HEAD:index.html"],
        { cwd: root }
      );
      expect(headFile).toBe("<h1>Two</h1>\n");

      const { stdout: parentFile } = await execFileAsync(
        "git",
        ["show", "HEAD~1:README.md"],
        { cwd: root }
      );
      expect(parentFile).toBe("first\n");

      await expect(
        execFileAsync("git", ["show", "HEAD:README.md"], { cwd: root })
      ).rejects.toBeTruthy();
    },
    30_000
  );
});
