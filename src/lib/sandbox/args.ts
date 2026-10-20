import { z } from "zod";

export const SandboxProfileNameSchema = z.enum(["analyze", "crawl", "verify"]);

export const SandboxRunOptionsSchema = z.object({
  profile: SandboxProfileNameSchema,
  image: z.string().min(1),
  args: z.array(z.string().regex(/^[^;&|`$><]+$/, "Illegal shell characters in argument")),
  timeoutMs: z.number().int().min(1000).max(600_000).default(360_000),
  workspacePath: z.string().min(1),
  env: z.record(z.string()).optional(),
  label: z.string().optional(),
});

export type SandboxRunOptions = z.infer<typeof SandboxRunOptionsSchema>;

export const ExtractorCommandSchema = z.object({
  targetKind: z.enum([
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
  ]),
  targetPath: z.string(),
  outDir: z.string(),
});

export type ExtractorCommand = z.infer<typeof ExtractorCommandSchema>;
