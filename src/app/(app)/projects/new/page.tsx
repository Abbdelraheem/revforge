import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { submitTargetAction } from "@/server/actions/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Globe, Shield } from "lucide-react";
import { BRAND } from "@/config/brand";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-8 font-sans">
      <div className="space-y-2 border-b border-border pb-4">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">CLEAN-ROOM RECONSTRUCTION
        </p>
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          Initialize New Project Analysis
        </h1>
        <p className="text-sm text-muted-foreground">
          Submit any live web application, repository URL, or package target to initiate empirical observation.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Target Source Specification</CardTitle>
          <CardDescription className="text-sm">
            Enter a publicly accessible URL or application endpoint. Our non-root gVisor sandbox will inspect visible routes and AST structures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitTargetAction} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="target-input" className="text-sm font-semibold text-foreground">
                Target URL or Source
              </label>
              <div className="relative">
                <Globe
                  aria-hidden="true"
                  className="absolute start-3 top-3 h-4 w-4 text-muted-foreground"
                />
                <Input
                  id="target-input"
                  name="targetInput"
                  required
                  placeholder="https://example.com"
                  aria-describedby="target-input-help"
                  className="ps-9 text-sm"
                />
              </div>
              <p id="target-input-help" className="text-sm text-muted-foreground">
                Public URLs are observed through the sandboxed crawler. Upload targets use the
                project workspace once created.
              </p>
            </div>

            <div className="p-4 rounded-md border border-border bg-muted/20 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2 text-foreground font-semibold">
                <Shield className="h-4 w-4 text-primary" />
                <span>Zero-Retention Clean-Room Protocol</span>
              </div>
              <p>
                Target observation is decoupled from synthesis. No proprietary bytecode is copied; only observable interfaces and public contracts are recorded in your Evidence Ledger.
              </p>
            </div>

            <Button type="submit" className="w-full text-sm font-bold shadow-sm h-11">
              <span>Begin Architectural Analysis</span>
              <ArrowRight className="ms-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
