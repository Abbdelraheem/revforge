"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Mail, User, Building, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { BrandLogo } from "@/components/shared/brand-logo";
import { GoogleIcon } from "@/components/shared/google-icon";
import { registerAction } from "@/server/actions/auth";
import { BRAND } from "@/config/brand";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError("You must explicitly review and agree to the Terms of Service and Clean-Room IP Policy.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("name", name);
      formData.set("organization", organization);
      const res = await registerAction(formData);
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err?.message?.includes("NEXT_REDIRECT")) {
        return;
      }
      setError(err.message || "Failed to create account.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center group">
            <span className="font-bold text-2xl tracking-tight text-foreground font-serif group-hover:text-primary transition-colors">
              {BRAND.name}
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Create an account for architectural analysis and clean-room reconstruction
          </p>
        </div>

        {/* Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              Create Engineering Account
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your professional credentials to get started.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setError("Google OAuth requires GOOGLE_CLIENT_ID configuration. Please register with email.")}
              className="w-full text-sm font-semibold h-10 border-border bg-background hover:bg-muted/30 shadow-sm flex items-center justify-center space-x-2"
            >
              <GoogleIcon className="h-4 w-4" />
              <span>Continue with Google</span>
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">Or register with email</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Developer"
                      className="ps-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Organization</label>
                  <div className="relative">
                    <Building className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Acme Engineering"
                      className="ps-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Work Email</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="ps-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="ps-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-1 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 rounded border-border"
                />
                <label htmlFor="agreeTerms" className="leading-tight text-sm">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary underline font-medium">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/clean-room-ip-policy" className="text-primary underline font-medium">
                    Clean-Room IP Policy
                  </Link>
                  .
                </label>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full text-sm font-bold shadow-sm h-10">
                {isLoading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="ms-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-center justify-center text-sm text-muted-foreground">
            <span>Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline ms-1 font-semibold">
              Sign In
            </Link>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <div className="text-center text-sm text-muted-foreground flex items-center justify-center space-x-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Non-Root Sandbox • Clean-Room Separation</span>
        </div>
      </div>
    </div>
  );
}
