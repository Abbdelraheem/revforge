import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Privacy Policy & Data Retention — RevForge",
  description: "Zero-retention data privacy standards, cryptographic vault handling, and artifact lifecycle policies.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-4xl mx-auto w-full">
        <div className="space-y-4 mb-10 border-b border-border pb-6">
          <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs">
            DATA PRIVACY & PROTECTION
          </Badge>
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-tight">
            Privacy Policy
          </h1>
          <div className="text-xs text-muted-foreground font-mono">
            Effective Date: October 17, 2026 • Version 2.4
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-xs leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-mono font-bold text-foreground">1. Zero-Retention Artifact Principles</h2>
            <p>
              At RevForge, our operational architecture is built upon a fundamental Zero-Trust commitment: <strong>We do not retain, train on, or monetize your submitted binaries, source code, or reverse-engineered deliverables.</strong>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-mono font-bold text-foreground">2. Artifact Lifecycle & Automated Scrubbing</h2>
            <p>
              When you submit a target URL or upload an executable artifact (.apk, .asar, native binary):
            </p>
            <ul className="list-disc ps-5 space-y-1.5">
              <li>
                <strong>Ephemeral Vault Storage:</strong> Uploaded files are encrypted at rest with AES-256 and stored in a cryptographically isolated storage vault accessible only by your ephemeral sandbox container.
              </li>
              <li>
                <strong>Automatic 24-Hour Purge:</strong> Uploaded binaries and decompiled intermediate files are permanently wiped 24 hours after job completion.
              </li>
              <li>
                <strong>Download Expiration:</strong> Final generated clean-room ZIP bundles remain downloadable via signed HMAC URLs for 72 hours, after which they are expunged from primary storage.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-mono font-bold text-foreground">3. Information We Collect</h2>
            <p>
              We collect only the bare operational minimum necessary to provide the service:
            </p>
            <ul className="list-disc ps-5 space-y-1.5">
              <li><strong>Account Credentials:</strong> Email address and hashed authentication tokens for account access.</li>
              <li><strong>Billing Information:</strong> Payment transactions are managed securely by our Merchant of Record, Paddle.com. We never store credit card numbers or banking credentials.</li>
              <li><strong>Operational Logs:</strong> Ephemeral server telemetry logs (IP addresses, request durations, status codes) retained for 14 days solely for security auditing and abuse prevention.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-mono font-bold text-foreground">4. No AI Model Training</h2>
            <p>
              Under no circumstances are client-submitted binaries, extracted schemas, prompt inputs, or generated clean-room source files used to train, tune, or evaluate foundation AI models. We maintain contractual zero-data-retention agreements with our upstream model inference providers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-mono font-bold text-foreground">5. GDPR & CCPA Compliance</h2>
            <p>
              In accordance with the EU General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA), you have the right to request full erasure of your account and telemetry records. You may exercise these rights at any time by emailing <span className="font-mono text-foreground font-semibold">privacy@revforge.ai</span>.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

