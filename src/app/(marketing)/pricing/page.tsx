"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/shared/marketing-header";
import { MarketingFooter } from "@/components/shared/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ShieldCheck, Zap, Layers, RefreshCw } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "فحص وتحليل مجاني",
    badge: "متاحة دائماً",
    price: "$0",
    period: "مجاناً لكل مشروع",
    description: "فحص وتفكيك معماري شامل لأي موقع أو تطبيق قبل اتخاذ أي قرار شراء.",
    features: [
      "فحص غير محدود لكافة الروابط والحزم البرمجية",
      "استخراج حدود المعمارية والمكدس التقني",
      "سجل الأدلة والتصنيف الهندسي",
      "تقرير فني مفصل ومواصفات النظام",
      "تقدير دقيق للتكلفة والجدول الزمني",
    ],
    cta: "ابدأ الفحص المجاني الآن",
    href: "/dashboard",
    popular: false,
  },
  {
    id: "starter",
    name: "باقة المواقع البسيطة",
    badge: "الأكثر طلباً للأعمال",
    price: "$30",
    period: "باقة 3 مواقع",
    description: "إعادة بناء وتوليد كود نظيف لـ 3 مواقع بسيطة أو صفحات هبوط واجهات متكاملة.",
    features: [
      "إعادة بناء 3 مواقع تعريفية أو بورتفوليو",
      "كود مصدر كامل Next.js و Tailwind CSS",
      "تصميم متجاوب ومتوافق مع محركات البحث",
      "تجهيز نماذج الاتصال والروابط",
      "تحميل الكود المصدري كاملاً بنقرة واحدة",
      "ضمان اجتياز الاختبارات 100%",
    ],
    cta: "شراء الباقة ($30)",
    href: "/dashboard?plan=starter",
    popular: true,
  },
  {
    id: "pro",
    name: "باقة تطبيقات الويب",
    badge: "للتطبيقات التفاعلية",
    price: "$100",
    period: "تطبيق ويب متكامل",
    description: "بناء وإعادة هندسة تطبيق ويب ديناميكي متكامل مع قواعد البيانات وواجهات البرمجة.",
    features: [
      "إعادة بناء تطبيق ويب تفاعلي كامل",
      "مخطط قاعدة بيانات علائقية Drizzle ORM",
      "واجهات برمجية خادمة TypeScript بالكامل",
      "نظام مصادقة وإدارة صلاحيات المستخدمين",
      "حزمة اختبارات تحقق آلية مضمونة 100%",
      "دعم بيئة النشر السحابي بنقرة زر",
    ],
    cta: "شراء الباقة ($100)",
    href: "/dashboard?plan=pro",
    popular: false,
  },
  {
    id: "enterprise",
    name: "باقة المنصات المتكاملة",
    badge: "للأنظمة الضخمة",
    price: "$249",
    period: "منصة SaaS متكاملة",
    description: "للأنظمة متعددة الخدمات، تطبيقات الهواتف والمنصات السحابية المعقدة.",
    features: [
      "إعادة بناء منصة SaaS متعددة المشتركين",
      "معمارية سحابية وطوابير معالجة خلفية",
      "أولوية قصوى على حاويات البناء المعزولة",
      "تحليل وتفكيك حزم الموبايل (APK / Native)",
      "توثيق معماري ومخططات التدفق كاملة",
      "دعم هندسي مباشر عبر الهاتف والمحادثة",
    ],
    cta: "شراء الباقة ($249)",
    href: "/dashboard?plan=enterprise",
    popular: false,
  },
];

export default function PricingPage() {
  const [selectedProjectRange, setSelectedProjectRange] = useState(1);

  // Pay-as-you-go pricing scale based on application scope
  const paygPrices = [
    { label: "صفحة هبوط / موقع تعريفي بسيط", price: "$49", turnaround: "3 دقائق", humanCost: "$800" },
    { label: "تطبيق ويب تفاعلي (لوحة تحكم / بوابات)", price: "$149", turnaround: "8 دقائق", humanCost: "$2,500" },
    { label: "منصة سحابية متكاملة / تطبيق هاتف", price: "$349", turnaround: "15 دقيقة", humanCost: "$7,000" },
  ];

  const currentPayg = paygPrices[selectedProjectRange]!;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1 py-16 px-6 max-w-7xl mx-auto w-full space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="border-primary/40 text-primary text-xs font-semibold">
            تسعير عادل وشفاف
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            باقات مدروسة مع فحص تحليلي مجاني دائماً
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            افحص وحلل أي موقع أو تطبيق بالكامل مجاناً، ثم اختر إما الباقات الاقتصادية المجمعة أو الدفع حسب الطلب لكل مشروع بشكل منفصل.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`flex flex-col justify-between border transition-all ${
                plan.popular
                  ? "border-primary shadow-md ring-1 ring-primary bg-primary/[0.02]"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <Badge
                      variant={plan.popular ? "default" : "outline"}
                      className="text-[10px] font-semibold"
                    >
                      {plan.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-xs min-h-[36px] leading-relaxed">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="border-y border-border py-4">
                    <div className="flex items-baseline space-x-1 rtl:space-x-reverse">
                      <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                      <span className="text-xs text-muted-foreground font-medium">/ {plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start space-x-2 rtl:space-x-reverse">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <CardFooter className="pt-4 border-t border-border">
                <Link href={plan.href} className="w-full">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full text-xs font-semibold shadow-sm"
                  >
                    <span>{plan.cta}</span>
                    <ArrowLeft className="ms-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Pay As You Go Section */}
        <section className="p-8 rounded-xl border border-border bg-muted/20 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="inline-flex items-center space-x-2 rtl:space-x-reverse px-2.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold mb-1">
                <span>خيار الدفع عند العمل (Pay As You Go)</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                لا ترغب بالاشتراك في باقة؟ ادفع لكل مشروع بشكل مستقل
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                المنصة تفحص مشروعك مجاناً، وتولد لك سعراً مخصصاً بدقة لمشروعك وتفتح لك بوابة دفع Paddle مستقلة ومباشرة.
              </p>
            </div>
          </div>

          {/* Interactive Calculator by Scope */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paygPrices.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedProjectRange(idx)}
                className={`p-5 rounded-lg border text-right transition ${
                  selectedProjectRange === idx
                    ? "border-primary bg-background shadow-sm ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <div className="text-xs font-bold text-muted-foreground mb-1">نطاق العمل:</div>
                <div className="text-sm font-bold text-foreground mb-3">{item.label}</div>
                <div className="text-2xl font-extrabold text-primary mb-1">{item.price}</div>
                <div className="text-[11px] text-muted-foreground">
                  وقت التنفيذ: {item.turnaround} • تكلفة الوكالة البشرية: <span className="line-through">{item.humanCost}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              * سعر المشروع الفردي أعلى قليلاً من سعر الباقة المجمعة لتشجيع توفير الباقات.
            </div>
            <Link href="/dashboard">
              <Button className="text-xs font-semibold">
                <span>افحص مشروعك واحصل على سعرك الخاص</span>
                <ArrowLeft className="ms-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Guarantee Banner */}
        <div className="p-6 rounded-lg border border-border bg-background flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-bold text-foreground text-sm">ضمان استرداد المبلغ 100%</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                إذا لم يجتز الكود المولد اختبارات التشغيل والتحقق بنجاح كامل، يتم استرداد أموالك تلقائياً عبر بوابة Paddle المعتمدة.
              </div>
            </div>
          </div>
          <Link href="/contact" className="shrink-0">
            <Button variant="outline" size="sm" className="text-xs">
              تحدث مع المبيعات
            </Button>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

