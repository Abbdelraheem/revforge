import React from "react";
import Link from "next/link";
import { MailCheck, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RevForgeLogo } from "@/components/shared/revforge-logo";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token, email } = await searchParams;
  const isVerified = Boolean(token);

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
            Account Email Verification
          </p>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MailCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold text-foreground">
              {isVerified ? "Email Confirmed" : "Verify Your Email"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isVerified
                ? "Your email has been successfully verified. You now have full access to your workspace."
                : `We sent a confirmation link to ${email || "your registered email"}. Please click the link to verify your account.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isVerified ? (
              <Button asChild className="w-full text-sm font-bold shadow-sm h-10">
                <Link href="/dashboard">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="ms-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div className="p-3 bg-muted/30 rounded border border-border text-xs text-muted-foreground text-center">
                Check your spam folder if you do not see the confirmation email within 2 minutes.
              </div>
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
          <span>Security & Identity Verification</span>
        </div>
      </div>
    </div>
  );
}
