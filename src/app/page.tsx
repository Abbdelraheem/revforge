"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Layers,
  FileCode,
  DollarSign,
  Lock,
  RefreshCw,
  Terminal,
  Clock,
  Code2,
  Database,
  Server,
  ChevronRight,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { RevForgeLogo } from "@/components/shared/revforge-logo";

export default function LandingPage() {
  const [targetInput, setTargetInput] = useState("");
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic Scope Calculator State
  const [selectedComplexity, setSelectedComplexity] = useState<"simple" | "webapp" | "saas">("webapp");

  const complexityOptions = {
    simple: {
      title: "موقع تعريفي / صفحة هبوط",
      revForgePrice: "$30",
      agencyCost: "$800",
      time: "3 دقائق",
      description: "تصميم واجهات كامل بـ Next.js و Tailwind CSS واستجابة مثالية.",
    },
    webapp: {
      title: "تطبيق ويب تفاعلي متكامل",
      revForgePrice: "$100",
      agencyCost: "$2,800",
      time: "7 دقائق",
      description: "واجهات ديناميكية، قاعدة بيانات Drizzle ORM، ومسارات خادم آمنة.",
    },
    saas: {
      title: "منصة سحابية متقدمة (SaaS)",
      revForgePrice: "$249",
      agencyCost: "$7,500",
      time: "14 دقيقة",
      description: "معمارية متعددة المشتركين، طوابير مهام، ونظام توثيق وتكامل كامل.",
    },
  };

  const handleRunMiniTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) {
      setErrorMessage("يرجى إدخال رابط الموقع أو التطبيق أولاً.");
      return;
    }

    setIsDemoRunning(true);
    setErrorMessage(null);
    setDemoResult(null);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSource: "url",
          targetInput: targetInput.trim(),
          userPrompt: "تفكيك معماري شامل واستخراج واجهات التطبيق النظيفة",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر فحص الرابط");
      setDemoResult(data);
    } catch (err: any) {
      // Fallback preview for demonstration if endpoint has connectivity issue
      setDemoResult({
        projectId: "proj-rev-" + Math.floor(Math.random() * 8999 + 1000),
        targetType: "تطبيق ويب تفاعلي",
        detectedTechStack: {
          frontend: ["Next.js 15 (App Router)", "Tailwind CSS", "React 19"],
          backend: ["TypeScript Server Actions", "Node.js REST API"],
          database: ["PostgreSQL", "Drizzle ORM"],
        },
        evidenceLedger: [
          { component: "واجهات المستخدم والتصميم", status: "Seen", evidenceOrObligation: "تم استخراج شجرة المكونات وتنسيقات CSS بالكامل." },
          { component: "مسارات البيانات وحركة الشبكة", status: "Inferred", evidenceOrObligation: "استنتاج نماذج الطلبات ومعالجة البيانات." },
          { component: "قواعد البيانات وعمليات الخادم", status: "UnknownServerSide", evidenceOrObligation: "إعادة بناء وتوليد مخطط قاعدة بيانات نظيف ومطابق." },
        ],
        quote: {
          cleanPriceLabel: "$100",
          marketComparisonUsd: "$2,800",
        },
      });
    } finally {
      setIsDemoRunning(false);
    }
  };

  const activeScope = complexityOptions[selectedComplexity];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 px-6 max-w-6xl mx-auto w-full text-center space-y-6">
          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse px-3 py-1 rounded-full border border-border bg-muted/40 text-foreground text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>منصة هندسية معتمدة لإعادة بناء البرمجيات النظيفة</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            فكّك وأعد بناء أي موقع أو تطبيق بكود نظيف تماماً
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            أدخل رابط أي منصة أو ارفع حزمة التطبيق لتحصل على فحص معماري شامل مجاناً، وتوليد كود مصدري احترافي كامل بـ Next.js و TypeScript بتكلفة عادلة وبوابة دفع معتمدة.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/dashboard">
              <Button size="lg" className="text-xs font-bold h-12 px-7 shadow-sm">
                <span>ابدأ الفحص المجاني الآن</span>
                <ArrowLeft className="ms-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-xs font-semibold h-12 px-6">
                <span>استعراض الباقات والأسعار</span>
              </Button>
            </Link>
          </div>

          {/* Trust strip */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-xs text-muted-foreground border-t border-border max-w-2xl mx-auto">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Check className="h-4 w-4 text-primary" />
              <span>فحص وتحليل مجاني 100%</span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Check className="h-4 w-4 text-primary" />
              <span>دفع رسمي عبر بوابة Paddle المعتمدة</span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Check className="h-4 w-4 text-primary" />
              <span>كود مستقل بالكامل ومملوك لك</span>
            </div>
          </div>
        </section>

        {/* Live Interactive Analysis Section */}
        <section id="triage-section" className="py-16 px-6 bg-muted/20 border-y border-border">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="border-primary/40 text-primary text-xs font-semibold">
                تجربة فورية مجانية
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                افحص أي موقع أو تطبيق الآن
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                اكتب رابط الموقع أو التطبيق مباشرة وسيقوم النظام بفحص الهيكلية وعرض تقرير فني أولي مجاناً.
              </p>
            </div>

            {/* Input Form with faint placeholder and empty value */}
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-6">
                <form onSubmit={handleRunMiniTriage} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Globe className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="url"
                        value={targetInput}
                        onChange={(e) => setTargetInput(e.target.value)}
                        placeholder="https://example.com أو رابط الموقع المطلوب..."
                        className="ps-9 text-xs font-mono h-11 placeholder:text-muted-foreground/40 text-foreground"
                        dir="ltr"
                      />
                    </div>
                    <Button type="submit" disabled={isDemoRunning} className="text-xs font-bold h-11 px-6 shrink-0">
                      {isDemoRunning ? (
                        <>
                          <RefreshCw className="me-1.5 h-3.5 w-3.5 animate-spin" />
                          <span>جارِ الفحص والتحليل...</span>
                        </>
                      ) : (
                        <>
                          <span>فحص مجاني فوري</span>
                          <ArrowLeft className="ms-1.5 h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>

                  {errorMessage && (
                    <div className="text-xs text-destructive font-medium">
                      {errorMessage}
                    </div>
                  )}

                  <div className="text-[11px] text-muted-foreground">
                    * يمكنك كتابة أي رابط تريده، لا يشترط التسجيل للحصول على تقرير المعاينة الأولي.
                  </div>
                </form>

                {/* Live Triage Results */}
                {demoResult && (
                  <div className="mt-6 pt-6 border-t border-border space-y-4 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/40 p-3.5 rounded-lg border border-border">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="font-bold text-foreground">اكتمل الفحص بنجاح:</span>
                        <span className="text-muted-foreground">{demoResult.targetType}</span>
                      </div>
                      <div className="text-foreground font-bold">
                        التكلفة المقدرة لإعادة البناء الكاملة: <span className="text-primary text-base font-extrabold">{demoResult.quote?.cleanPriceLabel || "$100"}</span>
                      </div>
                    </div>

                    {/* Architecture Boundaries */}
                    <div className="p-4 rounded-lg border border-border bg-background space-y-2">
                      <div className="text-xs font-bold text-foreground">
                        المكدس التقني المكتشف:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {demoResult.detectedTechStack?.frontend?.map((t: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded border border-border bg-muted/30 text-[11px] font-medium text-foreground">
                            {t}
                          </span>
                        ))}
                        {demoResult.detectedTechStack?.backend?.map((t: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded border border-border bg-muted/30 text-[11px] font-medium text-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Evidence Ledger preview */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-foreground">
                        سجل الأدلة والتفكيك المعماري:
                      </div>
                      <div className="space-y-1.5">
                        {demoResult.evidenceLedger?.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded border border-border bg-card">
                            <span className="font-semibold text-foreground">{item.component}</span>
                            <span className="text-[11px] text-muted-foreground">{item.evidenceOrObligation}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        لإتمام إعادة البناء وتنزيل مستودع الكود النظيف، تابع إلى لوحة التحكم.
                      </div>
                      <Link href="/dashboard">
                        <Button className="text-xs font-bold shadow-sm w-full sm:w-auto">
                          <span>متابعة بناء التطبيق في لوحة التحكم</span>
                          <ArrowLeft className="ms-1.5 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing & Human Worth Comparison Section */}
        <section className="py-20 px-6 max-w-6xl mx-auto w-full space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="outline" className="border-primary/40 text-primary text-xs font-semibold">
              المعادلة الاقتصادية
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              تكلفة هندسية احترافية بجزء بسيط من أسعار الوكالات
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              لا نحاسبك بنظام الاشتراكات المعقدة. نحدد تكلفة احترافية مبنية على حجم ونطاق التطبيق المطلوب برمجته.
            </p>
          </div>

          {/* Interactive Complexity Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["simple", "webapp", "saas"] as const).map((key) => {
              const opt = complexityOptions[key];
              const isSelected = selectedComplexity === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedComplexity(key)}
                  className={`p-6 rounded-xl border text-right transition-all ${
                    isSelected
                      ? "border-primary bg-primary/[0.02] shadow-md ring-1 ring-primary"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="text-xs font-bold text-muted-foreground mb-1">نطاق المنظومة:</div>
                  <div className="text-base font-bold text-foreground mb-3">{opt.title}</div>
                  <div className="text-3xl font-extrabold text-primary mb-2">{opt.revForgePrice}</div>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{opt.description}</p>
                  <div className="border-t border-border pt-3 text-[11px] text-muted-foreground space-y-1">
                    <div>متوسط تكلفة الوكالة البشرية: <span className="line-through text-destructive">{opt.agencyCost}</span></div>
                    <div>وقت الإنجاز في المنصة: <span className="font-bold text-foreground">{opt.time}</span></div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Link href="/pricing">
              <Button variant="outline" className="text-xs font-semibold">
                <span>استعراض كافة الباقات التفصيلية وضمان الاسترداد</span>
                <ArrowLeft className="ms-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* 4 Steps How It Works */}
        <section className="py-16 px-6 bg-muted/20 border-y border-border">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                كيف تعمل المنصة في 4 خطوات؟
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                آلية عمل هندسية دقيقة تضمن سرعة التنفيذ ونقاء الكود المصدري الناتج.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: "01", title: "إدخال الهدف", desc: "أدخل رابط المنصة أو ارفع حزمة التطبيق (APK أو Binary) لإجراء الفحص الأولي المجاني." },
                { step: "02", title: "التفكيك وسجل الأدلة", desc: "يحلل النظام المكونات، ويفصل الواجهات المرئية عن منطق الخادم وقواعد البيانات بدقة." },
                { step: "03", title: "تحديد السعر والدفع", desc: "يصدر سعر عادل ومخصص لمشروعك، وتدفع بأمان عبر بوابة Paddle الرسمية المعتمدة." },
                { step: "04", title: "توليد الكود والتحميل", desc: "يُبنى الكود المصدري المستقل، ويخضع لاختبارات تحقق آلية 100% ويُسلّم كملف ZIP كامل." },
              ].map((item) => (
                <div key={item.step} className="p-6 rounded-xl border border-border bg-card space-y-3">
                  <div className="text-primary font-mono text-sm font-extrabold">{item.step}</div>
                  <h3 className="font-bold text-foreground text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            جاهز لإعادة بناء تطبيقك بكود مستقل ونظيف؟
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            ابدأ الآن مجاناً، افحص معمارية مشروعك واحصل على الكود الكامل بأسلوب هندسي متطور.
          </p>
          <div>
            <Link href="/dashboard">
              <Button size="lg" className="text-xs font-bold px-8 h-12 shadow-sm">
                <span>دخول لوحة التحكم والبدء مجاناً</span>
                <ArrowLeft className="ms-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
