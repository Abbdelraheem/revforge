"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

function FakeCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const txnId = searchParams.get("txnId") || "";
  const amountCents = parseInt(searchParams.get("amount") || "0", 10);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Dev-only check
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-bold text-destructive">404 - Not Found</h1>
          <p className="text-sm text-muted-foreground">This test double is strictly disabled in production environments.</p>
        </div>
      </div>
    );
  }

  const handleSimulatePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const webhookPayload = {
        event_id: `evt_dev_${Date.now()}`,
        event_type: "transaction.completed",
        data: {
          id: txnId,
          custom_data: { orderId },
          currency_code: "USD",
          details: {
            totals: {
              subtotal: amountCents,
              total: amountCents,
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const secret = "dev_fake_webhook_secret_key";

      // Client-side web crypto HMAC for dev test
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuf = await window.crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(rawBody));
      const signatureHex = Array.from(new Uint8Array(signatureBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const res = await fetch("/api/webhooks/paddle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fake-signature": signatureHex,
        },
        body: rawBody,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process test payment webhook");
      }

      setIsSuccess(true);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to execute simulated checkout.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="border-amber-500/40 text-amber-600 font-mono text-sm">
            DEV TEST DOUBLE &bull; NOT FOR PRODUCTION
          </Badge>
          <h1 className="text-2xl font-bold font-serif">Simulated Merchant Checkout</h1>
          <p className="text-sm text-muted-foreground">
            Test environment payment simulator posting an HMAC-SHA256 signed webhook
          </p>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold text-foreground">Order Summary</CardTitle>
            <CardDescription className="text-sm font-mono">Order ID: {orderId || "N/A"}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 font-mono text-sm">
            <div className="p-3 rounded border border-border bg-muted/20 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-bold text-foreground truncate max-w-[200px]">{txnId || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-bold text-foreground">USD</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground font-bold">Total Amount:</span>
                <span className="font-extrabold text-primary text-sm">${(amountCents / 100).toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded border border-destructive/40 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {isSuccess && (
              <div className="p-3 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-sm flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Signed webhook verified and accepted. Redirecting...</span>
              </div>
            )}

            <Button
              onClick={handleSimulatePayment}
              disabled={isLoading || isSuccess}
              className="w-full text-sm font-bold shadow-sm h-10"
            >
              {isLoading ? (
                <span>Signing & Submitting Webhook...</span>
              ) : isSuccess ? (
                <span>Payment Verified!</span>
              ) : (
                <>
                  <span>Simulate Successful Payment</span>
                  <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-center justify-center text-sm text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary me-1" />
            <span>Strict HMAC-SHA256 signature verification enforced</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function FakeCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 text-sm font-mono">Loading checkout session...</div>}>
      <FakeCheckoutContent />
    </Suspense>
  );
}
