"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, User, Building, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RevForgeLogo } from "@/components/shared/revforge-logo";
import { GoogleIcon } from "@/components/shared/google-icon";

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
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "revforge_session",
          JSON.stringify({ email: email.trim(), name: name.trim(), organization: organization.trim(), authenticated: true })
        );
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "revforge_session",
          JSON.stringify({ email: "google.user@revforge.com", name: "Google Verified Architect", authenticated: true })
        );
      }
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2.5 group">
            <div className="h-9 w-9 rounded border border-border bg-muted/40 flex items-center justify-center">
              <RevForgeLogo className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground font-mono">
              RevForge
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            Create an account to run unlimited architectural analysis and project rebuilds
          </p>
        </div>

        {/* Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              Create Engineering Account
            </CardTitle>
            <CardDescription className="text-xs">
              Sign up with Google or enter your work email to get started.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-2.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs">
                {error}
              </div>
            )}

            {/* Google Signup Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full text-xs font-semibold h-10 border-border bg-background hover:bg-muted/30 shadow-sm flex items-center justify-center space-x-2"
            >
              <GoogleIcon className="h-4 w-4" />
              <span>Sign up with Google</span>
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">Or register with email</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Abdelraheem"
                      className="ps-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Company / Organization</label>
                  <div className="relative">
                    <Building className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Acme Systems Corp"
                      className="ps-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Work Email</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="ps-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="ps-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-1 text-xs text-muted-foreground">
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
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/clean-room-ip-policy" className="text-primary underline">
                    Clean-Room IP Policy
                  </Link>
                  .
                </label>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full text-xs font-bold shadow-sm h-10">
                {isLoading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-center justify-center text-xs text-muted-foreground">
            <span>Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline ms-1 font-bold">
              Sign In
            </Link>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center space-x-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Non-Root Sandbox • Complete IP Ownership</span>
        </div>
      </div>
    </div>
  );
}
