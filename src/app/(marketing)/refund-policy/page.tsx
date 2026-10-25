import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/config/brand";

export const metadata = {
  title: `Refund Policy & Platform Credits | ${BRAND.name}`,
  description: "Terms governing platform credit issuance, build failure compensations, and order adjustments.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main id="main-content" className="flex-1 py-16 px-6 max-w-4xl mx-auto w-full space-y-10">
        <div className="space-y-4 border-b border-border pb-6">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">BILLING & CREDITS POLICY
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">
            Refund Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: October 20, 2026 | Version 1.0
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground font-sans">
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-foreground">1. Platform Credit Model</h2>
            <p>
              {BRAND.name} operates on a platform credit compensation model. All adjustments, build failure compensations, and partial delivery refunds are issued directly as platform credits to your workspace ledger in integer cents (USD).
            </p>
            <p>
              Platform credits never expire and are automatically applied towards subsequent build orders or architectural analyses.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-foreground">2. Build Failure Compensation</h2>
            <p>
              If an autonomous compilation run terminates in a terminal <code className="text-primary font-mono">build_failed</code> state because verification criteria or health checks could not be met within the maximum iteration window, a <strong>100% platform credit refund</strong> is automatically credited to your workspace ledger.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-foreground">3. Partial Delivery Adjustments</h2>
            <p>
              In scenarios where a build achieves partial parity (between 50% and 79% composite verification score), a proportional platform credit refund is automatically calculated based on the unfulfilled parity gap and added to your credit balance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-foreground">4. Analysis Fees</h2>
            <p>
              Each verified workspace receives 1 complimentary deep static analysis. Subsequent analyses use the analysis fee recorded at checkout, which is credited towards the project build quote if you decide to proceed with source synthesis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-foreground">5. Studio Tokens & Edits</h2>
            <p>
              Studio tokens are consumed in real-time for autonomous code edits, prompt enhancements, and preview sandbox instances. Once an edit is accepted and credits are settled, Studio tokens are non-refundable. If an edit fails or is rejected by automated safety/parity guards, the held tokens are immediately and fully restored to your balance. All refunds across {BRAND.name} are issued exclusively as platform credits.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-foreground">6. Billing Disputes & Inquiries</h2>
            <p>
              If you believe an order was processed in error or experience technical discrepancies, contact our engineering billing desk at <a href={`mailto:${BRAND.supportEmail}`} className="text-primary underline underline-offset-2 hover:no-underline">{BRAND.supportEmail}</a>.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
