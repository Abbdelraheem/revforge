import React from "react";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, ArrowRight, HelpCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Pricing — RevForge AI Clean-Room Engineering",
  description: "Transparent, dynamically calculated unit economics for clean-room reverse engineering and code generation.",
};

const tiers = [
  {
    name: "Portfolio / Landing Page",
    price: "$29",
    turnaround: "~3 minutes",
    description: "Static/SSG sites, marketing portfolios, and design showcases.",
    features: [
      "Visual design system extraction",
      "Full responsive Next.js 15 + Tailwind code",
      "Clean semantic markup & SEO metadata",
      "Interactive contact form & email routing",
      "Zero-CVE security verification pass",
    ],
  },
  {
    name: "Interactive Web Application",
    price: "$49",
    turnaround: "~6 minutes",
    popular: true,
    description: "CRUD apps, dashboards, customer portals, and dynamic web tools.",
    features: [
      "Full client routing & state tree synthesis",
      "TypeScript REST/Server Action endpoints",
      "Relational Drizzle ORM database schema",
      "JWT/Session authentication boundaries",
      "Complete test suite (100% pass guarantee)",
    ],
  },
  {
    name: "Mobile App Package (.APK)",
    price: "$149",
    turnaround: "~12 minutes",
    description: "Android .apk packages and hybrid mobile applications.",
    features: [
      "Headless JADX bytecode disassembly",
      "Asset & resource carving from archive",
      "Clean-room React Native / Expo rewrite",
      "Navigation stack & local storage bindings",
      "Offline cache & push notification contracts",
    ],
  },
  {
    name: "Native Desktop / Electron",
    price: "$249",
    turnaround: "~18 minutes",
    description: "Electron .asar bundles, native Windows PE (.exe/.dll), and Linux ELF binaries.",
    features: [
      "Ghidra decompilation in gVisor sandbox",
      "ASAR archive deconstruction & extraction",
      "IPC event bus & native OS contract synthesis",
      "Local file system isolation guards",
      "Cross-platform compilation config",
    ],
  },
  {
    name: "Enterprise SaaS Platform",
    price: "$499",
    turnaround: "~25 minutes",
    description: "Full multi-module ecosystems, multi-tenant databases, and queue workers.",
    features: [
      "Multi-tenant PostgreSQL schema with RLS",
      "BullMQ asynchronous job queue architecture",
      "Subscription billing & webhook verification",
      "Granular RBAC permission matrix",
      "Full Docker Compose & cloud deployment configs",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <MarketingHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline">Flat-Rate Dynamic Pricing</Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Transparent, Predictable Engineering Costs
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every quote is dynamically calculated from actual target complexity and container resource requirements. No surprise bills. No hourly creep. You pay once per verified clean-room build.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`flex flex-col justify-between border-hairline relative ${
                tier.popular ? "border-primary ring-1 ring-primary/30" : ""
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-2.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                  <Badge variant="default" className="text-[10px] uppercase font-mono">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="p-5 pb-3 space-y-2">
                <CardTitle className="text-sm font-bold">{tier.name}</CardTitle>
                <CardDescription className="text-[11px] leading-snug">
                  {tier.description}
                </CardDescription>
                <div className="pt-2">
                  <div className="text-3xl font-extrabold font-mono text-foreground">
                    {tier.price}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    one-time / project • {tier.turnaround}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-2 flex-1">
                <ul className="space-y-2 text-xs text-muted-foreground font-mono">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="h-3.5 w-3.5 text-primary me-2 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight font-sans text-foreground/80">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-5 pt-0">
                <Link href="/#triage-console" className="w-full">
                  <Button
                    variant={tier.popular ? "default" : "outline"}
                    size="sm"
                    className="w-full font-mono text-xs"
                  >
                    Analyze Target
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* What's Included & Guarantee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-xl border border-border bg-card">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground">What is Included in Every Rebuild</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center">
                <ShieldCheck className="h-4 w-4 text-primary me-2" />
                <span>100% Original, Clean-Room Synthesized TypeScript / Next.js Source Code</span>
              </li>
              <li className="flex items-center">
                <ShieldCheck className="h-4 w-4 text-primary me-2" />
                <span>Zero Third-Party Copyrighted Binaries in Generated Artifacts</span>
              </li>
              <li className="flex items-center">
                <ShieldCheck className="h-4 w-4 text-primary me-2" />
                <span>Automated Unit Tests & Zero-CVE Security Scan Verification Report</span>
              </li>
              <li className="flex items-center">
                <ShieldCheck className="h-4 w-4 text-primary me-2" />
                <span>Complete Dockerfile, environment configuration, and setup README</span>
              </li>
              <li className="flex items-center">
                <ShieldCheck className="h-4 w-4 text-primary me-2" />
                <span>Evidence Ledger Audit Dossier documenting Seen vs Inferred contracts</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground">Verification & Refund Policy</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If an automated rebuild fails verification tests or cannot compile cleanly inside the isolated sandbox, the system automatically triggers up to two self-repair compilation cycles. If the build remains unverified, 100% of your payment is automatically refunded or credited to your account.
            </p>
            <div className="pt-2">
              <span className="text-[11px] font-mono text-muted-foreground block">
                Currency: All prices charged in USD. Local currency conversion supported via Paddle.
              </span>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
