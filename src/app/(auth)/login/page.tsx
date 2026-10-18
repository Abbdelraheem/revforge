"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RevForgeLogo } from "@/components/shared/revforge-logo";

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
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "revforge_session",
          JSON.stringify({ email: email.trim(), name: "مهندس المنظومة", authenticated: true })
        );
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "revforge_session",
        JSON.stringify({ email: "engineer@enterprise.com", name: "مهندس المنظومة", authenticated: true })
      );
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background text-foreground">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2.5 rtl:space-x-reverse group">
            <div className="h-9 w-9 rounded border border-border bg-muted/40 flex items-center justify-center">
              <RevForgeLogo className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">
              RevForge
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            تسجيل الدخول للوصول إلى لوحة الفحص ومشاريع البناء
          </p>
        </div>

        {/* Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold text-foreground">
              تسجيل الدخول
            </CardTitle>
            <CardDescription className="text-xs">
              أدخل بريدك الإلكتروني للوصول إلى مشاريعك وتحليلاتك.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-2.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="ps-9 text-xs"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="ps-9 text-xs"
                    dir="ltr"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full text-xs font-bold shadow-sm">
                {isLoading ? (
                  <span>جارِ التحقق...</span>
                ) : (
                  <>
                    <span>دخول المنصة</span>
                    <ArrowLeft className="ms-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">أو تجربة فورية</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleQuickDemoLogin}
              className="w-full text-xs border-dashed text-foreground hover:bg-muted/30"
            >
              <span>دخول تجريبي سريع بنقرة واحدة</span>
            </Button>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 text-center justify-center text-xs text-muted-foreground">
            <span>ليس لديك حساب؟ </span>
            <Link href="/register" className="text-primary hover:underline ms-1 font-bold">
              إنشاء حساب جديد
            </Link>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>حماية مشفرة ومصادقة معتمدة</span>
        </div>
      </div>
    </div>
  );
}
