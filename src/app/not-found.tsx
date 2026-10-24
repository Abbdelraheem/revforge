import React from "react";
import Link from "next/link";
import { Terminal, ArrowLeft, ArrowRight, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground font-mono">
      <div className="max-w-md w-full p-8 rounded border border-border bg-card space-y-6 text-center">
        <div className="h-12 w-12 rounded border border-border bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Terminal className="h-6 w-6 text-primary" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-sm uppercase text-muted-foreground font-semibold">ERR_404: Resource Not Found</span>
          <h1 className="text-xl font-bold text-foreground">
            Specified Endpoint Does Not Exist
          </h1>
          <p className="text-sm text-muted-foreground font-sans leading-relaxed">
            The requested route or target archive was not found within the {BRAND.name} registry or has been purged per zero-retention policies.
          </p>
        </div>

        <div className="p-3 rounded border border-border bg-background text-left text-sm text-muted-foreground space-y-1">
          <div>$ status: 404 Not Found</div>
          <div>$ perimeter: public_gateway</div>
          <div>$ action: reroute_to_origin</div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full text-sm">
              <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
              <span>Return Home</span>
            </Button>
          </Link>
          <Link href="/docs" className="w-full sm:w-auto">
            <Button size="sm" className="w-full text-sm">
              <span>View Docs</span>
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
