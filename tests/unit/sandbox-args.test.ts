import { describe, it, expect } from "vitest";
import { SandboxRunOptionsSchema, ExtractorCommandSchema } from "@/lib/sandbox/args";

describe("Sandbox Args & Zod Validation Suite", () => {
  it("validates correct sandbox options successfully", () => {
    const valid = {
      profile: "analyze",
      image: "revforge/sandbox-analyze:latest",
      args: ["--input", "/workspace/target.apk"],
      timeoutMs: 60000,
      workspacePath: "/tmp/job-123",
    };

    const parsed = SandboxRunOptionsSchema.parse(valid);
    expect(parsed.profile).toBe("analyze");
    expect(parsed.timeoutMs).toBe(60000);
  });

  it("rejects shell metacharacters in arguments", () => {
    const hostile = {
      profile: "analyze",
      image: "revforge/sandbox-analyze:latest",
      args: ["--input", "file; rm -rf /"],
      workspacePath: "/tmp/job-123",
    };

    expect(() => SandboxRunOptionsSchema.parse(hostile)).toThrow();
  });

  it("validates extractor command schema target kinds", () => {
    const cmd = {
      targetKind: "har_archive",
      targetPath: "/tmp/sample.har",
      outDir: "/tmp/out",
    };

    const parsed = ExtractorCommandSchema.parse(cmd);
    expect(parsed.targetKind).toBe("har_archive");
  });

  const dangerousChars = [";", "&&", "||", "|", "`", "$", ">", "<"];
  dangerousChars.forEach((ch, idx) => {
    it(`rejects shell injection character sequence #${idx + 1} (${ch}) in sandbox args`, () => {
      const hostile = {
        profile: "analyze" as const,
        image: "revforge/sandbox-analyze:latest",
        args: ["--param", `val${ch}injected`],
        workspacePath: "/tmp/job-123",
      };
      expect(() => SandboxRunOptionsSchema.parse(hostile)).toThrow();
    });
  });

  const targetKinds = [
    "url",
    "github_repo",
    "play_store",
    "app_store",
    "apk",
    "pe_binary",
    "elf_binary",
    "macho_binary",
    "asar_package",
    "har_archive",
  ] as const;
  targetKinds.forEach((kind) => {
    it(`validates extractor target kind: ${kind}`, () => {
      const parsed = ExtractorCommandSchema.parse({
        targetKind: kind,
        targetPath: `/tmp/test.${kind}`,
        outDir: "/tmp/out",
      });
      expect(parsed.targetKind).toBe(kind);
    });
  });
});
