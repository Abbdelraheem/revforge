"use client";

import React, { useState } from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, Key, Globe, CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    inquiryType: "clean-room-rebuild",
    message: "",
    honeypot: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (formData.honeypot) {
      setSubmitted(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit support inquiry");
      }

      setTicketId(data.ticket?.id || "TICK-RECEIVED");
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "An error occurred while submitting inquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="space-y-4 mb-12 border-b border-border pb-8">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">SECURE COMMUNICATIONS &amp; ENTERPRISE
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">
            Contact Engineering &amp; Support
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
            Direct access to our application security architects and on-call systems team. Inquiries generate a tracked ticket ID and receive response within 4 business hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-mono font-bold flex items-center space-x-2 rtl:space-x-reverse">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span>Transmit Inquiry</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Fill in your project specifications for scoping assistance, technical queries, or custom SLAs.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {submitted ? (
                  <div className="p-8 text-center space-y-4 font-mono">
                    <div className="h-12 w-12 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center mx-auto text-primary">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="text-lg font-bold text-foreground">Inquiry Logged Successfully</div>
                    {ticketId && (
                      <div className="inline-block px-3 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary text-sm font-bold">
                        Ticket Reference: {ticketId}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Your ticket has been queued in our triage routing system. An architectural lead will reach out to <strong className="text-foreground">{formData.email}</strong> shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setTicketId(null);
                        setFormData({
                          name: "",
                          email: "",
                          organization: "",
                          inquiryType: "clean-room-rebuild",
                          message: "",
                          honeypot: "",
                        });
                      }}
                      className="text-sm text-primary underline underline-offset-4 mt-2"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="p-3 rounded border border-destructive/40 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Bot Trap */}
                    <div className="hidden" aria-hidden="true">
                      <input
                        type="text"
                        name="website_url_check"
                        tabIndex={-1}
                        value={formData.honeypot}
                        onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-mono font-medium text-foreground">Full Name *</label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Engineering Lead"
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-mono font-medium text-foreground">Work Email *</label>
                        <Input
                          required
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@organization.com"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-mono font-medium text-foreground">Organization / Company</label>
                        <Input
                          value={formData.organization}
                          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                          placeholder="Acme Systems Corp."
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-mono font-medium text-foreground">Inquiry Category</label>
                        <select
                          value={formData.inquiryType}
                          onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                          className="w-full h-9 rounded border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="clean-room-rebuild">Clean-Room Rebuild &amp; Synthesis</option>
                          <option value="legacy-modernization">Legacy Application Modernization</option>
                          <option value="binary-audit">Binary &amp; Firmware Reverse Engineering</option>
                          <option value="enterprise-sla">Dedicated Sandbox Cluster &amp; Custom SLA</option>
                          <option value="security-disclosure">Security Vulnerability Disclosure</option>
                          <option value="billing-support">Billing &amp; Platform Credits Support</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-mono font-medium text-foreground">Project Scope &amp; Technical Details *</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Provide details on target type (URL, APK, native binary), architecture requirements, or specific migration timelines..."
                        className="w-full rounded border border-input bg-background p-3 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full font-mono text-sm">
                      {loading ? (
                        <>
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          <span>Logging Ticket...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Ticket</span>
                          <ArrowRight className="ms-1.5 h-3.5 w-3.5 rtl:rotate-180" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Secure Sidebar */}
          <div className="space-y-6">
            {/* PGP Security Card */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono font-bold flex items-center space-x-2 rtl:space-x-reverse text-foreground">
                  <Key className="h-4 w-4 text-primary" />
                  <span>Encrypted Communications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm font-mono text-muted-foreground">
                <p>For sensitive vulnerability disclosures or zero-knowledge binary analysis:</p>
                <div className="p-2.5 rounded border border-border bg-muted/60 text-sm break-all select-all">
                  PGP Fingerprint:
                  <br />
                  <span className="text-foreground">7F92 B04C E18A 992D 31E4 52B0 8891 0F2A B6C1 4410</span>
                </div>
                <div className="text-sm pt-1">
                  Email: <span className="text-foreground font-semibold">security@revforge.ai</span>
                </div>
              </CardContent>
            </Card>

            {/* Infrastructure Zones */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono font-bold flex items-center space-x-2 rtl:space-x-reverse text-foreground">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Execution Infrastructure</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm text-muted-foreground font-mono">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span>US-East (Virginia)</span>
                  <span className="text-primary text-sm">Primary Sandbox</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span>EU-Central (Frankfurt)</span>
                  <span className="text-primary text-sm">GDPR Compliant</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>AP-Southeast (Singapore)</span>
                  <span className="text-primary text-sm">Edge Node</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
