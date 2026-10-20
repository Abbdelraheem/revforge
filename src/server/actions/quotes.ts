"use server";

import { db } from "@/db";
import { quotes, quoteLines, features, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1, FeatureInput, TierKey } from "@/lib/pricing/engine";
import { getWorkspaceCreditBalance } from "@/lib/billing/credits";

export interface UpdateQuoteSelectionsParams {
  quoteId: string;
  selections: Record<string, boolean>; // featureId -> selected
}

/**
 * Updates selected features for an active quote and recalculates totals using priceQuote.
 */
export async function updateQuoteSelectionsAction(params: UpdateQuoteSelectionsParams) {
  const session = await requireSession();
  const workspaceId = session.workspace.id;

  const [activeQuote] = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.id, params.quoteId),
        eq(quotes.workspaceId, workspaceId)
      )
    );

  if (!activeQuote || activeQuote.status !== "active") {
    return { error: "Quote not found or no longer active." };
  }

  // Fetch all features associated with this quote
  const lines = await db
    .select({
      id: quoteLines.id,
      featureId: quoteLines.featureId,
      tier: quoteLines.tier,
      hoursQ4: quoteLines.hoursQ4,
      name: features.name,
      estimatedHours: features.estimatedHours,
      optional: features.optional,
    })
    .from(quoteLines)
    .innerJoin(features, eq(features.id, quoteLines.featureId))
    .where(eq(quoteLines.quoteId, activeQuote.id));

  const featureInputs: FeatureInput[] = lines.map((l) => ({
    id: l.featureId,
    name: l.name,
    tier: l.tier as TierKey,
    estimatedHours: l.estimatedHours,
    selected: params.selections[l.featureId] !== undefined ? Boolean(params.selections[l.featureId]) : true,
  }));

  // Fetch available credits
  const creditsBalance = await getWorkspaceCreditBalance(workspaceId);

  // Recalculate using pure integer-cent engine
  const calc = priceQuote(featureInputs, DEFAULT_PRICING_CONFIG_V1, creditsBalance);

  // Update in transaction
  await db.transaction(async (tx) => {
    for (const lineResult of calc.lines) {
      await tx
        .update(quoteLines)
        .set({
          selected: lineResult.selected,
          platformCents: lineResult.platformCents,
          humanCostCents: lineResult.humanCostCents,
        })
        .where(
          and(
            eq(quoteLines.quoteId, activeQuote.id),
            eq(quoteLines.featureId, lineResult.featureId)
          )
        );
    }

    await tx
      .update(quotes)
      .set({
        subtotalCents: calc.subtotalCents,
        creditsAppliedCents: calc.creditsAppliedCents,
        totalCents: calc.totalCents,
        needsReview: calc.needsReview,
      })
      .where(eq(quotes.id, activeQuote.id));
  });

  return {
    success: true,
    subtotalCents: calc.subtotalCents,
    creditsAppliedCents: calc.creditsAppliedCents,
    totalCents: calc.totalCents,
  };
}
