import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { afterEach, describe, expect, it } from "vitest";
import { packageDelivery } from "@/lib/build/packager";
import { buildDeployGuide } from "@/lib/delivery/deploy-guide";

const temporaryRoots: string[] = [];

async function makeWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "revforge-package-test-"));
  temporaryRoots.push(root);
  await fs.mkdir(path.join(root, "node_modules", "left-pad"), { recursive: true });
  await fs.writeFile(path.join(root, "package.json"), '{"name":"fixture"}\n');
  await fs.writeFile(path.join(root, "index.html"), "<h1>Delivered</h1>\n");
  await fs.writeFile(path.join(root, ".env"), "SECRET=must-not-ship\n");
  await fs.writeFile(path.join(root, ".env.example"), "PUBLIC=example\n");
  await fs.writeFile(path.join(root, "node_modules", "left-pad", "index.js"), "module.exports=1\n");
  return root;
}

afterEach(async () => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }
});

describe("delivery packager", () => {
  it("adds DEPLOY.md, metadata and verifiable CHECKSUMS.txt while excluding secrets and dependencies", async () => {
    const workspaceDir = await makeWorkspace();
    let captured: { key: string; body: Buffer; contentType: string } | null = null;

    const result = await packageDelivery({
      workspaceDir,
      workspaceId: "00000000-0000-4000-8000-000000000001",
      projectId: "00000000-0000-4000-8000-000000000002",
      jobId: "00000000-0000-4000-8000-000000000003",
      status: "delivered",
      parity: {
        visual: 0.9,
        structural: 1,
        behavioral: 0.8,
        buildHealth: 1,
        overall: 0.9,
        coverage: 1,
      },
      leakage: { maxSimilarity: 0.01 },
      storage: {
        async putObject(key, body, contentType) {
          captured = { key, body: Buffer.from(body), contentType };
        },
      },
    });

    expect(captured).not.toBeNull();
    expect(captured!.contentType).toBe("application/zip");
    expect(captured!.key).toBe(
      "deliveries/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000003.zip"
    );

    const entries = unzipSync(new Uint8Array(captured!.body));
    const names = Object.keys(entries);
    expect(names).toContain("index.html");
    expect(names).toContain("package.json");
    expect(names).toContain(".env.example");
    expect(names).toContain("DEPLOY.md");
    expect(names).toContain("DELIVERY_METADATA.json");
    expect(names).toContain("CHECKSUMS.txt");
    expect(names).not.toContain(".env");
    expect(names.some((name) => name.startsWith("node_modules/"))).toBe(false);

    expect(strFromU8(entries["DEPLOY.md"]!)).toBe(buildDeployGuide());

    const metadata = JSON.parse(strFromU8(entries["DELIVERY_METADATA.json"]!));
    expect(metadata.projectId).toBe("00000000-0000-4000-8000-000000000002");
    expect(metadata.jobId).toBe("00000000-0000-4000-8000-000000000003");
    expect(metadata.status).toBe("delivered");
    expect(metadata.parity.overall).toBe(0.9);

    const checksumText = strFromU8(entries["CHECKSUMS.txt"]!);
    const listed = checksumText
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
        expect(match, `Malformed checksum line: ${line}`).not.toBeNull();
        return { digest: match![1]!, file: match![2]! };
      });

    expect(listed.map((entry) => entry.file).sort()).toEqual(
      names.filter((name) => name !== "CHECKSUMS.txt").sort()
    );

    for (const entry of listed) {
      const digest = crypto
        .createHash("sha256")
        .update(entries[entry.file]!)
        .digest("hex");
      expect(digest, `Checksum mismatch for ${entry.file}`).toBe(entry.digest);
    }

    expect(result.files).toEqual(expect.arrayContaining(["CHECKSUMS.txt", "DEPLOY.md"]));
    expect(result.sha256).toBe(
      crypto.createHash("sha256").update(captured!.body).digest("hex")
    );
    expect(result.sizeBytes).toBe(captured!.body.length);
  });

  it("does not claim verified dimensions that were not measured", async () => {
    const workspaceDir = await makeWorkspace();
    let captured = Buffer.alloc(0);

    await packageDelivery({
      workspaceDir,
      workspaceId: "00000000-0000-4000-8000-000000000011",
      projectId: "00000000-0000-4000-8000-000000000012",
      jobId: "00000000-0000-4000-8000-000000000013",
      status: "delivered_partial",
      parity: {
        visual: null,
        structural: null,
        behavioral: null,
        buildHealth: 1,
        overall: 0.15,
        coverage: 0.15,
      },
      leakage: { maxSimilarity: 0.01 },
      storage: {
        async putObject(_key, body) {
          captured = Buffer.from(body);
        },
      },
    });

    const entries = unzipSync(new Uint8Array(captured));
    const report = strFromU8(entries["PARITY_REPORT.md"]!);
    expect(report).toContain("Visual Parity: NOT VERIFIED");
    expect(report).toContain("Structural Parity: NOT VERIFIED");
    expect(report).toContain("Behavioral Parity: NOT VERIFIED");
    expect(report).toContain("Coverage Limitation");
    expect(report).not.toContain("Visual Parity: VERIFIED");
  });
});
