"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { BrandLogo } from "@/components/shared/brand-logo";
import { GoogleIcon } from "@/components/shared/google-icon";
import { loginAction } from "@/server/actions/auth";
import { BRAND } from "@/config/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      const res = await loginAction(formData);
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err?.message?.includes("NEXT_REDIRECT")) {
        return;
      }
      setError(err.message || "Failed to authenticate session.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground font-sans">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2.5 group">
            <div className="h-9 w-9 rounded border border-border bg-muted/40 flex items-center justify-center">
              <BrandLogo className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground font-serif">
              {BRAND.name}
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Sign in to access your projects and analysis reports
          </p>
        </div>

        {/* Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              Sign In
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your credentials to continue.
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
              onClick={() => setError("Google OAuth requires GOOGLE_CLIENT_ID configuration. Please sign in with email and password.")}
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
                <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Work Email</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@company.com"
                    className="ps-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Password</label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
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

              <Button type="submit" disabled={isLoading} className="w-full text-sm font-bold shadow-sm h-10">
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="ms-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-center justify-center text-sm text-muted-foreground">
            <span>Don&apos;t have an account? </span>
            <Link href="/register" className="text-primary hover:underline ms-1 font-semibold">
              Create an account
            </Link>
          </CardFooter>
        </Card>

        {/* Security notice */}
        <div className="text-center text-sm text-muted-foreground flex items-center justify-center space-x-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Encrypted Session • Strict Access Controls</span>
        </div>
      </div>
    </div>
  );
}
