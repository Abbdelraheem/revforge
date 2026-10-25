import React from "react";
import Link from "next/link";
import { Terminal, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-background p-6 font-mono text-foreground"
    >
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          <Terminal className="h-6 w-6 text-primary" />
        </div>

        <div className="space-y-2">
          <Badge variant="outline" className="text-sm">
            404 — Resource not found
          </Badge>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            This route does not exist
          </h1>
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            The requested page is not present in {BRAND.name}. It may have moved, or the link may
            be incomplete. No substitute record is shown.
          </p>
        </div>

        <div className="space-y-1 rounded-md border border-border bg-background p-3 text-start text-sm text-muted-foreground">
          <div>status: 404 Not Found</div>
          <div>perimeter: public gateway</div>
          <div>action: reroute to a known page</div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button asChild size="sm" variant="outline" className="w-full text-sm sm:w-auto">
            <Link href="/">
              <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
              <span>Return home</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="w-full text-sm sm:w-auto">
            <Link href="/docs">
              <span>View docs</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
