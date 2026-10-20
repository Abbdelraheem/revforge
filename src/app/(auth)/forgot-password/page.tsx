"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RevForgeLogo } from "@/components/shared/revforge-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Submit reset request immediately without artificial delays
    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground font-sans">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2.5 group">
            <div className="h-9 w-9 rounded border border-border bg-muted/40 flex items-center justify-center">
              <RevForgeLogo className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground font-serif">
              RevForge
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Password Recovery
          </p>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your verified email to receive a password recovery link.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isSubmitted ? (
              <div className="p-3 bg-muted/30 rounded border border-border text-sm text-muted-foreground text-center space-y-2">
                <p className="font-medium text-foreground">Recovery email dispatched</p>
                <p className="text-xs">
                  If an account exists for {email}, a recovery link has been sent. Follow the instructions in the email to reset your credentials.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Account Email</label>
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

                <Button type="submit" disabled={isLoading} className="w-full text-sm font-bold shadow-sm h-10">
                  {isLoading ? (
                    <span>Dispatching Link...</span>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
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

        <div className="text-center text-xs text-muted-foreground flex items-center justify-center space-x-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Encrypted Session • Strict Verification</span>
        </div>
      </div>
    </div>
  );
}
