import { BRAND } from "@/config/brand";
import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, Ban, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata = {
  title: `Acceptable Use Policy (AUP) | ${BRAND.name}`,
  description: "Mandatory security standards, malware prohibitions, and ethical reverse engineering requirements.",
};

export default function AcceptableUsePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main id="main-content" className="flex-1 py-16 px-6 max-w-4xl mx-auto w-full">
        <div className="space-y-4 mb-10 border-b border-border pb-6">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">SECURITY & ETHICAL POLICY
          </p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
            Acceptable Use Policy (AUP)
          </h1>
          <div className="text-sm text-muted-foreground font-mono">
            Effective Date: October 17, 2026 | Version 2.4
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono font-bold text-amber-500 flex items-center space-x-2 ">
                <AlertTriangle className="h-4 w-4" />
                <span>Strict Prohibition Against Weaponization & Malware</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-normal">
              {BRAND.name} exists solely to facilitate architectural modernization, software interoperability, legacy codebase salvation, and clean-room independent re-implementation. The platform shall never be used to reverse engineer, unpack, or weaponize malicious software, ransomware, rootkits, or cyber weapons.
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-bold text-foreground">1. Prohibited Target Submissions</h2>
            <p>You agree NOT to upload, ingest, or analyze any artifact that contains or facilitates:</p>
            <ul className="list-disc ps-5 space-y-1.5">
              <li>Malicious payloads, viruses, Trojan horses, ransomware, wipers, or spyware.</li>
              <li>Command and Control (C2) botnet clients or infrastructure tooling.</li>
              <li>Exploit payloads, 0-day weaponization scripts, or intrusion software.</li>
              <li>Stolen intellectual property, classified military or governmental data, or unauthorized medical records.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-bold text-foreground">2. Authorized Interoperability & Authority</h2>
            <p>Before submitting any target URL or binary executable, you represent and warrant that:</p>
            <ul className="list-disc ps-5 space-y-1.5">
              <li>You are the rightful owner, licensee, or designated security evaluator of the submitted software.</li>
              <li>Your reverse engineering activity qualifies as lawful interoperability analysis or research under applicable law.</li>
              <li>You will not use the clean-room synthesized output to infringe trademarks, patents, or trade secrets.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-serif font-bold text-foreground">3. Automated Sandboxing & Immediate Enforcement</h2>
            <p>
              Our infrastructure actively monitors binary disassembly passes inside gVisor (<code className="font-mono">runsc</code>) micro-VMs. If a target triggers signature-based malware detection or attempts sandbox escape:
            </p>
            <ul className="list-disc ps-5 space-y-1.5">
              <li>The executing container is instantly terminated (<code className="font-mono">SIGKILL</code>).</li>
              <li>The offending user account is permanently suspended without refund.</li>
              <li>Vulnerability signatures and source hashes are preserved for law enforcement review.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-foreground">4. Reporting Violations</h2>
            <p>
              To report suspicious activity or policy violations, please email our security operations team at <span className="font-mono text-foreground font-semibold">abuse@revforge.ai</span>.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

