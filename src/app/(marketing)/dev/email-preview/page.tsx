"use client";

import React, { useState } from "react";
import { BRAND } from "@/config/brand";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SAMPLES = [
  {
    id: "verify",
    title: "1. Verify Email",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Verify Your Email</h2>
        <p>Thank you for creating an account with ${BRAND.name}. Please confirm your email address by clicking the button below:</p>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/verify-email?token=sample" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirm Email Address</a></p>
        <p style="color: #78716c; font-size: 14px; margin-top: 30px;">If you did not register for an account, please ignore this email.</p>
      </div>
    `,
  },
  {
    id: "analysis_ready",
    title: "2. Analysis Ready",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Analysis Complete</h2>
        <p>Your architectural analysis for <strong>Nova SaaS Landing Page</strong> is ready for review.</p>
        <p>The technical report details route topologies, detected components, complexity tier, and clean-room implementation estimates.</p>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/projects/sample-id" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">View Technical Report &amp; Quote</a></p>
      </div>
    `,
  },
  {
    id: "quote_ready",
    title: "3. Quote Ready",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Clean-Room Rebuild Quote</h2>
        <p>A formal quote has been generated for <strong>Nova SaaS Landing Page</strong> based on measured technical scope.</p>
        <div style="background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Estimated Scope:</strong> 12 engineering hours</p>
          <p style="margin: 0; font-size: 18px;"><strong>Clean-Room Price:</strong> <span style="color: #c2410c; font-weight: bold;">$360.00</span> (50% market benchmark)</p>
        </div>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/projects/sample-id" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Review Quote &amp; Attestation</a></p>
      </div>
    `,
  },
  {
    id: "payment_received",
    title: "4. Payment Received",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Payment Received</h2>
        <p>Thank you. Your payment of <strong>$360.00</strong> for <strong>Nova SaaS Landing Page</strong> has been confirmed.</p>
        <p>Your build job has been queued in our isolated worker pool. You can monitor progress and live build iterations from your project workspace.</p>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/projects/sample-id" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Track Build Progress</a></p>
      </div>
    `,
  },
  {
    id: "build_started",
    title: "5. Build Started",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Build Execution In Progress</h2>
        <p>The clean-room synthesizer has initiated code generation for <strong>Nova SaaS Landing Page</strong> (Job #a4f91b2c).</p>
        <p>The builder agent will iteratively construct, compile, and execute sandbox parity verification passes.</p>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/projects/sample-id" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Open Live Dashboard</a></p>
      </div>
    `,
  },
  {
    id: "build_failed_refunded",
    title: "6. Build Failed & Refunded",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Build Incomplete &amp; Refund Issued</h2>
        <p>The automated build engine encountered an unresolvable compilation or parity obstacle on <strong>Target App</strong> (Job #b8e19c0a).</p>
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 16px; margin: 16px 0; color: #991b1b;">
          <p style="margin: 0;"><strong>Platform Credits Refunded:</strong> $360.00 has been credited to your workspace ledger.</p>
        </div>
        <p>Our on-call systems team has been notified. You can review your ledger balance or request architectural triage assistance:</p>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/contact" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Contact Engineering Support</a></p>
      </div>
    `,
  },
  {
    id: "delivery_ready",
    title: "7. Delivery Ready",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Your Clean-Room Delivery is Ready</h2>
        <p>The verified archive for <strong>Nova SaaS Landing Page</strong> is available in your workspace.</p>
        <p>Version: <strong>v1.0.0</strong></p>
        <p>SHA-256: <code style="word-break: break-all;">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code><br />Archive size: 4.20 MB<br />Retained until: 2026-11-23T00:00:00.000Z</p>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/projects/sample-id/delivery" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Download Package &amp; Git Repository</a></p>
        <p style="color: #78716c; font-size: 14px; margin-top: 30px;">The email links to your authenticated workspace. It does not contain a long-lived storage credential.</p>
      </div>
    `,
  },
  {
    id: "tokens_low",
    title: "8. Studio Tokens Low",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Studio Credits Notice</h2>
        <p>Your workspace <strong>Acme Corp</strong> has <strong>$1.50</strong> remaining in platform credits.</p>
        <p>To avoid interruptions while making edits in ${BRAND.name} Studio, top up your credit ledger:</p>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/billing" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Top Up Credits</a></p>
        <p style="color: #a8a29e; font-size: 12px; margin-top: 36px; border-top: 1px solid #e7e5e4; padding-top: 12px;">To stop receiving balance alert notifications, <a href="https://revforge.ai/api/user/unsubscribe" style="color: #78716c;">unsubscribe here</a>.</p>
      </div>
    `,
  },
  {
    id: "delivery_expiring",
    title: "9. Delivery Expiring (30-day)",
    renderHtml: () => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #1c1917;">
        <h2>Delivery Retention Expiring</h2>
        <p>The download bundle and git bundle for <strong>Nova SaaS Landing Page</strong> are scheduled for lifecycle expiration on <strong>11/23/2026</strong> per our 30-day retention policy.</p>
        <p>Please download and backup your repository archives before this date:</p>
        <p style="margin: 24px 0;"><a href="https://revforge.ai/projects/sample-id/delivery" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Download Archive Now</a></p>
      </div>
    `,
  },
];

export default function DevEmailPreviewPage() {
  const [selected, setSelected] = useState(SAMPLES[0]!);
  const current = selected ?? SAMPLES[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-8 space-y-6 max-w-7xl mx-auto">
      <div className="border-b border-border pb-4 space-y-1">
        <Badge variant="outline" className="text-primary border-primary/40 text-sm">
          INTERNAL DEVELOPMENT TOOL
        </Badge>
        <h1 className="text-2xl font-bold font-serif">Transactional Email Template Previewer</h1>
        <p className="text-sm text-muted-foreground">
          Visual test harness for all lifecycle emails dispatched by {BRAND.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation list */}
        <div className="space-y-1">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => setSelected(sample)}
              className={`w-full text-start px-3 py-2.5 rounded text-sm font-mono transition-colors ${
                current.id === sample.id
                  ? "bg-primary text-primary-foreground font-bold"
                  : "hover:bg-muted/30 text-muted-foreground"
              }`}
            >
              {sample.title}
            </button>
          ))}
        </div>

        {/* Preview Frame */}
        <div className="lg:col-span-3">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base font-serif flex items-center justify-between">
                <span>{current.title}</span>
                <span className="font-mono text-sm text-muted-foreground font-normal">
                  Resend HTML Template
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div
                className="border border-border rounded bg-background p-6 shadow-inner"
                dangerouslySetInnerHTML={{ __html: current.renderHtml() }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
