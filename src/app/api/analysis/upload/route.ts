import { NextRequest, NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/security/ssrf";
import { checkFreeTrialIpGate } from "@/lib/analysis/free-trial";

export const runtime = "nodejs";

/**
 * Analysis upload gate endpoint.
 * Requires explicit legal attestation (termsAccepted = true, rightToAnalyze = true).
 * Validates user-supplied Git or target URLs against SSRF threats.
 * Enforces 1 free analysis per IP address per 24 hours.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { termsAccepted, rightToAnalyze, gitUrl, targetUrl, fileKey } = body;

    // Strict attestation verification
    if (termsAccepted !== true || rightToAnalyze !== true) {
      return NextResponse.json(
        {
          error: "Attestation check failed: termsAccepted and rightToAnalyze must both be true.",
        },
        { status: 400 }
      );
    }

    if (!gitUrl && !targetUrl && !fileKey) {
      return NextResponse.json(
        { error: "Target artifact required: specify gitUrl, targetUrl, or uploaded fileKey." },
        { status: 400 }
      );
    }

    // SSRF validation for remote URLs
    const remoteUrl = gitUrl || targetUrl;
    if (remoteUrl) {
      try {
        await assertSafeUrl(remoteUrl);
      } catch (err: any) {
        return NextResponse.json(
          { error: `Target URL rejected: ${err.message}` },
          { status: 400 }
        );
      }
    }

    // IP rate limit check
    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = (forwarded ? forwarded.split(",")[0]?.trim() : null) || req.headers.get("x-real-ip") || "127.0.0.1";
    const ipCheck = await checkFreeTrialIpGate(clientIp);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          error: `Free analysis limit exceeded for this IP. Please try again in ${ipCheck.retryAfterSec}s or upgrade.`,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Target verified and accepted for analysis pipeline.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process analysis upload." },
      { status: 500 }
    );
  }
}
