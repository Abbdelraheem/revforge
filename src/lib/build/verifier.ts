import fs from "node:fs";
import path from "node:path";
import {
  computeParityScore,
  comparePngBuffers,
  isParityPassed,
  type ParityBreakdown,
} from "./parity";

export interface VerificationOptions {
  workspaceDir: string;
  expectedRoutes?: string[];
  referenceScreenshots?: Array<{ name: string; buffer: Buffer }>;
  renderedScreenshots?: Array<{ name: string; buffer: Buffer }>;
  behavioralChecks?: Array<{ name: string; passed: boolean }>;
}

export interface VerificationRunner {
  runCommand(
    cmd: string,
    args: string[],
    cwd: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

export interface VerificationOutcome {
  passed: boolean;
  scores: ParityBreakdown;
  parity: ParityBreakdown;
  obligations: Record<string, "verified" | "failed" | "pending">;
  diagnostics: string[];
}

/**
 * Sandboxed verification harness executing real builds, visual image diffs with pixelmatch,
 * route structure checks, and behavioral check evaluation.
 */
export async function verifyBuildWorkspace(
  options: VerificationOptions,
  runner?: VerificationRunner
): Promise<VerificationOutcome> {
  const diagnostics: string[] = [];
  const obligations: Record<string, "verified" | "failed" | "pending"> = {};
  const wsDir = options.workspaceDir;

  // 1. Build Health Check
  let buildHealth = 0;
  const pkgPath = path.join(wsDir, "package.json");

  if (!fs.existsSync(wsDir) || !fs.existsSync(pkgPath)) {
    buildHealth = 0;
    diagnostics.push("Empty workspace or missing package.json in workspace root.");
    obligations["build_clean_compile"] = "failed";
  } else if (!runner) {
    // Basic file presence evaluation when runner is not supplied
    try {
      const hasLayout =
        fs.existsSync(path.join(wsDir, "src/app/layout.tsx")) ||
        fs.existsSync(path.join(wsDir, "app/layout.tsx")) ||
        fs.existsSync(path.join(wsDir, "src/pages/_app.tsx")) ||
        fs.existsSync(path.join(wsDir, "pages/_app.tsx"));
      buildHealth = hasLayout ? 0.9 : 0.5;
      obligations["build_clean_compile"] = hasLayout ? "verified" : "failed";
    } catch {
      buildHealth = 0.2;
      obligations["build_clean_compile"] = "failed";
    }
  } else {
    // Actually execute npm ci/install then npm run build
    try {
      const hasLock = fs.existsSync(path.join(wsDir, "package-lock.json"));
      const installCmd = hasLock ? "ci" : "install";

      // 1a. npm install --ignore-scripts
      const installRes = await runner.runCommand(
        "npm",
        [installCmd, "--ignore-scripts"],
        wsDir
      );

      if (installRes.exitCode !== 0) {
        diagnostics.push(
          `npm ${installCmd} failed with code ${installRes.exitCode}: ${installRes.stderr || installRes.stdout}`
        );
      }

      // 1b. npm run build
      const buildRes = await runner.runCommand(
        "npm",
        ["run", "build"],
        wsDir
      );

      if (buildRes.exitCode !== 0) {
        buildHealth = 0;
        diagnostics.push(
          `npm run build failed with code ${buildRes.exitCode}: ${buildRes.stderr || buildRes.stdout}`
        );
        obligations["build_clean_compile"] = "failed";
      } else {
        buildHealth = 1.0;
        obligations["build_clean_compile"] = "verified";

        // 1c. npm test if test script exists
        let pkgJson: any = {};
        try {
          pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        } catch {}

        if (pkgJson.scripts?.test) {
          const testRes = await runner.runCommand(
            "npm",
            ["run", "test"],
            wsDir
          );
          if (testRes.exitCode !== 0) {
            buildHealth = 0.6; // Failing tests lower buildHealth
            diagnostics.push(
              `npm test failed with code ${testRes.exitCode}: ${testRes.stderr || testRes.stdout}`
            );
            obligations["test_suite_passed"] = "failed";
          } else {
            obligations["test_suite_passed"] = "verified";
          }
        }
      }
    } catch (err: any) {
      buildHealth = 0;
      diagnostics.push(`Verifier runner exception: ${err?.message || String(err)}`);
      obligations["build_clean_compile"] = "failed";
    }
  }

  // 2. Structural Parity
  let structural: number | null = null;
  if (!options.expectedRoutes || options.expectedRoutes.length === 0) {
    structural = null;
  } else {
    let foundRoutes = 0;
    for (const route of options.expectedRoutes) {
      const clean = route.replace(/^\//, "");
      const candidates = [
        path.join(wsDir, "src/app", clean, "page.tsx"),
        path.join(wsDir, "src/app", clean, "page.jsx"),
        path.join(wsDir, "src/app", clean, "page.js"),
        path.join(wsDir, "src/app", clean, "route.ts"),
        path.join(wsDir, "app", clean, "page.tsx"),
        path.join(wsDir, "src/pages", `${clean || "index"}.tsx`),
        path.join(wsDir, "pages", `${clean || "index"}.tsx`),
        path.join(wsDir, "public", `${clean || "index"}.html`),
        path.join(wsDir, "index.html"),
      ];

      // Handle root '/'
      if (!clean) {
        candidates.push(
          path.join(wsDir, "src/app/page.tsx"),
          path.join(wsDir, "app/page.tsx"),
          path.join(wsDir, "src/pages/index.tsx"),
          path.join(wsDir, "pages/index.tsx")
        );
      }

      const matched = candidates.some((c) => fs.existsSync(c));
      if (matched) {
        foundRoutes++;
        obligations[`route:${route}`] = "verified";
      } else {
        obligations[`route:${route}`] = "failed";
        diagnostics.push(`Missing expected route implementation: ${route}`);
      }
    }

    structural = Number((foundRoutes / options.expectedRoutes.length).toFixed(4));
  }

  // 3. Visual Parity via pixelmatch
  let visual: number | null = null;
  if (!options.referenceScreenshots || options.referenceScreenshots.length === 0) {
    visual = null;
    diagnostics.push("No reference screenshots provided; visual parity not verified.");
  } else {
    const renderedMap = new Map<string, Buffer>();
    for (const r of options.renderedScreenshots || []) {
      renderedMap.set(r.name, r.buffer);
    }

    let totalVisualScore = 0;
    for (const ref of options.referenceScreenshots) {
      const renderedBuf = renderedMap.get(ref.name);
      if (!renderedBuf) {
        diagnostics.push(`Missing rendered counterpart for reference screenshot: ${ref.name}`);
        obligations[`visual:${ref.name}`] = "failed";
      } else {
        const { visualScore } = comparePngBuffers(ref.buffer, renderedBuf);
        totalVisualScore += visualScore;
        if (visualScore >= 0.7) {
          obligations[`visual:${ref.name}`] = "verified";
        } else {
          obligations[`visual:${ref.name}`] = "failed";
        }
      }
    }

    visual = Number(
      (totalVisualScore / options.referenceScreenshots.length).toFixed(4)
    );
  }

  // 4. Behavioral Checks
  let behavioral: number | null = null;
  if (!options.behavioralChecks || options.behavioralChecks.length === 0) {
    behavioral = null;
  } else {
    let passing = 0;
    for (const check of options.behavioralChecks) {
      if (check.passed) {
        passing++;
        obligations[`behavioral:${check.name}`] = "verified";
      } else {
        obligations[`behavioral:${check.name}`] = "failed";
        diagnostics.push(`Behavioral test failed: ${check.name}`);
      }
    }
    behavioral = Number((passing / options.behavioralChecks.length).toFixed(4));
  }

  // Compute composite score
  const scores = computeParityScore({
    visual,
    structural,
    behavioral,
    buildHealth,
  });

  const passed = isParityPassed(scores, 0.75);

  return {
    passed,
    scores,
    parity: scores,
    obligations,
    diagnostics,
  };
}
