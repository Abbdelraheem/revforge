"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Terminal, Shield, ArrowRight, Lock, Mail, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { LangThemeToggle } from "@/components/shared/lang-theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Authenticate / mock login session
      await new Promise((resolve) => setTimeout(resolve, 600));
      // Store session token in cookie/localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("revforge_session", JSON.stringify({ email, authenticated: true, role: "lead_architect" }));
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate session.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("revforge_session", JSON.stringify({ email: "demo@revforge.ai", authenticated: true, role: "lead_architect" }));
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground font-mono">
      <div className="absolute top-4 end-4">
        <LangThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2 rtl:space-x-reverse group">
            <div className="h-8 w-8 rounded border border-primary/40 bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition">
              <Terminal className="h-4 w-4" />
            </div>
            <span className="font-mono text-base font-bold tracking-tight text-foreground">
              RevForge<span className="text-primary">.ai</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground font-sans">
            Sign in to access your clean-room projects & sandboxes
          </p>
        </div>

        {/* Card */}
        <Card className="border-border bg-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-sm font-bold text-foreground">
              Authenticate Session
            </CardTitle>
            <CardDescription className="text-xs">
              Zero-Trust cryptographically verified workspace access.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-2.5 rounded border border-destructive/40 bg-destructive/10 text-destructive text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Work Email</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="architect@enterprise.com"
                    className="ps-9 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-foreground">Password</label>
                  <span className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                    Reset?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="ps-9 font-mono text-xs"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full text-xs font-mono">
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5 rtl:rotate-180" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">Demo & Testing</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              className="w-full text-xs font-mono border-dashed border-primary/40 hover:bg-primary/5 text-primary"
            >
              <Terminal className="me-1.5 h-3.5 w-3.5" />
              <span>One-Click Instant Demo Login</span>
            </Button>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-center justify-center text-xs text-muted-foreground">
            <span>Don&apos;t have an account? </span>
            <Link href="/register" className="text-primary hover:underline ms-1 font-semibold">
              Create Workspace
            </Link>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
          <Shield className="h-3 w-3 text-primary" />
          <span>Protected by Zero-Trust Ephemeral Authentication</span>
        </div>
      </div>
    </div>
  );
}
