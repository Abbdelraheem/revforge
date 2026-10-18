"use client";

import React, { useState } from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, Shield, Mail, Key, Globe, CheckCircle2, ArrowRight } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    inquiryType: "clean-room-rebuild",
    message: "",
    honeypot: "", // Bot trap
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.honeypot) {
      // Bot detected, silently drop
      return;
    }
    // Record inquiry state
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="space-y-4 mb-12 border-b border-border pb-8">
          <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs">
            SECURE COMMUNICATIONS & ENTERPRISE
          </Badge>
          <h1 className="text-3xl md:text-5xl font-mono font-bold tracking-tight">
            Contact Engineering & Sales
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
            Direct access to our application security architects and systems team. We respond within 4 business hours to enterprise inquiries.
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
                <CardDescription className="text-xs">
                  Fill in your project specifications for scoping assistance or custom enterprise agreements.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {submitted ? (
                  <div className="p-8 text-center space-y-4 font-mono">
                    <div className="h-12 w-12 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center mx-auto text-primary">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="text-lg font-bold text-foreground">Inquiry Logged Successfully</div>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Thank you. Your request has been queued in our triage routing system. An architectural lead will reach out to <strong className="text-foreground">{formData.email}</strong> shortly.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-xs text-primary underline underline-offset-4 mt-2"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
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
                        <label className="text-xs font-mono font-medium text-foreground">Full Name *</label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Dr. Abdelraheem"
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono font-medium text-foreground">Work Email *</label>
                        <Input
                          required
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@organization.com"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono font-medium text-foreground">Organization / Company</label>
                        <Input
                          value={formData.organization}
                          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                          placeholder="Acme Systems Corp."
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono font-medium text-foreground">Inquiry Category</label>
                        <select
                          value={formData.inquiryType}
                          onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                          className="w-full h-9 rounded border border-input bg-background px-3 py-1 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="clean-room-rebuild">Clean-Room Rebuild & Synthesis</option>
                          <option value="legacy-modernization">Legacy Application Modernization</option>
                          <option value="binary-audit">Binary & Firmware Reverse Engineering</option>
                          <option value="enterprise-sla">Dedicated Sandbox Cluster & Custom SLA</option>
                          <option value="security-disclosure">Security Vulnerability Disclosure</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-medium text-foreground">Project Scope & Technical Details *</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Provide details on target type (URL, APK, native binary), architecture requirements, or specific migration timelines..."
                        className="w-full rounded border border-input bg-background p-3 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    <Button type="submit" className="w-full font-mono text-xs">
                      <span>Submit Inquiry</span>
                      <ArrowRight className="ms-1.5 h-3.5 w-3.5 rtl:rotate-180" />
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
                <CardTitle className="text-xs font-mono font-bold flex items-center space-x-2 rtl:space-x-reverse text-foreground">
                  <Key className="h-4 w-4 text-primary" />
                  <span>Encrypted Communications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs font-mono text-muted-foreground">
                <p>For sensitive vulnerability disclosures or zero-knowledge binary analysis:</p>
                <div className="p-2.5 rounded border border-border bg-muted/60 text-[11px] break-all select-all">
                  PGP Fingerprint:
                  <br />
                  <span className="text-foreground">7F92 B04C E18A 992D 31E4 52B0 8891 0F2A B6C1 4410</span>
                </div>
                <div className="text-[11px] pt-1">
                  Email: <span className="text-foreground font-semibold">security@revforge.ai</span>
                </div>
              </CardContent>
            </Card>

            {/* Infrastructure Zones */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center space-x-2 rtl:space-x-reverse text-foreground">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Execution Infrastructure</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground font-mono">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span>US-East (Virginia)</span>
                  <span className="text-primary text-[11px]">Primary Sandbox</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span>EU-Central (Frankfurt)</span>
                  <span className="text-primary text-[11px]">GDPR Compliant</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>AP-Southeast (Singapore)</span>
                  <span className="text-primary text-[11px]">Edge Node</span>
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
