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
    // Record error telemetry securely without leaking PII
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground font-mono">
      <div className="max-w-md w-full p-8 rounded border border-destructive/40 bg-card space-y-6 text-center">
        <div className="h-12 w-12 rounded border border-destructive/40 bg-destructive/10 flex items-center justify-center mx-auto text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
            ERR_500: APPLICATION_FAULT
          </Badge>
          <h1 className="text-xl font-bold text-foreground">
            System Execution Interrupted
          </h1>
          <p className="text-xs text-muted-foreground font-sans leading-relaxed">
            An unexpected error occurred during execution. The current state has been safely isolated to preserve data integrity.
          </p>
        </div>

        {error.digest && (
          <div className="p-3 rounded border border-border bg-background text-left text-[11px] text-muted-foreground">
            <div>Fault Digest: <span className="text-foreground">{error.digest}</span></div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button size="sm" onClick={() => reset()} className="w-full sm:w-auto text-xs">
            <RefreshCw className="me-1.5 h-3.5 w-3.5" />
            <span>Retry Execution</span>
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full text-xs">
              <ArrowLeft className="me-1.5 h-3.5 w-3.5 rtl:rotate-180" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
