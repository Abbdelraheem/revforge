import React from "react";
import Link from "next/link";
import { RevForgeLogo } from "@/components/shared/revforge-logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/20 text-xs">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand Col */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="h-7 w-7 rounded border border-border bg-background flex items-center justify-center">
              <RevForgeLogo className="h-4 w-4" />
            </div>
            <span className="font-bold text-foreground text-sm">RevForge</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-sm">
            منصة هندسية مستقلة متخصصة في تحليل وتفكيك معماريات البرمجيات، استخراج واجهات النظم، وتوليد الشيفرات البرمجية النظيفة المتوافقة مع أعلى معايير الجودة والأمان.
          </p>
          <div className="text-[11px] text-muted-foreground">
            بيئات فحص معزولة • حماية كاملة للملكية الفكرية
          </div>
        </div>

        {/* Product Col */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">المنتج والخدمات</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/how-it-works" className="hover:text-foreground transition">
                خطوات العمل
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground transition">
                الباقات والتسعير
              </Link>
            </li>
            <li>
              <Link href="/use-cases" className="hover:text-foreground transition">
                حالات الاستخدام
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-foreground transition">
                لوحة الفحص
              </Link>
            </li>
          </ul>
        </div>

        {/* Security & Docs */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">الهندسة والأمان</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/security" className="hover:text-foreground transition">
                معايير الأمان
              </Link>
            </li>
            <li>
              <Link href="/docs" className="hover:text-foreground transition">
                التوثيق الفني
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-foreground transition">
                الأسئلة الشائعة
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-foreground transition">
                الدعم الفني
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Governance */}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">القوانين والحوكمة</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/terms" className="hover:text-foreground transition">
                شروط الخدمة
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-foreground transition">
                سياسة الخصوصية
              </Link>
            </li>
            <li>
              <Link href="/clean-room-ip-policy" className="hover:text-foreground transition">
                الملكية الفكرية
              </Link>
            </li>
            <li>
              <Link href="/acceptable-use" className="hover:text-foreground transition">
                الاستخدام العادل
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground">
        <div>جميع الحقوق محفوظة © 2026 RevForge Inc.</div>
        <div className="flex items-center space-x-4 rtl:space-x-reverse mt-2 sm:mt-0">
          <span>بوابة الدفع: Paddle الرسمية المعتمدة</span>
          <span>•</span>
          <span>حالة النظام: تشغيل كامل 100%</span>
        </div>
      </div>
    </footer>
  );
}
