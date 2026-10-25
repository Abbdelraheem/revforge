"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the client boundary observable without sending customer content to a third party.
    if (process.env.NODE_ENV !== "production") {
      process.stderr.write(`[global-error] ${error.message}\n`);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <main
          id="main-content"
          className="flex min-h-screen flex-col items-center justify-center p-6"
        >
          <div
            role="alert"
            className="w-full max-w-md space-y-5 rounded-lg border border-destructive/40 bg-card p-6 text-center shadow-sm"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-foreground">
                The application could not start
              </h1>
              <p className="text-sm text-muted-foreground">
                A fatal rendering error interrupted this page. Retry the request, or return to the
                public home page. No partial result is presented as successful.
              </p>
              {error.digest && (
                <p className="font-mono text-sm text-muted-foreground">
                  Reference: {error.digest}
                </p>
              )}
            </div>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <RefreshCw className="me-2 h-4 w-4" />
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Home className="me-2 h-4 w-4" />
                Public home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
