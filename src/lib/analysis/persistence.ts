import { DbTx } from "@/db/tenant";
import {
  analyses,
  technicalReports,
  evidenceItems,
  features,
  quotes,
  quoteLines,
  jobEvents,
} from "@/db/schema";
import { TechnicalReportOutput } from "./types";
import { computeEvidenceConfidence } from "./confidence";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1, FeatureInput } from "@/lib/pricing/engine";
import { clampFeatureHours } from "@/lib/pricing/bands";

export interface PersistAnalysisParams {
  tx: DbTx;
  workspaceId: string;
  projectId: string;
  report: TechnicalReportOutput;
  modelUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalCostCents: number;
  };
}

export async function persistAnalysisReport({
  tx,
  workspaceId,
  projectId,
  report,
  modelUsage,
}: PersistAnalysisParams) {
  // 1. Compute empirical confidence
  const confidence = computeEvidenceConfidence(report.evidenceLedger);

  // 2. Insert Analysis record
  const [analysis] = await tx
    .insert(analyses)
    .values({
      workspaceId,
      projectId,
      status: "completed",
      startedAt: new Date(Date.now() - 30_000),
      finishedAt: new Date(),
      modelUsage: modelUsage
        ? {
            promptTokens: modelUsage.promptTokens,
            completionTokens: modelUsage.completionTokens,
            totalCostCents: modelUsage.totalCostCents,
          }
        : undefined,
    })
    .returning();

  if (!analysis) {
    throw new Error("Failed to insert analysis record.");
  }

  // 3. Insert Technical Report
  const [techReport] = await tx
    .insert(technicalReports)
    .values({
      workspaceId,
      analysisId: analysis.id,
      stack: report.stack,
      boundaries: report.boundaries,
      summary: report.summary,
      confidence,
      schemaVersion: 1,
    })
    .returning();

  if (!techReport) {
    throw new Error("Failed to insert technical report record.");
  }

  // 4. Insert Evidence Items
  if (report.evidenceLedger.length > 0) {
    await tx.insert(evidenceItems).values(
      report.evidenceLedger.map((item) => ({
        workspaceId,
        reportId: techReport.id,
        component: item.component,
        category: item.category,
        status: item.status,
        confidence: item.confidence,
        sourceRef: item.sourceRef,
        detail: item.detail,
      }))
    );
  }

  // 5. Insert Discovered Features
  const insertedFeatures = await tx
    .insert(features)
    .values(
      report.features.map((feat) => {
        const { clampedHours } = clampFeatureHours(feat.class, feat.estimatedHours);
        return {
          workspaceId,
          reportId: techReport.id,
          name: feat.name,
          class: feat.class,
          tier: feat.tier,
          estimatedHours: clampedHours,
          rationale: feat.rationale,
          optional: feat.optional,
        };
      })
    )
    .returning();

  // 6. Generate Quote v1
  const featureInputs: FeatureInput[] = insertedFeatures.map((f) => ({
    id: f.id,
    name: f.name,
    tier: f.tier as any,
    estimatedHours: f.estimatedHours,
    selected: true,
  }));

  const pricingRes = priceQuote(featureInputs, DEFAULT_PRICING_CONFIG_V1, 0);

  const [quote] = await tx
    .insert(quotes)
    .values({
      workspaceId,
      projectId,
      version: 1,
      status: "active",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
      pricingConfigVersion: DEFAULT_PRICING_CONFIG_V1.version,
      subtotalCents: pricingRes.subtotalCents,
      creditsAppliedCents: pricingRes.creditsAppliedCents,
      totalCents: pricingRes.totalCents,
      needsReview: pricingRes.needsReview,
    })
    .returning();

  if (quote) {
    await tx.insert(quoteLines).values(
      pricingRes.lines.map((l) => ({
        workspaceId,
        quoteId: quote.id,
        featureId: l.featureId,
        tier: l.tier,
        hoursQ4: l.hoursQ4,
        hourlyRateCents: l.hourlyRateCents,
        humanCostCents: l.humanCostCents,
        platformCents: l.platformCents,
        selected: l.selected,
      }))
    );
  }

  return {
    analysisId: analysis.id,
    reportId: techReport.id,
    quoteId: quote?.id,
    subtotalCents: pricingRes.subtotalCents,
    totalCents: pricingRes.totalCents,
    confidence,
  };
}
