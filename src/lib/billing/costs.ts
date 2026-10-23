import { systemDb } from "@/db";
import { costEvents } from "@/db/schema";
import { calculateUsageCostMicros } from "@/config/pricing";
import type { DbTx } from "@/db/tenant";

export type CostSource = "analysis" | "build" | "studio_edit" | "preview" | "infra";

export interface RecordCostEventInput {
  workspaceId: string;
  projectId: string;
  source: CostSource;
  refId?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
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

  let micros = input.providerCostMicros;
  if (micros === undefined) {
    if (!input.model) {
      throw new Error("recordCostEvent requires a model when providerCostMicros is absent.");
    }
    micros = calculateUsageCostMicros({
      model: input.model,
      inputTokens,
      outputTokens,
    });
  }

  const safeMicros = Math.max(0, Math.round(micros));
  await db.insert(costEvents).values({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    source: input.source,
    refId: input.refId ?? null,
    model: input.model ?? null,
    inputTokens,
    outputTokens,
    providerCostCents: Math.ceil(safeMicros / 1000),
    providerCostMicros: safeMicros,
  });
}
