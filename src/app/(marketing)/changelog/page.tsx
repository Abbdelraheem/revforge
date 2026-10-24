import React from "react";
import { BRAND } from "@/config/brand";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getChangelogReleases } from "@/lib/changelog";

export const metadata = {
  title: `Engineering Changelog | ${BRAND.name}`,
  description:
    "Chronological release notes, architecture improvements, security hardening passes, and sandbox runtime updates.",
};

export default function ChangelogPage() {
  const releases = getChangelogReleases();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-4xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="space-y-4 border-b border-border pb-8">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">ENGINEERING RELEASES
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-serif text-foreground">
            Platform Changelog
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            All notable changes, security verifications, and architectural updates to {BRAND.name}, synced directly from the repository source log.
          </p>
        </div>

        {/* Releases List */}
        <div className="space-y-12">
          {releases.length === 0 ? (
            <p className="text-muted-foreground text-sm">No release entries documented yet.</p>
          ) : (
            releases.map((release, idx) => (
              <div key={release.version} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold font-serif text-foreground">
                      v{release.version}
                    </h2>
                    {idx === 0 && (
                      <Badge variant="default" className="text-sm font-mono">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    Released on {release.date}
                  </span>
                </div>

                <div className="space-y-6">
                  {release.sections.map((sec, sIdx) => (
                    <Card key={sIdx} className="border-border bg-card shadow-sm">
                      <CardContent className="p-6 space-y-3">
                        <h3 className="text-base font-serif font-bold text-primary">
                          {sec.title}
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {sec.items.map((item, iIdx) => (
                            <li key={iIdx} className="flex items-start gap-2">
                              <span className="text-primary font-bold mt-0.5">-</span>
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
