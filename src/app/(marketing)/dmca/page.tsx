import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "DMCA & Copyright Takedown Notice — RevForge",
  description: "Digital Millennium Copyright Act compliance, designated agent notification procedures, and counter-notice provisions.",
};

export default function DmcaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-4xl mx-auto w-full">
        <div className="space-y-4 mb-10 border-b border-border pb-6">
          <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs">
            COPYRIGHT COMPLIANCE
          </Badge>
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-tight">
            DMCA & Copyright Policy
          </h1>
          <div className="text-xs text-muted-foreground font-mono">
            Notice & Takedown Protocol under 17 U.S.C. § 512
          </div>
        </div>

        <div className="space-y-8 text-xs leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-base font-mono font-bold text-foreground">1. Policy Overview</h2>
            <p>
              RevForge respects the intellectual property rights of creators and adheres strictly to the Digital Millennium Copyright Act (17 U.S.C. § 512) and international copyright directives. If you believe that content hosted on our infrastructure or generated through our service infringes upon a valid copyright you own or control, you may submit a formal notification to our Designated Copyright Agent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-mono font-bold text-foreground">2. Requirements for a Valid DMCA Notice</h2>
            <p>To be effective under 17 U.S.C. § 512(c)(3), your written notice must include:</p>
            <ol className="list-decimal ps-5 space-y-1.5">
              <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
              <li>Identification of the copyrighted work claimed to have been infringed, or a representative list of such works.</li>
              <li>Identification of the material claimed to be infringing or to be the subject of infringing activity and information reasonably sufficient to permit us to locate the material (e.g., project URL, repository ID).</li>
              <li>Information reasonably sufficient to permit us to contact you, including your name, address, telephone number, and email address.</li>
              <li>A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
              <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
            </ol>
          </section>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono font-bold text-foreground">
                Designated Copyright Agent Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-[11px] space-y-1 text-muted-foreground">
              <div>RevForge Inc. — Legal Operations Group</div>
              <div>Attn: Copyright Agent</div>
              <div>Email: <span className="text-foreground font-semibold">dmca@revforge.ai</span></div>
              <div>Location: Dover, Delaware, USA</div>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-base font-mono font-bold text-foreground">3. Counter-Notification Procedure</h2>
            <p>
              If a user believes that their content or synthesized deliverable was removed or disabled as a result of mistake or misidentification, they may file a counter-notification under 17 U.S.C. § 512(g). Upon receipt of a valid counter-notice, we will provide a copy to the original complaining party.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-mono font-bold text-foreground">4. Repeat Infringer Policy</h2>
            <p>
              In accordance with Section 512(i)(1)(A) of the DMCA, RevForge maintains a policy that provides for the immediate termination in appropriate circumstances of user accounts found to be repeat infringers of copyright.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

