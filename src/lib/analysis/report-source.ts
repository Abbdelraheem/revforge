import { TechnicalReportOutput } from "./types";
import { getPrompt } from "@/lib/prompts";

export type AnalysisErrorCode = "llm_failed" | "fixture_in_production" | "invalid_target";

export class AnalysisFailedError extends Error {
  code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode, message: string) {
    super(message);
    this.name = "AnalysisFailedError";
    this.code = code;
  }
}

export interface BuildReportInput {
  target: {
    kind: string;
    source: string;
  };
  extraction:
    | { ok: true; result: any }
    | { ok: false; error: string };
  mode: "live" | "fixture";
  nodeEnv: string;
  userPrompt?: string;
}

export interface BuildReportDeps {
  callStructured(params: {
    system: string;
    task: string;
    untrusted: string;
  }): Promise<{
    report: TechnicalReportOutput;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalCostCents?: number;
      model?: string;
    };
  }>;
  fixtures: {
    getFixtureForKind(kind: string): TechnicalReportOutput;
  };
}

export interface BuildReportResult {
  report: TechnicalReportOutput;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalCostCents: number;
    model?: string;
  };
  source: "llm" | "fixture";
}

/**
 * Pure report construction engine.
 * Strictly forbids silent fallback to fixtures in live mode.
 * Places untrusted target extractions and user prompts strictly in the untrusted prompt field.
 */
export async function buildReport(
  input: BuildReportInput,
  deps: BuildReportDeps
): Promise<BuildReportResult> {
  // 1. Fixture mode handling
  if (input.mode === "fixture") {
    if (input.nodeEnv === "production") {
      throw new AnalysisFailedError(
        "fixture_in_production",
        "Fixture mode is strictly forbidden in production environment."
      );
    }

    const fixture = deps.fixtures.getFixtureForKind(input.target.kind);
    // Deep clone to ensure inputs and fixtures are never mutated
    const clonedReport: TechnicalReportOutput = JSON.parse(JSON.stringify(fixture));

    if (!input.extraction.ok) {
      clonedReport.evidenceLedger.push({
        component: "Server-Side Services & APIs",
        category: "api_backend",
        status: "unknown_server_side",
        confidence: 0.5,
        detail: `Target extraction failed: ${input.extraction.error}. Backend boundaries marked as unknown server-side.`,
      });
    }

    return {
      report: clonedReport,
      usage: { promptTokens: 0, completionTokens: 0, totalCostCents: 0 },
      source: "fixture",
    };
  }

  // 2. Live mode: Must call structured LLM with strict perimeter separation
  const systemPrompt = getPrompt("analyst").system;

  const taskPrompt = `Evaluate the target application (${input.target.kind}) at ${input.target.source}.
Extract observable component evidence, itemize features for clean-room reconstruction, and determine architecture boundaries.`;

  // Evidence and userPrompt go ONLY in untrusted field; never in system or task
  let untrustedContent = "";
  if (!input.extraction.ok) {
    untrustedContent = `[EXTRACTION_FAILED]: extraction failed: ${input.extraction.error}`;
  } else {
    const rawData =
      typeof input.extraction.result === "string"
        ? input.extraction.result
        : JSON.stringify(input.extraction.result, null, 2);
    untrustedContent = `<untrusted_target_data kind="${input.target.kind}">\n${rawData}\n</untrusted_target_data>`;
  }

  if (input.userPrompt) {
    untrustedContent += `\n<untrusted_user_prompt>\n${input.userPrompt}\n</untrusted_user_prompt>`;
  }

  let structuredResult;
  try {
    structuredResult = await deps.callStructured({
      system: systemPrompt,
      task: taskPrompt,
      untrusted: untrustedContent,
    });
  } catch (err: any) {
    // Live mode failure: throw AnalysisFailedError, NEVER silently fallback to fixtures
    throw new AnalysisFailedError(
      "llm_failed",
      `LLM structured analysis failed: ${err?.message || String(err)}`
    );
  }

  const finalReport: TechnicalReportOutput = JSON.parse(
    JSON.stringify(structuredResult.report)
  );

  // If extraction failed, ensure UnknownServerSide ledger item is added
  if (!input.extraction.ok) {
    finalReport.evidenceLedger.push({
      component: "Server-Side Services & APIs",
      category: "api_backend",
      status: "unknown_server_side",
      confidence: 0.5,
      detail: `Target extraction failed: ${input.extraction.error}. Backend boundaries marked as unknown server-side.`,
    });
  }

  return {
    report: finalReport,
    usage: {
      promptTokens: structuredResult.usage?.promptTokens || 0,
      completionTokens: structuredResult.usage?.completionTokens || 0,
      totalCostCents: structuredResult.usage?.totalCostCents || 0,
      model: structuredResult.usage?.model,
    },
    source: "llm",
  };
}
