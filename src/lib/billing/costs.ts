import { systemDb } from "@/db";
import { costEvents } from "@/db/schema";
import { calculateUsageCostMicros } from "@/config/pricing";
import { env } from "@/env";
import type { DbTx } from "@/db/tenant";

export type CostSource = "analysis" | "build" | "studio_edit" | "preview" | "infra";

export interface RecordCostEventInput {
  workspaceId: string;
  projectId: string;
  source: CostSource;
  refId?: string | null;
  model?: string | null;
  modelProfile?: "test" | "launch";
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  providerCostMicros?: number;
}

/**
 * Appends one real provider-cost row. Callers pass the usage object returned by
 * the model call; this helper never estimates missing token counts.
 */
export async function recordCostEvent(
  db: DbTx | typeof systemDb,
  input: RecordCostEventInput
): Promise<void> {
  const inputTokens = Math.max(0, Math.round(input.inputTokens || 0));
  const outputTokens = Math.max(0, Math.round(input.outputTokens || 0));
  const cacheCreationInputTokens = Math.max(0, Math.round(input.cacheCreationInputTokens || 0));
  const cacheReadInputTokens = Math.max(0, Math.round(input.cacheReadInputTokens || 0));
  const modelProfile = input.modelProfile ?? (env.MODEL_PROFILE as "test" | "launch") ?? "launch";

  let micros = input.providerCostMicros;
  if (micros === undefined) {
    if (!input.model) {
      throw new Error("recordCostEvent requires a model when providerCostMicros is absent.");
    }
    micros = calculateUsageCostMicros({
      model: input.model,
      inputTokens,
      outputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
    });
  }

  const safeMicros = Math.max(0, Math.round(micros));
  await db.insert(costEvents).values({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    source: input.source,
    refId: input.refId ?? null,
    model: input.model ?? null,
    modelProfile,
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    providerCostCents: Math.ceil(safeMicros / 1000),
    providerCostMicros: safeMicros,
  });
}
