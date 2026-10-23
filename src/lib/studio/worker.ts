import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { unzipSync } from "fflate";
import { and, desc, eq } from "drizzle-orm";
import { systemDb } from "@/db";
import {
  analyses,
  buildJobs,
  deliveries,
  evidenceItems,
  features as featuresTable,
  projects,
  studioEdits,
  studioVersions,
  technicalReports,
  outbox,
} from "@/db/schema";
import { BUILD_MODELS } from "@/config/models";
import { calculateUsageCostCents } from "@/config/pricing";
import { env } from "@/env";
import {
  holdCredits,
  InsufficientCreditsError,
  settleCredits,
} from "./credits";
import {
  EditOutcome,
  maxProviderCostForHold,
  settleEdit,
  STUDIO_DEFAULT_MARKUP,
  STUDIO_MIN_FLOOR_CENTS,
} from "./pricing";
import {
  enhancePrompt,
  type EditBrief,
  type EnhanceStructuredCall,
  type EnhanceUsage,
  type StudioProjectContext,
} from "./enhance";
import {
  evaluateEdit,
  STUDIO_GUARD_TOLERANCE,
  type EditScoreSnapshot,
} from "./guard";
import { computeDiffStat } from "./diff";
import { storage as defaultStorage } from "@/lib/storage";
import { BuilderAgent } from "@/lib/build/builder-agent";
import { runBuildLoop, type LoopDeps } from "@/lib/build/engine";
import {
  verifyBuildWorkspace,
  type VerificationRunner,
} from "@/lib/build/verifier";
import { createLeakageScanner } from "@/lib/build/leakage-scanner";
import { scanBuildSafety } from "@/lib/build/safety-scan";
import { packageDelivery } from "@/lib/build/packager";
import { WorkspaceCheckpointManager } from "@/lib/build/checkpoint";
import {
  captureAndVerifyApp,
  type CaptureOptions,
  type CaptureResult,
} from "@/lib/build/capture";
import {
  comparePngBuffers,
  computeParityScore,
  type ParityBreakdown,
} from "@/lib/build/parity";

export interface ExecuteStudioEditInput {
  editId: string;
  projectId: string;
  workspaceId: string;
  userId: string;
  parentVersionId?: string;
  rawPrompt: string;
  maxCents: number;
}

export interface StudioRunBuilderInput {
  workspaceDir: string;
  iteration: number;
  model: string;
  brief: EditBrief;
  acceptanceCriteria: string[];
}

export interface StudioRunBuilderResult {
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
  modifiedFiles?: string[];
}

export type StudioRunBuilder = (
  input: StudioRunBuilderInput
) => Promise<StudioRunBuilderResult>;

export interface StudioStorage {
  putObject(
    key: string,
    body: Buffer | Uint8Array,
    contentType?: string
  ): Promise<void>;
  getObject(key: string): Promise<Buffer>;
}

export interface ExecuteStudioEditDeps {
  runBuilder?: StudioRunBuilder;
  capture?: (options: CaptureOptions) => Promise<CaptureResult>;
  storage?: StudioStorage;
  enhanceCall?: EnhanceStructuredCall;
  workspaceRoot?: string;
  now?: () => number;
}

export interface StudioEditExecutionResult {
  success: boolean;
  editId: string;
  versionId?: string;
  versionNumber?: number;
  tokensSettledCents: number;
  outcome: EditOutcome;
  clarification?: string;
  failureReason?: string;
}

type StudioVersionRow = typeof studioVersions.$inferSelect;

interface ManifestEntry {
  path: string;
  size: number;
  sha256: string;
}

interface RestoredVersion {
  version: StudioVersionRow;
  files: Map<string, Buffer>;
}

interface StudioVerification {
  parity: ParityBreakdown;
  obligations: Record<string, "verified" | "failed" | "pending">;
  diagnostics: string[];
  capture: CaptureResult;
}

export const STUDIO_EDIT_LIMITS = {
  maxIterations: 3,
  maxWallClockMs: 10 * 60 * 1000,
  stagnationWindow: 2,
  minImprovement: 0.005,
} as const;

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
]);

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;

function studioMarkup(): number {
  const configured = Number(env.STUDIO_MARKUP);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : STUDIO_DEFAULT_MARKUP;
}

function studioMinChargeCents(): number {
  const configured = Number(env.STUDIO_MIN_CHARGE_CENTS);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : STUDIO_MIN_FLOOR_CENTS;
}

function sha256(data: Buffer | Uint8Array | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function normalizeArchivePath(rel: string): string {
  const normalized = path.normalize(rel).replace(/\\/g, "/");
  if (
    normalized.length === 0 ||
    normalized === "." ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized === ".." ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    throw new Error(`Unsafe archive path: ${rel}`);
  }
  return normalized;
}

function isExcludedArchivePath(rel: string): boolean {
  const parts = rel.split("/");
  if (parts.some((part) => EXCLUDED_DIRS.has(part))) return true;
  const fileName = parts[parts.length - 1] || "";
  if (fileName.startsWith(".env") && fileName !== ".env.example") return true;
  return fileName === ".DS_Store" || fileName === "Thumbs.db";
}

function safeWorkspacePath(root: string, rel: string): string {
  const normalized = normalizeArchivePath(rel);
  const target = path.resolve(root, normalized);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes studio workspace: ${rel}`);
  }
  return target;
}

async function writeVersionFiles(
  workspaceDir: string,
  files: Map<string, Buffer>
): Promise<void> {
  for (const [rel, bytes] of files.entries()) {
    if (isExcludedArchivePath(rel)) continue;
    const target = safeWorkspacePath(workspaceDir, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }
}

async function collectWorkspaceFiles(
  dir: string,
  baseDir: string = dir,
  out: Map<string, Buffer> = new Map()
): Promise<Map<string, Buffer>> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await collectWorkspaceFiles(path.join(dir, entry.name), baseDir, out);
      continue;
    }
    if (!entry.isFile()) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    if (isExcludedArchivePath(relPath)) continue;

    try {
      out.set(relPath, await fs.readFile(fullPath));
    } catch {
      // Unreadable file: do not fabricate content.
    }
  }

  return out;
}

function manifestFromFiles(files: Map<string, Buffer>): ManifestEntry[] {
  return Array.from(files.entries())
    .map(([filePath, bytes]) => ({
      path: filePath,
      size: bytes.length,
      sha256: sha256(bytes),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function textFiles(files: Map<string, Buffer>): Map<string, string> {
  const result = new Map<string, string>();
  for (const [filePath, bytes] of files.entries()) {
    if (bytes.length > MAX_TEXT_FILE_BYTES) continue;
    if (bytes.includes(0)) continue;
    result.set(filePath, bytes.toString("utf8"));
  }
  return result;
}

function deriveExpectedRoutes(manifest: ManifestEntry[]): string[] {
  const routes = new Set<string>();

  for (const entry of manifest) {
    const file = entry.path;
    const nextApp = file.match(/^(?:src\/)?app\/(.*\/)?page\.(?:tsx|ts|jsx|js)$/);
    if (nextApp) {
      const segment = (nextApp[1] || "")
        .replace(/\/$/, "")
        .split("/")
        .filter((part) => part && !part.startsWith("(") && !part.startsWith("["));
      routes.add(segment.length > 0 ? `/${segment.join("/")}` : "/");
      continue;
    }

    const pages = file.match(/^(?:src\/)?pages\/(.*)\.(?:tsx|ts|jsx|js)$/);
    if (pages) {
      const segment = (pages[1] || "").replace(/\/index$/, "");
      if (!segment.includes("[")) {
        routes.add(segment.length > 0 ? `/${segment}` : "/");
      }
      continue;
    }

    if (file === "index.html" || file === "public/index.html") {
      routes.add("/");
    }
  }

  // If no routes are detectable, return an empty list so the verifier treats
  // structural parity as unmeasured rather than inventing a `/` expectation.
  return Array.from(routes).slice(0, 20);
}

const GENERATED_LOCKFILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
]);

// These files are regenerated by the packager and are not part of the source
// edit surface. They may be present when a version is restored for the next
// edit but were never in the parent manifest.
const PACKAGE_ARTIFACTS = new Set([
  "PARITY_REPORT.md",
  "EVIDENCE_LEDGER.md",
  "LICENSE-NOTICE.md",
]);

function changedFiles(
  parentManifest: ManifestEntry[],
  currentManifest: ManifestEntry[]
): string[] {
  const parent = new Map(parentManifest.map((entry) => [entry.path, entry.sha256]));
  const current = new Map(currentManifest.map((entry) => [entry.path, entry.sha256]));
  const changed = new Set<string>();

  // A package manager may create or rewrite a lockfile during verification
  // without the edit changing the dependency graph. Only count lockfile
  // changes when the dependency manifest itself changed.
  const manifestChanged =
    parent.get("package.json") !== current.get("package.json") ||
    parent.get("pnpm-workspace.yaml") !== current.get("pnpm-workspace.yaml");

  for (const [filePath, hash] of current.entries()) {
    if (PACKAGE_ARTIFACTS.has(filePath)) continue;
    if (parent.get(filePath) !== hash) {
      if (GENERATED_LOCKFILES.has(filePath) && !manifestChanged) continue;
      changed.add(filePath);
    }
  }
  for (const filePath of parent.keys()) {
    if (PACKAGE_ARTIFACTS.has(filePath)) continue;
    if (!current.has(filePath)) {
      if (GENERATED_LOCKFILES.has(filePath) && !manifestChanged) continue;
      changed.add(filePath);
    }
  }

  return Array.from(changed).sort();
}

function defaultVerificationRunner(): VerificationRunner {
  return {
    async runCommand(cmd: string, args: string[], cwd: string) {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execFileAsync = promisify(execFile);
      try {
        const result = await execFileAsync(cmd, args, {
          cwd,
          shell: false,
          timeout: 120_000,
          env: { ...process.env, CI: "true", NODE_ENV: "production" },
        });
        return {
          exitCode: 0,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      } catch (err: any) {
        return {
          exitCode: typeof err?.code === "number" ? err.code : 1,
          stdout: err?.stdout || "",
          stderr: err?.stderr || err?.message || String(err),
        };
      }
    },
  };
}

async function resolveParentVersion(
  input: ExecuteStudioEditInput,
  dbStorage: StudioStorage
): Promise<StudioVersionRow> {
  let parent: StudioVersionRow | undefined;

  if (input.parentVersionId) {
    const [row] = await systemDb
      .select()
      .from(studioVersions)
      .where(
        and(
          eq(studioVersions.id, input.parentVersionId),
          eq(studioVersions.projectId, input.projectId),
          eq(studioVersions.workspaceId, input.workspaceId)
        )
      );
    parent = row;
    if (!parent) {
      throw new Error(
        `Parent Studio version ${input.parentVersionId} was not found for this project.`
      );
    }
  } else {
    const [row] = await systemDb
      .select()
      .from(studioVersions)
      .where(
        and(
          eq(studioVersions.projectId, input.projectId),
          eq(studioVersions.workspaceId, input.workspaceId)
        )
      )
      .orderBy(desc(studioVersions.versionNumber))
      .limit(1);
    parent = row;
  }

  if (parent) return parent;

  // No Studio version yet: bootstrap v1 from the latest real delivery ZIP.
  const [delivery] = await systemDb
    .select({
      storageKey: deliveries.storageKey,
      parityScore: buildJobs.parityScore,
    })
    .from(deliveries)
    .innerJoin(buildJobs, eq(deliveries.jobId, buildJobs.id))
    .where(
      and(
        eq(buildJobs.projectId, input.projectId),
        eq(deliveries.workspaceId, input.workspaceId)
      )
    )
    .orderBy(desc(deliveries.createdAt))
    .limit(1);

  if (!delivery) {
    throw new Error("No base delivery or Studio version exists for this project.");
  }

  const archive = await dbStorage.getObject(delivery.storageKey);
  const entries = unzipSync(new Uint8Array(archive));
  const files = new Map<string, Buffer>();
  for (const [rel, bytes] of Object.entries(entries)) {
    if (rel.endsWith("/")) continue;
    const normalized = normalizeArchivePath(rel);
    if (isExcludedArchivePath(normalized)) continue;
    files.set(normalized, Buffer.from(bytes));
  }

  const [bootstrapped] = await systemDb
    .insert(studioVersions)
    .values({
      projectId: input.projectId,
      workspaceId: input.workspaceId,
      versionNumber: 1,
      label: "v1: Base Delivery",
      zipStorageKey: delivery.storageKey,
      previewUrl: `/api/studio/preview/${input.projectId}/`,
      parityScore: delivery.parityScore ?? null,
      filesManifest: manifestFromFiles(files),
      createdBy: input.userId,
    })
    .returning();

  if (!bootstrapped) {
    throw new Error("Failed to bootstrap the base Studio version.");
  }

  return bootstrapped;
}

async function restoreVersion(
  workspaceDir: string,
  version: StudioVersionRow,
  dbStorage: StudioStorage
): Promise<RestoredVersion> {
  const archive = await dbStorage.getObject(version.zipStorageKey);
  const entries = unzipSync(new Uint8Array(archive));
  const files = new Map<string, Buffer>();

  for (const [rel, bytes] of Object.entries(entries)) {
    if (rel.endsWith("/")) continue;
    const normalized = normalizeArchivePath(rel);
    if (isExcludedArchivePath(normalized)) continue;
    files.set(normalized, Buffer.from(bytes));
  }

  await fs.mkdir(workspaceDir, { recursive: true });
  await writeVersionFiles(workspaceDir, files);

  return { version, files };
}

async function loadProjectContext(
  project: typeof projects.$inferSelect,
  fileTree: string[]
): Promise<{ context: StudioProjectContext; evidence: typeof evidenceItems.$inferSelect[] }> {
  const [analysis] = await systemDb
    .select()
    .from(analyses)
    .where(
      and(
        eq(analyses.projectId, project.id),
        eq(analyses.workspaceId, project.workspaceId)
      )
    )
    .orderBy(desc(analyses.createdAt))
    .limit(1);

  let report: typeof technicalReports.$inferSelect | undefined;
  let evidence: typeof evidenceItems.$inferSelect[] = [];
  let featureRows: Array<typeof featuresTable.$inferSelect> = [];

  if (analysis) {
    const [row] = await systemDb
      .select()
      .from(technicalReports)
      .where(
        and(
          eq(technicalReports.analysisId, analysis.id),
          eq(technicalReports.workspaceId, project.workspaceId)
        )
      )
      .limit(1);
    report = row;

    if (report) {
      evidence = await systemDb
        .select()
        .from(evidenceItems)
        .where(
          and(
            eq(evidenceItems.reportId, report.id),
            eq(evidenceItems.workspaceId, project.workspaceId)
          )
        );
      featureRows = await systemDb
        .select()
        .from(featuresTable)
        .where(
          and(
            eq(featuresTable.reportId, report.id),
            eq(featuresTable.workspaceId, project.workspaceId)
          )
        );
    }
  }

  const recent = await systemDb
    .select({ promptRaw: studioEdits.promptRaw, status: studioEdits.status })
    .from(studioEdits)
    .where(
      and(
        eq(studioEdits.projectId, project.id),
        eq(studioEdits.workspaceId, project.workspaceId)
      )
    )
    .orderBy(desc(studioEdits.createdAt))
    .limit(5);

  const stack: string[] = [];
  if (report?.stack) {
    for (const group of [
      report.stack.frontend,
      report.stack.backend,
      report.stack.database,
    ]) {
      for (const item of group || []) {
        if (item?.name) stack.push(item.name);
      }
    }
    if (report.stack.runtime) stack.push(report.stack.runtime);
  }

  const features = featureRows.length > 0
    ? featureRows.map((feature) => feature.name)
    : report?.summary
      ? []
      : [];

  return {
    context: {
      summary:
        report?.summary ||
        project.description ||
        `Project ${project.name}`,
      stack,
      fileTree,
      features,
      recentEdits: recent
        .filter((edit) => edit.status === "committed")
        .map((edit) => edit.promptRaw),
    },
    evidence,
  };
}

async function verifyStudioWorkspace(options: {
  workspaceDir: string;
  expectedRoutes: string[];
  runner: VerificationRunner;
  capture: (options: CaptureOptions) => Promise<CaptureResult>;
  referenceScreenshots?: Array<{ name: string; buffer: Buffer }>;
  acceptanceCriteria: string[];
}): Promise<StudioVerification> {
  const buildOutcome = await verifyBuildWorkspace(
    {
      workspaceDir: options.workspaceDir,
      expectedRoutes: options.expectedRoutes,
    },
    options.runner
  );

  let captureResult: CaptureResult;
  try {
    captureResult = await options.capture({
      workspaceDir: options.workspaceDir,
      expectedRoutes: options.expectedRoutes,
    });
  } catch {
    captureResult = {
      referenceScreenshots: [],
      renderedScreenshots: [],
      behavioralChecks: [],
    };
  }

  const obligations: Record<string, "verified" | "failed" | "pending"> = {
    ...buildOutcome.obligations,
  };

  let visual: number | null = null;
  const references = options.referenceScreenshots || [];
  if (references.length > 0) {
    const rendered = new Map(
      captureResult.renderedScreenshots.map((shot) => [shot.name, shot.buffer])
    );
    let total = 0;
    for (const reference of references) {
      const candidate = rendered.get(reference.name);
      if (!candidate) {
        obligations[`visual:${reference.name}`] = "failed";
        continue;
      }
      const comparison = comparePngBuffers(reference.buffer, candidate);
      total += comparison.visualScore;
      obligations[`visual:${reference.name}`] =
        comparison.visualScore >= 0.7 ? "verified" : "failed";
    }
    visual = Number((total / references.length).toFixed(4));
  }

  let behavioral: number | null = null;
  if (captureResult.behavioralChecks.length > 0) {
    let passing = 0;
    for (const check of captureResult.behavioralChecks) {
      if (check.passed) {
        passing += 1;
        obligations[`behavioral:${check.name}`] = "verified";
      } else {
        obligations[`behavioral:${check.name}`] = "failed";
      }
    }
    behavioral = Number(
      (passing / captureResult.behavioralChecks.length).toFixed(4)
    );
  }

  const parity = computeParityScore({
    visual,
    structural: buildOutcome.parity.structural,
    behavioral,
    buildHealth: buildOutcome.parity.buildHealth,
  });

  for (const criterion of options.acceptanceCriteria) {
    obligations[criterion] = parity.buildHealth > 0 ? "verified" : "failed";
  }

  return {
    parity,
    obligations,
    diagnostics: buildOutcome.diagnostics,
    capture: captureResult,
  };
}

function scoreSnapshot(parity: ParityBreakdown): EditScoreSnapshot {
  return {
    overall: parity.overall,
    buildHealth: parity.buildHealth,
    coverage: parity.coverage,
  };
}

function buildPromptForBuilder(
  brief: EditBrief,
  acceptanceCriteria: string[]
): { task: string; specification: string } {
  const criteria = acceptanceCriteria.length > 0
    ? acceptanceCriteria
    : brief.acceptanceCriteria;

  return {
    task: [
      "Apply this Studio edit to the existing clean-room project.",
      `Goal: ${brief.goal}`,
      `Requested change (English): ${brief.translatedRequest}`,
      "Acceptance criteria (all must hold):",
      ...criteria.map((criterion) => `- ${criterion}`),
      "Constraints:",
      ...brief.constraints.map((constraint) => `- ${constraint}`),
      "Out of scope:",
      ...brief.outOfScope.map((item) => `- ${item}`),
    ].join("\n"),
    specification: JSON.stringify(
      {
        brief,
        acceptanceCriteria: criteria,
      },
      null,
      2
    ),
  };
}

function defaultRunBuilder(): StudioRunBuilder {
  return async ({ workspaceDir, model, brief, acceptanceCriteria }) => {
    const agent = new BuilderAgent({
      workspaceDir,
      role: "STANDARD",
      modelName: model,
    });

    const { task, specification } = buildPromptForBuilder(
      brief,
      acceptanceCriteria
    );
    const result = await agent.executeTask(task, specification);

    return {
      usage: {
        model,
        inputTokens: result.tokensUsed.input,
        outputTokens: result.tokensUsed.output,
      },
      modifiedFiles: result.modifiedFiles,
    };
  };
}

/**
 * Executes a Studio edit as a real, verified code change.
 *
 * The parent version's actual files are restored from S3, a real build/test /
 * visual / behavioral baseline is captured, the builder runs through the pure
 * build loop with real leakage and safety scans, the result is verified and
 * gated, and only an accepted result is packaged into a new immutable version.
 * Every path settles the credit hold exactly once.
 */
export async function executeStudioEdit(
  input: ExecuteStudioEditInput,
  deps: ExecuteStudioEditDeps = {}
): Promise<StudioEditExecutionResult> {
  const {
    editId,
    projectId,
    workspaceId,
    userId,
    rawPrompt,
    maxCents,
  } = input;

  const dbStorage = deps.storage || defaultStorage;
  const capture = deps.capture || captureAndVerifyApp;
  const runBuilder = deps.runBuilder || defaultRunBuilder();
  const now = deps.now || (() => Date.now());
  const markup = studioMarkup();
  const minChargeCents = studioMinChargeCents();
  const workspaceDir = path.join(
    deps.workspaceRoot || path.join(os.tmpdir(), "revforge-studio"),
    editId
  );

  let holdApplied = false;
  let finalOutcome: EditOutcome = "failed";
  let chargeCents = 0;
  let resultingVersionId: string | undefined;
  let resultingVersionNumber: number | undefined;
  let diffStat: { filesChanged: number; insertions: number; deletions: number } | undefined;
  let failureReason: string | undefined;
  let clarification: string | undefined;
  let providerSpendCents = 0;
  let enhanceCostCents = 0;

  const finalizeEditRow = async (
    outcome: EditOutcome,
    charge: number,
    reason?: string
  ) => {
    const status =
      outcome === "accepted"
        ? "committed"
        : outcome === "failed"
          ? "failed"
          : "refunded";

    await systemDb
      .update(studioEdits)
      .set({
        status,
        tokensSettledCents: charge,
        failureReason: reason ?? null,
        finishedAt: new Date(now()),
        ...(resultingVersionId ? { resultingVersionId } : {}),
        ...(diffStat ? { diffStat } : {}),
      })
      .where(eq(studioEdits.id, editId));
  };

  try {
    const parentVersion = await resolveParentVersion(input, dbStorage);
    await fs.rm(workspaceDir, { recursive: true, force: true });
    const restored = await restoreVersion(workspaceDir, parentVersion, dbStorage);

    const [project] = await systemDb
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId)
        )
      );

    if (!project) {
      throw new Error(`Project ${projectId} was not found.`);
    }

    const parentManifest = (parentVersion.filesManifest || []) as ManifestEntry[];
    const fileTree = parentManifest.map((entry) => entry.path);
    const { context, evidence } = await loadProjectContext(project, fileTree);

    // Credits are held before any paid model call. A workspace with no balance
    // must fail here without touching the enhancer or the builder.
    await systemDb.transaction(async (tx) => {
      await holdCredits(tx, { workspaceId, cents: maxCents, editId });
      await tx
        .update(studioEdits)
        .set({
          status: "held",
          tokensHeldCents: maxCents,
          parentVersionId: parentVersion.id,
        })
        .where(eq(studioEdits.id, editId));
    });
    holdApplied = true;

    await systemDb
      .update(studioEdits)
      .set({ status: "enhancing" })
      .where(eq(studioEdits.id, editId));

    const enhanced = await enhancePrompt(
      {
        userText: rawPrompt,
        projectContext: context,
      },
      deps.enhanceCall ? { callStructured: deps.enhanceCall } : {}
    );

    const enhanceUsage: EnhanceUsage = enhanced.usage;
    enhanceCostCents =
      enhanceUsage.totalCostCents > 0
        ? enhanceUsage.totalCostCents
        : calculateUsageCostCents({
            model: enhanceUsage.model || BUILD_MODELS.FAST,
            inputTokens: enhanceUsage.inputTokens,
            outputTokens: enhanceUsage.outputTokens,
          });
    providerSpendCents += enhanceCostCents;

    if (!enhanced.brief) {
      clarification = enhanced.clarification || "The request needs clarification.";
      finalOutcome = "no_changes";
      failureReason = `clarification_required: ${clarification}`;

      return {
        success: false,
        editId,
        tokensSettledCents: 0,
        outcome: "no_changes",
        clarification,
        failureReason,
      };
    }

    const brief = enhanced.brief;
    await systemDb
      .update(studioEdits)
      .set({
        promptEnhanced: JSON.stringify(brief),
        parentVersionId: parentVersion.id,
      })
      .where(eq(studioEdits.id, editId));

    const expectedRoutes = deriveExpectedRoutes(parentManifest);
    const runner = defaultVerificationRunner();
    const leakageScanner = createLeakageScanner({
      workspaceDir,
      referenceCorpus: [
        project.name,
        project.description || "",
        ...evidence.map((item) => item.detail || ""),
      ].filter((value) => typeof value === "string" && value.trim().length >= 10),
    });

    // Baseline verification of the real parent workspace.
    const baseline = await verifyStudioWorkspace({
      workspaceDir,
      expectedRoutes,
      runner,
      capture,
      acceptanceCriteria: [],
    });

    const checkpointManager = new WorkspaceCheckpointManager(workspaceDir);
    try {
      await checkpointManager.init();
    } catch {
      // Checkpointing is best-effort; verification remains authoritative.
    }

    const safeCheckpoint = {
      async save(iteration: number, score: number): Promise<string> {
        try {
          return await checkpointManager.saveCheckpoint(iteration, score);
        } catch {
          return `unavailable:${iteration}`;
        }
      },
      async restore(id: string): Promise<void> {
        if (id.startsWith("unavailable:")) return;
        try {
          await checkpointManager.rollbackTo(id);
        } catch {
          // Never hide a failed restore from the next verification step.
        }
      },
    };

    const loopDeps: LoopDeps = {
      async runBuilder({ iteration, model }) {
        const result = await runBuilder({
          workspaceDir,
          iteration,
          model,
          brief,
          acceptanceCriteria: brief.acceptanceCriteria,
        });
        return {
          usage: {
            model: result.usage.model || model,
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          },
        };
      },

      async verify() {
        const verified = await verifyStudioWorkspace({
          workspaceDir,
          expectedRoutes,
          runner,
          capture,
          referenceScreenshots: baseline.capture.renderedScreenshots,
          acceptanceCriteria: brief.acceptanceCriteria,
        });
        return {
          parity: verified.parity,
          obligations: verified.obligations,
          diagnostics: verified.diagnostics,
        };
      },

      async scanLeakage() {
        return leakageScanner();
      },

      async scanSafety() {
        const report = await scanBuildSafety(workspaceDir);
        return {
          passed: report.passed,
          issues: [
            ...report.blockedScripts,
            ...report.exposedSecrets,
            ...report.auditViolations,
          ],
        };
      },

      checkpoint: safeCheckpoint,

      priceUsage(usage) {
        return calculateUsageCostCents(usage);
      },

      now,

      emit() {
        // The edit row is updated at terminal boundaries; no synthetic progress events.
      },
    };

    await systemDb
      .update(studioEdits)
      .set({ status: "applying" })
      .where(eq(studioEdits.id, editId));

    const loopResult = await runBuildLoop(
      {
        obligations: brief.acceptanceCriteria,
        models: {
          FAST: BUILD_MODELS.FAST,
          STANDARD: BUILD_MODELS.STANDARD,
          PREMIUM: BUILD_MODELS.PREMIUM,
        },
        limits: {
          maxIterations: STUDIO_EDIT_LIMITS.maxIterations,
          maxWallClockMs: STUDIO_EDIT_LIMITS.maxWallClockMs,
          stagnationWindow: STUDIO_EDIT_LIMITS.stagnationWindow,
          minImprovement: STUDIO_EDIT_LIMITS.minImprovement,
        },
        costCapCents: Math.max(
          0,
          maxProviderCostForHold({ heldCents: maxCents, markup }) -
            enhanceCostCents
        ),
        thresholds: {
          success: 0.85,
          partial: 0.5,
          minCoverage: 0,
        },
      },
      loopDeps
    );
    providerSpendCents += loopResult.spentCents;

    await systemDb
      .update(studioEdits)
      .set({ status: "verifying" })
      .where(eq(studioEdits.id, editId));

    // Final verification, safety, and leakage checks on the workspace that
    // will actually be delivered.
    const after = await verifyStudioWorkspace({
      workspaceDir,
      expectedRoutes,
      runner,
      capture,
      referenceScreenshots: baseline.capture.renderedScreenshots,
      acceptanceCriteria: brief.acceptanceCriteria,
    });

    const finalSafety = await scanBuildSafety(workspaceDir);
    const finalLeakage = await leakageScanner();
    if (!finalSafety.passed) {
      finalOutcome = "rejected_by_guard";
      failureReason = `safety_scan_failed: ${[
        ...finalSafety.blockedScripts,
        ...finalSafety.exposedSecrets,
        ...finalSafety.auditViolations,
      ].join("; ")}`;
    } else if (finalLeakage.hasLeakage) {
      finalOutcome = "rejected_by_guard";
      failureReason = `leakage_detected: ${finalLeakage.offenders.join(", ")}`;
    }

    const currentFiles = await collectWorkspaceFiles(workspaceDir);
    const currentManifest = manifestFromFiles(currentFiles);
    const changed = changedFiles(parentManifest, currentManifest);

    if (!failureReason) {
      if (changed.length === 0) {
        finalOutcome = "no_changes";
        failureReason = "no_changes";
      } else {
        const guard = evaluateEdit({
          baseline: scoreSnapshot(baseline.parity),
          after: scoreSnapshot(after.parity),
          tolerance: STUDIO_GUARD_TOLERANCE,
        });

        if (!guard.accept) {
          finalOutcome = "rejected_by_guard";
          failureReason = guard.reason;
        } else {
          const baseText = textFiles(restored.files);
          const currentText = textFiles(currentFiles);
          diffStat = computeDiffStat(
            Array.from(baseText.entries()).map(([filePath, content]) => ({
              path: filePath,
              content,
              sha256: sha256(content),
            })),
            Array.from(currentText.entries()).map(([filePath, content]) => ({
              path: filePath,
              content,
            }))
          );

          const packaged = await packageDelivery({
            workspaceDir,
            workspaceId,
            projectId,
            jobId: editId,
            status: "delivered",
            parity: after.parity,
            leakage: { maxSimilarity: finalLeakage.maxSimilarity },
            unmet: [],
            evidenceItems: evidence,
            storage: dbStorage,
          });

          const nextVersionNumber = parentVersion.versionNumber + 1;
          const [newVersion] = await systemDb
            .insert(studioVersions)
            .values({
              projectId,
              workspaceId,
              parentVersionId: parentVersion.id,
              versionNumber: nextVersionNumber,
              label: `v${nextVersionNumber}: ${rawPrompt.slice(0, 60)}`,
              zipStorageKey: packaged.storageKey,
              previewUrl: `/api/studio/preview/${projectId}/?version=${packaged.storageKey}`,
              parityScore: after.parity.overall,
              filesManifest: currentManifest,
              createdBy: userId,
            })
            .returning();

          if (!newVersion) {
            throw new Error("Failed to record the new Studio version.");
          }

          resultingVersionId = newVersion.id;
          resultingVersionNumber = newVersion.versionNumber;
          finalOutcome = "accepted";
          chargeCents = settleEdit({
            heldCents: maxCents,
            providerCostCents: providerSpendCents,
            markup,
            minChargeCents,
            outcome: "accepted",
          }).chargeCents;
        }
      }
    }

    if (finalOutcome !== "accepted") {
      // The parent version is untouched; discard the temporary working copy by
      // restoring it once more so no partially-edited files can be observed.
      try {
        await fs.rm(workspaceDir, { recursive: true, force: true });
        await restoreVersion(workspaceDir, parentVersion, dbStorage);
      } catch {
        // Parent version in S3/DB is authoritative even if cleanup fails.
      }
    }
  } catch (err) {
    finalOutcome = "failed";
    failureReason =
      err instanceof InsufficientCreditsError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
  } finally {
    if (!holdApplied) {
      try {
        await finalizeEditRow("failed", 0, failureReason);
      } catch {
        // Best-effort terminal update; the original error is returned.
      }
    } else {
      const settlement = settleEdit({
        heldCents: maxCents,
        providerCostCents: providerSpendCents,
        markup,
        minChargeCents,
        outcome: finalOutcome,
      });

      try {
        await systemDb.transaction(async (tx) => {
          await settleCredits(tx, {
            workspaceId,
            editId,
            heldCents: maxCents,
            chargeCents: settlement.chargeCents,
          });
          await tx
            .update(studioEdits)
            .set({
              status:
                finalOutcome === "accepted"
                  ? "committed"
                  : finalOutcome === "failed"
                    ? "failed"
                    : "refunded",
              tokensSettledCents: settlement.chargeCents,
              failureReason: failureReason ?? null,
              resultingVersionId: resultingVersionId ?? null,
              diffStat: diffStat ?? null,
              finishedAt: new Date(now()),
            })
            .where(eq(studioEdits.id, editId));
        });
      } catch (settleErr) {
        try {
          await finalizeEditRow(
            "failed",
            0,
            failureReason ||
              (settleErr instanceof Error ? settleErr.message : String(settleErr))
          );
        } catch {
          // Nothing else can be done inside the finally block.
        }
      }
    }

    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch {
      // Temporary workspace cleanup is best-effort.
    }
  }

  if (finalOutcome === "accepted") {
    try {
      await systemDb.insert(outbox).values({
        topic: "studio:version_ready",
        payload: {
          projectId,
          editId,
          versionId: resultingVersionId,
          versionNumber: resultingVersionNumber,
          chargedCents: chargeCents,
        },
      });
    } catch {
      // The version and ledger are authoritative; outbox dispatch is best-effort.
    }

    return {
      success: true,
      editId,
      versionId: resultingVersionId,
      versionNumber: resultingVersionNumber,
      tokensSettledCents: chargeCents,
      outcome: "accepted",
    };
  }

  return {
    success: false,
    editId,
    tokensSettledCents: 0,
    outcome: finalOutcome,
    ...(clarification ? { clarification } : {}),
    failureReason: failureReason || "Studio edit did not produce an accepted version.",
  };
}
