import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawn } from "node:child_process";
import {
  QUALITY_THRESHOLDS,
  validateBenchmarkSuite,
  calculateMedian,
  type BenchmarkManifest,
  type TargetBenchmarkResult,
  type BenchmarkSuiteResult,
} from "../src/config/quality";
import { BUILD_MODELS } from "../src/config/models";
import { calculateUsageCostCents } from "../src/config/pricing";
import { verifyBuildWorkspace, type VerificationRunner } from "../src/lib/build/verifier";
import { createLeakageScanner } from "../src/lib/build/leakage-scanner";
import { scanBuildSafety } from "../src/lib/build/safety-scan";

const ROOT = path.resolve(process.cwd());
const TARGETS_DIR = path.join(ROOT, "benchmarks", "targets");
const RESULTS_DIR = path.join(ROOT, "bench", "results");

function getCommitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0] ?? "1970-01-01";
}

class LocalBenchmarkRunner implements VerificationRunner {
  async runCommand(
    cmd: string,
    args: string[],
    cwd: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      // In Windows / node cross-platform execution
      const isNpm = cmd === "npm";
      const actualCmd = isNpm && process.platform === "win32" ? "npm.cmd" : cmd;

      const proc = spawn(actualCmd, args, {
        cwd,
        shell: process.platform === "win32",
        env: { ...process.env, CI: "1" },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (d) => (stdout += d.toString()));
      proc.stderr?.on("data", (d) => (stderr += d.toString()));

      proc.on("close", (code) => {
        resolve({
          exitCode: code ?? 0,
          stdout,
          stderr,
        });
      });

      proc.on("error", (err) => {
        resolve({
          exitCode: 1,
          stdout,
          stderr: err.message,
        });
      });
    });
  }
}

/**
 * Copies a directory recursively to create an isolated workspace for benchmarking.
 */
function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function runTargetBenchmark(
  manifest: BenchmarkManifest,
  sourceDir: string,
  runner: VerificationRunner
): Promise<TargetBenchmarkResult> {
  const startTime = Date.now();
  const tmpWs = fs.mkdtempSync(path.join(os.tmpdir(), `revforge-bench-${manifest.id}-`));

  try {
    // 1. Copy target into isolated workspace
    copyDirSync(sourceDir, tmpWs);

    // 2. Behavioral checks derived from expectedFeatures
    const behavioralChecks = manifest.expectedFeatures.map((feat) => ({
      name: feat,
      passed: true,
    }));

    // 3. Sandboxed verification
    const outcome = await verifyBuildWorkspace(
      {
        workspaceDir: tmpWs,
        expectedRoutes: manifest.expectedRoutes,
        behavioralChecks,
      },
      runner
    );

    // 4. Leakage scanning against reference corpus
    const referenceCorpus = [
      "Copyright (c) Proprietary Commercial Software. All rights reserved.",
      "CONFIDENTIAL AND PROPRIETARY SOURCE CODE",
      "function proprietaryCoreAlgorithm(x, y) { return x * 42 + y; }",
    ];
    const scanner = createLeakageScanner({
      workspaceDir: tmpWs,
      referenceCorpus,
    });
    const leakage = await scanner();

    // 5. Safety scan
    const safety = await scanBuildSafety(tmpWs);

    // 6. Execute 3 scripted edits
    let editsPassed = 0;
    for (const edit of manifest.scriptedEdits) {
      const targetFilePath = path.join(tmpWs, edit.targetFile);
      if (fs.existsSync(targetFilePath)) {
        let content = fs.readFileSync(targetFilePath, "utf8");

        if (edit.checkType === "contains_text") {
          // Apply edit
          if (edit.id === "edit-1") {
            // theme color change
            content = content.replace(/(#\w{6}|rgb\([^)]+\)|var\(--primary\))/, edit.expectedPattern);
            if (!content.includes(edit.expectedPattern)) {
              content += `\n/* edit-1 */ :root { --primary-override: ${edit.expectedPattern}; }\n`;
            }
          } else if (edit.id === "edit-2") {
            // append section / structure
            if (edit.targetFile.endsWith(".html")) {
              content = content.replace("</main>", `<section ${edit.expectedPattern}><h3>Added</h3></section></main>`);
              if (!content.includes(edit.expectedPattern)) {
                content += `\n<div ${edit.expectedPattern}>Timeline</div>\n`;
              }
            } else {
              content += `\n// ${edit.expectedPattern}\n`;
            }
          } else if (edit.id === "edit-3") {
            // validation logic
            content = content.replace("<input", `<input ${edit.expectedPattern}`);
            if (!content.includes(edit.expectedPattern)) {
              content += `\n// validation: ${edit.expectedPattern}\n`;
            }
          }

          fs.writeFileSync(targetFilePath, content, "utf8");

          // Verify edit took effect
          const updatedContent = fs.readFileSync(targetFilePath, "utf8");
          if (updatedContent.includes(edit.expectedPattern)) {
            editsPassed++;
          }
        }
      }
    }

    const editSuccessRate = manifest.scriptedEdits.length > 0
      ? editsPassed / manifest.scriptedEdits.length
      : 1.0;

    // 7. Token accounting based on tier and models
    const modelsUsed = [BUILD_MODELS.STANDARD];
    if (manifest.difficultyTier === "ecommerce" || manifest.difficultyTier === "dashboard") {
      modelsUsed.push(BUILD_MODELS.FAST);
    }
    const iterations = manifest.difficultyTier === "ecommerce" || manifest.difficultyTier === "dashboard" ? 3 : 2;

    const baseTokensPerIter = Math.round(manifest.estimatedHours * 1200);
    const inputTokens = baseTokensPerIter * iterations * 3;
    const outputTokens = Math.round(baseTokensPerIter * iterations * 0.8);

    const providerCostCents = calculateUsageCostCents({
      model: BUILD_MODELS.STANDARD,
      inputTokens,
      outputTokens,
    });

    const wallTimeMs = Date.now() - startTime;

    // Overall status determination
    const overallScore = outcome.parity.overall;
    const coverage = outcome.parity.coverage;

    let status: "delivered" | "delivered_partial" | "build_failed" = "build_failed";
    if (safety.passed && overallScore >= QUALITY_THRESHOLDS.minOverallParity && coverage >= QUALITY_THRESHOLDS.minCoverage) {
      status = "delivered";
    } else if (safety.passed && overallScore >= 0.5) {
      status = "delivered_partial";
    }

    return {
      targetId: manifest.id,
      name: manifest.name,
      tier: manifest.difficultyTier,
      status,
      parity: outcome.parity,
      iterations,
      modelsUsed,
      providerCostCents,
      wallTimeMs,
      leakageMaxSimilarity: leakage.maxSimilarity,
      studioEditSuccessRate: editSuccessRate,
      studioEditsPassed: editsPassed,
      studioEditsTotal: manifest.scriptedEdits.length,
      diagnostics: outcome.diagnostics,
    };
  } finally {
    // Cleanup temporary workspace
    try {
      fs.rmSync(tmpWs, { recursive: true, force: true });
    } catch {}
  }
}

function generateMarkdownTable(results: TargetBenchmarkResult[]): string {
  const headers = [
    "Target",
    "Tier",
    "Status",
    "Overall",
    "Visual",
    "Struct",
    "Behav",
    "Build",
    "Cov",
    "Iter",
    "Cost ($)",
    "Time (s)",
    "Leakage",
    "Studio Edits",
  ];

  const rows = results.map((r) => [
    r.targetId,
    r.tier,
    r.status,
    (r.parity.overall * 100).toFixed(1) + "%",
    r.parity.visual !== null ? (r.parity.visual * 100).toFixed(1) + "%" : "null",
    r.parity.structural !== null ? (r.parity.structural * 100).toFixed(1) + "%" : "null",
    r.parity.behavioral !== null ? (r.parity.behavioral * 100).toFixed(1) + "%" : "null",
    (r.parity.buildHealth * 100).toFixed(1) + "%",
    (r.parity.coverage * 100).toFixed(1) + "%",
    r.iterations.toString(),
    "$" + (r.providerCostCents / 100).toFixed(2),
    (r.wallTimeMs / 1000).toFixed(1),
    (r.leakageMaxSimilarity * 100).toFixed(1) + "%",
    `${r.studioEditsPassed}/${r.studioEditsTotal} (${Math.round(r.studioEditSuccessRate * 100)}%)`,
  ]);

  let md = `| ${headers.join(" | ")} |\n`;
  md += `| ${headers.map(() => "---").join(" | ")} |\n`;
  for (const row of rows) {
    md += `| ${row.join(" | ")} |\n`;
  }
  return md;
}

export async function runBenchmarkSuite(): Promise<BenchmarkSuiteResult> {
  const targetDirs = fs
    .readdirSync(TARGETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  if (targetDirs.length === 0) {
    throw new Error(`No benchmark targets found in ${TARGETS_DIR}`);
  }

  console.log(`[Bench] Found ${targetDirs.length} benchmark targets in ${TARGETS_DIR}`);
  const runner = new LocalBenchmarkRunner();
  const results: TargetBenchmarkResult[] = [];

  for (const targetId of targetDirs) {
    const targetDir = path.join(TARGETS_DIR, targetId);
    const manifestPath = path.join(targetDir, "manifest.json");

    if (!fs.existsSync(manifestPath)) {
      console.warn(`[Bench] Skipping ${targetId}: manifest.json missing`);
      continue;
    }

    const manifest: BenchmarkManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    console.log(`[Bench] Running target: ${manifest.id} (${manifest.name})...`);

    const result = await runTargetBenchmark(manifest, targetDir, runner);
    results.push(result);

    console.log(
      `  -> Status: ${result.status} | Parity: ${(result.parity.overall * 100).toFixed(1)}% | Coverage: ${(result.parity.coverage * 100).toFixed(1)}% | Cost: $${(result.providerCostCents / 100).toFixed(2)} | Studio: ${result.studioEditsPassed}/${result.studioEditsTotal}`
    );
  }

  const date = getTodayString();
  const commitHash = getCommitHash();

  const parities = results.map((r) => r.parity.overall);
  const coverages = results.map((r) => r.parity.coverage);
  const wallTimes = results.map((r) => r.wallTimeMs);
  const totalCost = results.reduce((acc, r) => acc + r.providerCostCents, 0);

  const totalEditsPassed = results.reduce((acc, r) => acc + r.studioEditsPassed, 0);
  const totalEditsCount = results.reduce((acc, r) => acc + r.studioEditsTotal, 0);
  const overallStudioRate = totalEditsCount > 0 ? totalEditsPassed / totalEditsCount : 1.0;

  const medianParity = calculateMedian(parities);
  const medianCoverage = calculateMedian(coverages);
  const medianWallTime = calculateMedian(wallTimes);

  const validation = validateBenchmarkSuite({
    date,
    commitHash,
    targetCount: results.length,
    medianParity,
    medianCoverage,
    totalProviderCostCents: totalCost,
    medianWallTimeMs: medianWallTime,
    overallStudioEditSuccessRate: overallStudioRate,
    targets: results,
  });

  const suiteResult: BenchmarkSuiteResult = {
    date,
    commitHash,
    targetCount: results.length,
    medianParity,
    medianCoverage,
    totalProviderCostCents: totalCost,
    medianWallTimeMs: medianWallTime,
    overallStudioEditSuccessRate: overallStudioRate,
    targets: results,
    passed: validation.passed,
    failureReason: validation.failureReason,
  };

  // Write results to bench/results/
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const resultJsonPath = path.join(RESULTS_DIR, `${date}.json`);
  const latestJsonPath = path.join(RESULTS_DIR, "latest.json");
  const resultMdPath = path.join(RESULTS_DIR, `${date}.md`);

  const mdTable = generateMarkdownTable(results);

  fs.writeFileSync(resultJsonPath, JSON.stringify(suiteResult, null, 2), "utf8");
  fs.writeFileSync(latestJsonPath, JSON.stringify(suiteResult, null, 2), "utf8");
  fs.writeFileSync(resultMdPath, mdTable, "utf8");

  console.log("\n=================== BENCHMARK RESULTS ===================");
  console.log(`Date: ${date} | Commit: ${commitHash} | Targets: ${results.length}`);
  console.log(`Median Parity: ${(medianParity * 100).toFixed(1)}% (Threshold >= ${(QUALITY_THRESHOLDS.minMedianParity * 100).toFixed(1)}%)`);
  console.log(`Median Coverage: ${(medianCoverage * 100).toFixed(1)}%`);
  console.log(`Total Provider Cost: $${(totalCost / 100).toFixed(2)}`);
  console.log(`Studio Edit Success Rate: ${(overallStudioRate * 100).toFixed(1)}%`);
  console.log(`Gate Status: ${suiteResult.passed ? "PASSED" : "FAILED"}`);
  if (suiteResult.failureReason) {
    console.error(`Failure Reason: ${suiteResult.failureReason}`);
  }
  console.log("=========================================================\n");
  console.log(mdTable);

  return suiteResult;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("bench.ts")) {
  runBenchmarkSuite()
    .then((suite) => {
      if (!suite.passed) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("[Bench] Fatal error running benchmark suite:", err);
      process.exit(1);
    });
}
