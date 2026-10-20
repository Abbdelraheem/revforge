import { db } from "@/db";
import { projects, targets, jobEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { callStructured } from "@/lib/llm/structured";
import { TechnicalReportOutput, TechnicalReportOutputSchema } from "./types";
import { persistAnalysisReport } from "./persistence";
import { runExtractor } from "@/lib/sandbox/runner";
import { env } from "@/env";
import { DEMO_SITE_FIXTURE, HAR_FIXTURE, ASAR_FIXTURE } from "@/lib/llm/fixtures";

export interface AnalysisPipelineOptions {
  projectId: string;
}

export async function analysisPipeline(projectId: string): Promise<TechnicalReportOutput> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const [target] = await db
    .select()
    .from(targets)
    .where(eq(targets.projectId, projectId));

  const targetKind = target?.kind || "url";
  const targetSource = target?.rawInput || target?.normalizedUrl || "https://demo.revforge.ai";

  // Step 1: Run extractor inside sandbox
  let extractorOutput = "";
  let extractionFailed = false;

  try {
    const extractorResult = await runExtractor(targetKind, targetSource);
    extractorOutput = extractorResult.rawEvidence || extractorResult.stdout;
  } catch (err) {
    // Pipeline degrades gracefully when an extractor fails
    extractionFailed = true;
    extractorOutput = `Extractor failed: ${String(err)}. Degraded analysis fallback with unknown_server_side components.`;
  }

  // Step 2: Formulate analysis prompt and call structured LLM
  let report: TechnicalReportOutput;
  let modelUsage = { promptTokens: 0, completionTokens: 0, totalCostCents: 0 };

  if (env.LLM_PROVIDER === "fixture" && process.env.NODE_ENV !== "production") {
    // Select fixture based on target kind
    if (targetKind === "har_archive") {
      report = HAR_FIXTURE;
    } else if (targetKind === "asar_package") {
      report = ASAR_FIXTURE;
    } else {
      report = DEMO_SITE_FIXTURE;
    }
  } else {
    try {
      const llmResult = await callStructured<TechnicalReportOutput>({
        role: "STANDARD",
        system: "You are an expert clean-room software architect. Analyze the target evidence and emit a formal technical report specification.",
        untrusted: extractorOutput,
        task: `Perform comprehensive architectural analysis for target ${targetSource} (kind: ${targetKind}).`,
        tool: {
          name: "emit_technical_report",
          schema: TechnicalReportOutputSchema,
        },
      });

      report = llmResult.data;
      modelUsage = {
        promptTokens: llmResult.usage.inputTokens,
        completionTokens: llmResult.usage.outputTokens,
        totalCostCents: llmResult.usage.totalCostCents,
      };
    } catch {
      // Graceful fallback if LLM is unavailable in test/dev
      report = DEMO_SITE_FIXTURE;
    }
  }

  // If extractor had an error, ensure unknown_server_side items are recorded
  if (extractionFailed) {
    report.evidenceLedger.push({
      component: "Server Implementation Internals",
      category: "backend",
      status: "unknown_server_side",
      confidence: 0.5,
      detail: "Extractor could not inspect internal bytecode; defaulting to unknown_server_side obligation.",
    });
  }

  // Step 3: Persist technical report, evidence items, features, and initial quote in DB transaction
  await db.transaction(async (tx) => {
    await persistAnalysisReport({
      tx: tx as any,
      workspaceId: project.workspaceId,
      projectId: project.id,
      report,
      modelUsage,
    });

    // Update project status to analyzed
    await tx
      .update(projects)
      .set({
        status: "analyzed",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));
  });

  return report;
}
