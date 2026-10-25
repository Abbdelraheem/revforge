"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function AppError({
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
    <div
      role="alert"
      className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 p-6 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h1 className="font-serif text-xl font-bold text-foreground">Application error</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This workspace page could not complete. The rest of the workspace is unchanged.
        </p>
        {error.digest && (
          <p className="font-mono text-sm text-muted-foreground">Reference: {error.digest}</p>
        )}
      </div>
      <Button onClick={() => reset()} className="text-sm font-semibold">
        <RefreshCw className="me-2 h-4 w-4" />
        <span>Try again</span>
      </Button>
    </div>
  );
}
