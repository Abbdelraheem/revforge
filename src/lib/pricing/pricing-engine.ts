export type ComplexityTier =
  | "portfolio"
  | "web_app"
  | "mobile_app"
  | "desktop_binary"
  | "enterprise_saas";

export interface ComplexityTierConfig {
  label: string;
  labelAr: string;
  baseCogsUsd: number; // Internal technical cost (LLM tokens + sandbox compute + storage)
  estimatedSandboxSeconds: number;
  estimatedTokensK: number;
  descriptionAr: string;
  descriptionEn: string;
}

export const TIER_CONFIGS: Record<ComplexityTier, ComplexityTierConfig> = {
  portfolio: {
    label: "Landing Page / Showcase",
    labelAr: "صفحة هبوط / موقع تعريفي وتسويقي",
    baseCogsUsd: 2.90, // Real technical cost to us (~$2.90)
    estimatedSandboxSeconds: 60,
    estimatedTokensK: 45,
    descriptionAr: "فك الشفرة البصرية، استخراج الخطوط والألوان، وبناء كود واجهة تفاعلية متجاوبة.",
    descriptionEn: "Visual token extraction, design system capture, responsive Next.js/Tailwind rebuild.",
  },
  web_app: {
    label: "Interactive Web Application",
    labelAr: "تطبيق ويب تفاعلي ولوحة تحكم",
    baseCogsUsd: 4.90, // Real technical cost to us (~$4.90)
    estimatedSandboxSeconds: 150,
    estimatedTokensK: 85,
    descriptionAr: "اكتشاف مسارات الواجهة، بناء إدارة الحالة، وتوليد واجهات برمجة التطبيقات (API).",
    descriptionEn: "Route discovery, state graph synthesis, full TypeScript API client contracts.",
  },
  mobile_app: {
    label: "Mobile Package (.APK / .IPA)",
    labelAr: "تطبيق هاتف محمول أصلي أو هجين",
    baseCogsUsd: 14.50, // Real technical cost to us (~$14.50)
    estimatedSandboxSeconds: 300,
    estimatedTokensK: 160,
    descriptionAr: "فك حزم أندرويد عبر JADX، استخراج الأصول، وإعادة كتابة التطبيق كـ React Native نظيف.",
    descriptionEn: "Headless JADX bytecode disassembly, asset carving, clean React Native reconstruction.",
  },
  desktop_binary: {
    label: "Native Desktop / Electron Binary",
    labelAr: "تطبيق مكتبي أصلي (PE / ELF / ASAR)",
    baseCogsUsd: 24.50, // Real technical cost to us (~$24.50)
    estimatedSandboxSeconds: 420,
    estimatedTokensK: 240,
    descriptionAr: "فك حزم ASAR والملفات التنفيذية عبر Ghidra، تحليل بروتوكول IPC، وإعادة البناء.",
    descriptionEn: "ASAR / Ghidra headless deconstruction, IPC bus map, isolated cross-platform build.",
  },
  enterprise_saas: {
    label: "Full Multi-Module SaaS Ecosystem",
    labelAr: "منصة سحابية متكاملة متعددة الوحدات",
    baseCogsUsd: 49.50, // Real technical cost to us (~$49.50)
    estimatedSandboxSeconds: 600,
    estimatedTokensK: 450,
    descriptionAr: "هندسة عكسية للأنظمة المتعددة، قواعد البيانات، الاشتراكات، وطوابير المهام الخلفية.",
    descriptionEn: "Multi-tenant architecture synthesis, DB schemas, billing logic, and background queues.",
  },
};

export interface ReconstructionMilestone {
  stepNumber: number;
  titleAr: string;
  titleEn: string;
  deliverableAr: string;
  deliverableEn: string;
  estimatedMinutes: number;
}

export interface DynamicProjectQuote {
  projectId: string;
  complexityTier: ComplexityTier;
  technicalCogsUsd: number; // Exact internal cost
  targetPriceUsd: number; // Customer price enforcing 90% margin
  profitMarginPercent: number; // 90%
  netProfitUsd: number;
  milestones: ReconstructionMilestone[];
  cleanPriceLabel: string;
}

/**
 * Rounds raw customer amounts into psychological, clean numbers (e.g. 29, 49, 99, 149, 249, 499).
 * Eliminates messy random decimal numbers like 47.382 or 214.19.
 */
export function roundToCleanPrice(rawAmount: number): number {
  if (rawAmount <= 35) return 29;
  if (rawAmount <= 65) return 49;
  if (rawAmount <= 110) return 99;
  if (rawAmount <= 170) return 149;
  if (rawAmount <= 260) return 249;
  if (rawAmount <= 380) return 349;
  if (rawAmount <= 580) return 499;
  if (rawAmount <= 850) return 749;
  return Math.round(rawAmount / 50) * 50; // Round to nearest 50 for very large enterprise rebuilds
}

/**
 * Generates the 5 standard milestones for reverse engineering and clean-room synthesis.
 */
export function getReconstructionMilestones(tier: ComplexityTier): ReconstructionMilestone[] {
  return [
    {
      stepNumber: 1,
      titleAr: "تفكيك الواجهة ونظام التصميم (UI Design & Component Extraction)",
      titleEn: "UI Design & Component Extraction",
      deliverableAr: "استخراج الألوان، الخطوط، الأيقونات، وشجرة المكونات المتجاوبة بالكامل.",
      deliverableEn: "Full responsive component hierarchy, typography, colors, and layout tokens.",
      estimatedMinutes: tier === "portfolio" ? 1 : tier === "web_app" ? 2 : 4,
    },
    {
      stepNumber: 2,
      titleAr: "هندسة الواجهات وقواعد البيانات (API & Database Contracts)",
      titleEn: "API & Database Schema Synthesis",
      deliverableAr: "اكتشاف نقاط الاتصال، هياكل البيانات (Schemas)، وتوثيق عقود TypeScript.",
      deliverableEn: "REST/GraphQL endpoints discovery, relational Drizzle/Prisma schema, typed contracts.",
      estimatedMinutes: tier === "portfolio" ? 1 : tier === "web_app" ? 3 : 6,
    },
    {
      stepNumber: 3,
      titleAr: "إعادة بناء منطق الأعمال النظيف (Clean-Room Business Engine)",
      titleEn: "Clean-Room Business Engine Synthesis",
      deliverableAr: "توليد كود الخادم النظيف بالذكاء الاصطناعي بنسبة 100% بدون أي كود مقيد بحقوق ملكية.",
      deliverableEn: "Synthesize 100% original, copyright-clean server logic in isolated gVisor sandbox.",
      estimatedMinutes: tier === "portfolio" ? 1 : tier === "web_app" ? 4 : 8,
    },
    {
      stepNumber: 4,
      titleAr: "الفحص الأمني والتحقق الآلي (Automated Tests & Zero-CVE Verification)",
      titleEn: "Automated Verification & Security Check",
      deliverableAr: "تشغيل اختبارات الوحدة، والتأكد من خلو الكود من أي ثغرات برمجية.",
      deliverableEn: "Automated unit tests, static type checking, and zero-CVE dependency vulnerability scan.",
      estimatedMinutes: 2,
    },
    {
      stepNumber: 5,
      titleAr: "تجميع المستودع والجاهزية للنشر (Repository Packaging & Deployment Ready)",
      titleEn: "Repository Packaging & Instant Deploy",
      deliverableAr: "تجهيز حزمة المستودع كاملة بصيغة .ZIP مع إعدادات التشغيل والنشر السحابي.",
      deliverableEn: "Production-ready repository ZIP bundle with Dockerfile and one-click cloud configs.",
      estimatedMinutes: 1,
    },
  ];
}

/**
 * Calculates the exact dynamic price for a project enforcing a 90% profit margin.
 * Formula:
 * TargetPrice = TechnicalCOGS / (1 - 0.90) = TechnicalCOGS * 10
 * Then cleanly rounded to standard pricing figures (e.g. $49, $149, $499).
 */
export function calculateDynamicProjectQuote(
  projectId: string,
  tier: ComplexityTier,
  customModifiers: {
    complexityScore?: number; // 0.8 to 2.0 based on file size or URL page depth
  } = {}
): DynamicProjectQuote {
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.web_app;
  const modifier = customModifiers.complexityScore || 1.0;

  // Real technical cost of goods sold (COGS)
  const technicalCogsUsd = Math.round(config.baseCogsUsd * modifier * 100) / 100;

  // 90% Margin multiplier (10x)
  const rawTargetPriceUsd = technicalCogsUsd / (1 - 0.90);

  // Clean psychological rounding ($29, $49, $99, $149, $249, $499)
  const targetPriceUsd = roundToCleanPrice(rawTargetPriceUsd);

  const netProfitUsd = targetPriceUsd - technicalCogsUsd;
  const profitMarginPercent = Math.round((netProfitUsd / targetPriceUsd) * 100);

  const milestones = getReconstructionMilestones(tier);

  return {
    projectId,
    complexityTier: tier,
    technicalCogsUsd,
    targetPriceUsd,
    profitMarginPercent,
    netProfitUsd,
    milestones,
    cleanPriceLabel: `$${targetPriceUsd}`,
  };
}
