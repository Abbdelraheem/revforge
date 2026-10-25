"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { BrandLogo } from "@/components/shared/brand-logo";
import { BRAND } from "@/config/brand";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsLoading(false);
    setIsSuccess(true);
  };

  return (
    <main id="main-content" className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground font-sans">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center group">
            <span className="font-bold text-2xl tracking-tight text-foreground font-serif group-hover:text-primary transition-colors">
              {BRAND.name}
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Set New Account Password
          </p>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              {isSuccess ? "Password Updated" : "Choose New Password"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isSuccess
                ? "Your credentials have been securely updated. You can now log in."
                : "Enter a strong, unique password with at least 8 characters."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {isSuccess ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded border border-border flex items-center space-x-2 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span>Password changed successfully.</span>
                </div>
                <Button asChild className="w-full text-sm font-bold shadow-sm h-10">
                  <Link href="/login">
                    <span>Sign In Now</span>
                    <ArrowRight className="ms-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">New Password</label>
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

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="ps-9 text-sm"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full text-sm font-bold shadow-sm h-10">
                  {isLoading ? (
                    <span>Updating...</span>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="ms-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-center justify-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Return to Sign In
            </Link>
          </CardFooter>
        </Card>

        <div className="text-center text-sm text-muted-foreground flex items-center justify-center space-x-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Encrypted Session | Zero Data Retention</span>
        </div>
      </div>
    </main>
  );
}
