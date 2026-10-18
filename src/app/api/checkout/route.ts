import { NextRequest, NextResponse } from "next/server";
import {
  ComplexityTier,
  calculateDynamicProjectQuote,
} from "@/lib/pricing/pricing-engine";
import { createPaddleTransaction } from "@/lib/paddle/paddle-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, targetType } = body;

    if (!projectId || !targetType) {
      return NextResponse.json({ error: "Missing projectId or targetType" }, { status: 400 });
    }

    // MANDATORY ZERO-TRUST RULE:
    // ALWAYS recalculate prices on the server. Never trust client-provided numbers!
    const quote = calculateDynamicProjectQuote(projectId, targetType as ComplexityTier);
    const host = req.headers.get("host") || "localhost:3000";

    const items = quote.milestones.map((m) => ({
      name: m.titleEn,
      category: "Reconstruction Stage",
      amountUsd: Math.round(quote.targetPriceUsd / quote.milestones.length),
    }));

    // Create Paddle Transaction with server-enforced 90% margin clean price
    const transactionResult = await createPaddleTransaction(
      projectId,
      targetType,
      items,
      quote.targetPriceUsd,
      host
    );

    return NextResponse.json({
      transactionId: transactionResult.transactionId,
      checkoutUrl: transactionResult.checkoutUrl,
      targetPriceUsd: quote.targetPriceUsd,
      cleanPriceLabel: quote.cleanPriceLabel,
      isSandboxMock: transactionResult.isSandboxMock,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create Paddle checkout transaction" },
      { status: 500 }
    );
  }
}
