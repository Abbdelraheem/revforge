import { systemDb } from "@/db";
import { projects, targets, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { callStructured } from "@/lib/llm/structured";
import { TechnicalReportOutput, TechnicalReportOutputSchema } from "./types";
import { persistAnalysisReport } from "./persistence";
import { runExtractor } from "@/lib/sandbox/runner";
import { env } from "@/env";
import { DEMO_SITE_FIXTURE, HAR_FIXTURE, ASAR_FIXTURE } from "@/lib/llm/fixtures";
import { buildReport, AnalysisFailedError } from "./report-source";
import { transitionProject } from "@/db/state-machine";

export interface AnalysisPipelineOptions {
  projectId: string;
}

export async function analysisPipeline(projectId: string): Promise<TechnicalReportOutput> {
  const [project] = await systemDb
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const [target] = await systemDb
    .select()
    .from(targets)
    .where(eq(targets.projectId, projectId));

  const targetKind = target?.kind || "url";
  const targetSource = target?.rawInput || target?.normalizedUrl;

  if (!targetSource) {
    throw new Error(`Project ${projectId} has no valid target input or URL`);
  }

  // Step 1: Run extractor inside sandbox
  let extractorOutput = "";
  let extractionFailed = false;
  let extractionError = "";

  try {
    const extractorResult = await runExtractor(targetKind, targetSource);
    extractorOutput = (extractorResult as any).rawEvidence || (extractorResult as any).stdout || JSON.stringify(extractorResult);
  } catch (err: any) {
    // Pipeline degrades gracefully when an extractor fails
    extractionFailed = true;
    extractionError = err?.message || String(err);
    extractorOutput = `Extractor failed: ${extractionError}. Degraded analysis fallback with unknown_server_side components.`;
  }

  // Step 2: Formulate analysis prompt and call structured LLM via buildReport
  try {
    const buildResult = await buildReport(
      {
        target: { kind: targetKind, source: targetSource },
        extraction: extractionFailed
          ? { ok: false, error: extractionError }
          : { ok: true, result: extractorOutput },
        mode: env.LLM_PROVIDER === "fixture" && process.env.NODE_ENV !== "production" ? "fixture" : "live",
        nodeEnv: process.env.NODE_ENV || "development",
        userPrompt: project.description || undefined,
      },
      {
        callStructured: async ({ system, task, untrusted }) => {
          const res = await callStructured<TechnicalReportOutput>({
            role: "STANDARD",
            system,
            task,
            untrusted,
            tool: {
              name: "emit_technical_report",
              schema: TechnicalReportOutputSchema,
            },
          });
          return {
            report: res.data,
            usage: {
              promptTokens: res.usage.inputTokens,
              completionTokens: res.usage.outputTokens,
              totalCostCents: res.usage.totalCostCents,
            },
          };
        },
        fixtures: {
          getFixtureForKind: (kind: string) => {
            if (kind === "har_archive" || kind === "har") return HAR_FIXTURE;
            if (kind === "asar_package" || kind === "asar") return ASAR_FIXTURE;
            return DEMO_SITE_FIXTURE;
          },
        },
      }
    );

    const { report, usage: modelUsage } = buildResult;

    // Step 3: Persist technical report, evidence items, features, and initial quote in DB transaction
    await systemDb.transaction(async (tx) => {
      await persistAnalysisReport({
        tx: tx as any,
        workspaceId: project.workspaceId,
        projectId: project.id,
        report,
        modelUsage,
      });

      // Update project status to analyzed
      await transitionProject(
        tx as any,
        project.id,
        project.status as any,
        "analyzed",
        { type: "analysis_worker" }
      );
    });

    return report;
  } catch (err: any) {
    if (err instanceof AnalysisFailedError || err?.name === "AnalysisFailedError") {
      // On AnalysisFailedError: transition project to analysis_failed and refund free credit
      await systemDb.transaction(async (tx) => {
        await transitionProject(
          tx as any,
          project.id,
          project.status as any,
          "analysis_failed",
          { type: "analysis_worker" }
        );

        // Refund the 1 complimentary analysis credit
        if (project.userId) {
          await tx
            .update(users)
            .set({
              analysisCreditsUsed: sql`GREATEST(0, ${users.analysisCreditsUsed} - 1)`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, project.userId));
        }
      });
    }

    throw err;
  }
}
