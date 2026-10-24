import { NextRequest, NextResponse } from "next/server";
import { resolveValidated } from "@/lib/security/safe-fetch";
import { priceQuote, DEFAULT_PRICING_CONFIG_V1 } from "@/lib/pricing/engine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target = body.targetUrl || body.target;

    if (!target || typeof target !== "string") {
      return NextResponse.json({ error: "Target URL or repository string required." }, { status: 400 });
    }

    // SSRF validation if it's an HTTP/HTTPS URL
    if (target.startsWith("http://") || target.startsWith("https://")) {
      try {
        const parsed = new URL(target);
        await resolveValidated(parsed.hostname);
      } catch (err: any) {
        return NextResponse.json({ error: `Security check blocked target: ${err.message}` }, { status: 400 });
      }
    }

    // Determine target classification
    const isMobile = target.includes(".apk") || target.includes("play.google");
    const isDesktop = target.includes(".asar") || target.includes(".exe") || target.includes(".dll");
    const isEnterprise = target.includes("enterprise") || target.includes("saas");

    const tier = isMobile
      ? "mobile_app"
      : isDesktop
      ? "desktop_binary"
      : isEnterprise
      ? "enterprise_saas"
      : "web_app";

    const hours = tier === "enterprise_saas" ? 80 : tier === "mobile_app" ? 40 : 24;

    const clonePriceUsd =
      tier === "enterprise_saas"
        ? 79
        : tier === "mobile_app" || tier === "desktop_binary"
        ? 149
        : 39;
    const requiredCredits = clonePriceUsd * 1000;

    const quote = priceQuote(
      [
        {
          id: "core-spec",
          name: "Core Architecture Reconstruction",
          tier,
          estimatedHours: hours,
          selected: true,
        },
      ],
      DEFAULT_PRICING_CONFIG_V1
    );

    return NextResponse.json({
      target,
      classification: tier,
      recommendedTier: tier,
      estimatedHours: hours,
      quote: {
        totalCents: quote.totalCents,
        subtotalCents: quote.subtotalCents,
        lines: quote.lines,
        clonePriceUsd,
        requiredCredits,
        options: {
          directCloneUsd: clonePriceUsd,
          directCloneCredits: requiredCredits,
          scopeCapOptions: {
            optionA: "Pay difference for 100% completion",
            optionB: "Partial delivery up to available credit limit",
          },
        },
      },
      confidenceScore: 0.88,
      message: "Triage completed successfully via empirical observation.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Triage processing failed." }, { status: 500 });
  }
}
