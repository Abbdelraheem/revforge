"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Terminal, Shield, ArrowRight, Lock, Mail, User, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { LangThemeToggle } from "@/components/shared/lang-theme-toggle";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError("You must agree to the Terms of Service and Clean-Room IP Policy.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "revforge_session",
          JSON.stringify({ email, name, organization, authenticated: true, role: "workspace_admin" })
        );
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground font-mono">
      <div className="absolute top-4 end-4">
        <LangThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
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
            Deploy an isolated clean-room reverse engineering workspace
          </p>
        </div>

        {/* Card */}
        <Card className="border-border bg-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-sm font-bold text-foreground">
              Create Engineering Workspace
            </CardTitle>
            <CardDescription className="text-xs">
              Includes dedicated sandbox runner, Evidence Ledger audit logs, and Paddle billing integration.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-2.5 rounded border border-destructive/40 bg-destructive/10 text-destructive text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Abdelraheem"
                      className="ps-9 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Organization</label>
                  <div className="relative">
                    <Building className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      required
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Systems Lab Inc"
                      className="ps-9 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Work Email</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="architect@organization.com"
                    className="ps-9 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Master Password</label>
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

              <div className="flex items-start space-x-2 rtl:space-x-reverse pt-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-border"
                />
                <label htmlFor="agreeTerms" className="leading-tight text-[11px]">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary underline">
                    Terms
                  </Link>
                  ,{" "}
                  <Link href="/acceptable-use" className="text-primary underline">
                    Acceptable Use Policy
                  </Link>
                  , and{" "}
                  <Link href="/clean-room-ip-policy" className="text-primary underline">
                    Clean-Room Policy
                  </Link>
                  .
                </label>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full text-xs font-mono">
                {isLoading ? (
                  <span>Initializing Workspace...</span>
                ) : (
                  <>
                    <span>Create Enterprise Account</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5 rtl:rotate-180" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-center justify-center text-xs text-muted-foreground">
            <span>Already have a workspace? </span>
            <Link href="/login" className="text-primary hover:underline ms-1 font-semibold">
              Sign In
            </Link>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
          <Shield className="h-3 w-3 text-primary" />
          <span>Non-Root Sandbox • Zero Data Retention • AES-256</span>
        </div>
      </div>
    </div>
  );
}
