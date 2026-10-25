"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error details stay in the browser; no customer content is sent to a third party.
  }, [error]);

  return (
    <main
      id="main-content"
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center bg-background p-6 font-mono text-foreground"
    >
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/40 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <Badge variant="outline" className="border-destructive/40 text-sm text-destructive">
            500 — Application error
          </Badge>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            This page could not complete
          </h1>
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            The request stopped before a verified result was available. Retry the page, or return
            home. No partial result is presented as successful.
          </p>
        </div>

        {error.digest && (
          <div className="rounded-md border border-border bg-background p-3 text-start text-sm text-muted-foreground">
            Reference: <span className="font-mono text-foreground">{error.digest}</span>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button size="sm" onClick={() => reset()} className="w-full text-sm sm:w-auto">
            <RefreshCw className="me-1.5 h-3.5 w-3.5" />
            <span>Try again</span>
          </Button>
          <Button asChild size="sm" variant="outline" className="w-full text-sm sm:w-auto">
            <Link href="/">
              <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
              <span>Back home</span>
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
