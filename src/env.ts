import { z } from "zod";

const isBuilding = process.env.NEXT_PHASE === "phase-production-build";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    SYSTEM_DATABASE_URL: z.string().min(1).optional(),
    COST_CAP_RATIO: z.coerce.number().default(0.6),
    MIN_BUILD_MARGIN_PCT: z.coerce.number().default(25),
    MARGIN_ALERT_PCT: z.coerce.number().default(20),
    PAYMENT_FEE_PERCENT: z.coerce.number().default(5),
    PAYMENT_FEE_FIXED_CENTS: z.coerce.number().default(50),

    // Email & Notifications
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("RevForge <notifications@revforge.ai>"),
    SUPERADMIN_EMAIL: z.string().email().default("admin@revforge.ai"),

    // Studio Configuration
    STUDIO_TOKEN_CENTS: z.coerce.number().default(1),
    STUDIO_INCLUDED_RATIO: z.coerce.number().default(0.15),
    STUDIO_MARKUP: z.coerce.number().default(3.0),
    STUDIO_MIN_CHARGE_CENTS: z.coerce.number().default(50),
    STUDIO_DAILY_EDIT_LIMIT: z.coerce.number().default(20),

    // LLM Configuration
    ANTHROPIC_API_KEY: z.string().optional(),
    NVIDIA_API_KEY: z.string().optional(),
    NVIDIA_BASE_URL: z.string().default("https://integrate.api.nvidia.com/v1"),
    LLM_MODEL_FAST: z.string().default("claude-3-5-haiku-latest"),
    LLM_MODEL_STANDARD: z.string().default("claude-3-5-sonnet-latest"),
    LLM_MODEL_PREMIUM: z.string().default("claude-3-7-sonnet-latest"),
    LLM_PROVIDER: z.enum(["anthropic", "nvidia", "fixture"]).default("fixture"),

    // Payment Provider Configuration
    PAYMENT_PROVIDER: z.enum(["paddle", "fake"]).default("fake"),
    PADDLE_API_KEY: z.string().optional(),
    PADDLE_WEBHOOK_SECRET_KEY: z.string().optional(),
    PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
    FAKE_WEBHOOK_SECRET: z.string().optional(),

    // Redis & Queues
    REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

    // Storage
    STORAGE_ENDPOINT: z.string().default("http://127.0.0.1:9000"),
    STORAGE_REGION: z.string().default("us-east-1"),
    STORAGE_ACCESS_KEY: z.string().default("minioadmin"),
    STORAGE_SECRET_KEY: z.string().default("minioadmin"),
    STORAGE_BUCKET_UPLOADS: z.string().default("uploads"),
    STORAGE_BUCKET_EVIDENCE: z.string().default("evidence-raw"),
    STORAGE_BUCKET_SPECS: z.string().default("specs"),
    STORAGE_BUCKET_DELIVERIES: z.string().default("deliveries"),

    // Security & Crypto: NO DEFAULTS for secrets
    DATA_KEY: z.string().min(32).optional(),
    NEXTAUTH_SECRET: z.string().min(32).optional(),
    AUTH_SECRET: z.string().min(16).optional(),
    NEXTAUTH_URL: z.string().default("http://localhost:3000"),

    // Sandbox runtime
    SANDBOX_RUNTIME: z.enum(["runsc", "runc"]).default("runc"),
    ALLOW_RUNC: z.string().transform((v) => v === "true" || v === "1").optional(),
    BUILD_AGENT_CONCURRENCY: z.coerce.number().default(6),
    WORKER_IDLE_SHUTDOWN_MIN: z.coerce.number().default(30),

    // Live preview
    PREVIEW_ORIGIN: z.string().url().default("http://localhost:4100"),
    PREVIEW_PORT_BASE: z.coerce.number().default(4100),
    PREVIEW_MAX_CONCURRENT: z.coerce.number().default(2),
    PREVIEW_IDLE_TTL_MIN: z.coerce.number().default(10),
    PREVIEW_HARD_TTL_MIN: z.coerce.number().default(60),
    PREVIEW_REQUEST_TIMEOUT_MS: z.coerce.number().default(15_000),
    PREVIEW_MAX_RESPONSE_BYTES: z.coerce.number().default(5_000_000),
    PREVIEW_TUNNEL_SECRET: z.string().min(16).optional(),
    WORKER_TUNNEL_URL: z.string().url().default("http://127.0.0.1:3001"),

    // Delivery
    DELIVERY_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
    ENABLE_GITHUB_PUSH: z
      .string()
      .transform((value) => value === "true" || value === "1")
      .default("false"),
    GITHUB_TOKEN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Skip strict production validation during build phase
    if (isBuilding) return;

    if (data.NODE_ENV === "production") {
      if (data.PAYMENT_PROVIDER === "fake") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "production refuses PAYMENT_PROVIDER=fake",
          path: ["PAYMENT_PROVIDER"],
        });
      }
      if (data.LLM_PROVIDER === "fixture") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "production refuses LLM_PROVIDER=fixture",
          path: ["LLM_PROVIDER"],
        });
      }
      if (!data.DATA_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "DATA_KEY is required in production",
          path: ["DATA_KEY"],
        });
      }
      if (!data.NEXTAUTH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "NEXTAUTH_SECRET is required in production",
          path: ["NEXTAUTH_SECRET"],
        });
      }
      if (data.SANDBOX_RUNTIME === "runc" && !data.ALLOW_RUNC) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SANDBOX_RUNTIME must be runsc in production unless ALLOW_RUNC is true",
          path: ["SANDBOX_RUNTIME"],
        });
      }
    }
  });

function parseEnv() {
  if (typeof window !== "undefined") {
    return {} as z.infer<typeof envSchema>;
  }

  // If during build phase, provide build defaults if missing so next build succeeds with zero env
  if (isBuilding) {
    return {
      NODE_ENV: "production",
      APP_URL: "http://localhost:3000",
      DATABASE_URL: process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy",
      LLM_MODEL_FAST: "claude-haiku-5-5",
      LLM_MODEL_STANDARD: "claude-sonnet-5-5",
      LLM_MODEL_PREMIUM: "claude-opus-5-5",
      LLM_PROVIDER: "fixture",
      PAYMENT_PROVIDER: "paddle",
      PADDLE_ENVIRONMENT: "sandbox",
      REDIS_URL: "redis://localhost:6379",
      STORAGE_ENDPOINT: "http://localhost:9000",
      STORAGE_REGION: "us-east-1",
      STORAGE_ACCESS_KEY: "dummy",
      STORAGE_SECRET_KEY: "dummy",
      STORAGE_BUCKET_UPLOADS: "uploads",
      STORAGE_BUCKET_EVIDENCE: "evidence-raw",
      STORAGE_BUCKET_SPECS: "specs",
      STORAGE_BUCKET_DELIVERIES: "deliveries",
      NEXTAUTH_URL: "http://localhost:3000",
      SANDBOX_RUNTIME: "runc",
      BUILD_AGENT_CONCURRENCY: 6,
      WORKER_IDLE_SHUTDOWN_MIN: 30,
      COST_CAP_RATIO: 0.6,
      MIN_BUILD_MARGIN_PCT: 25,
      MARGIN_ALERT_PCT: 20,
      PAYMENT_FEE_PERCENT: 5,
      PAYMENT_FEE_FIXED_CENTS: 50,
      PREVIEW_ORIGIN: "http://localhost:4100",
      PREVIEW_PORT_BASE: 4100,
      PREVIEW_MAX_CONCURRENT: 2,
      PREVIEW_IDLE_TTL_MIN: 10,
      PREVIEW_HARD_TTL_MIN: 60,
      PREVIEW_REQUEST_TIMEOUT_MS: 15000,
      PREVIEW_MAX_RESPONSE_BYTES: 5000000,
      WORKER_TUNNEL_URL: "http://127.0.0.1:3001",
      DELIVERY_RETENTION_DAYS: 90,
      ENABLE_GITHUB_PUSH: false,
    } as any;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ CRITICAL: Invalid environment variables at boot:", result.error.format());
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Invalid environment variables in production: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
    }
  }

  return (result.success
    ? result.data
    : {
        NODE_ENV: "development",
        APP_URL: "http://localhost:3000",
        DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres:postgrespassword@localhost:5432/revforge",
        LLM_MODEL_FAST: "claude-haiku-5-5",
        LLM_MODEL_STANDARD: "claude-sonnet-5-5",
        LLM_MODEL_PREMIUM: "claude-opus-5-5",
        LLM_PROVIDER: "fixture",
        PAYMENT_PROVIDER: "fake",
        PADDLE_ENVIRONMENT: "sandbox",
        REDIS_URL: "redis://127.0.0.1:6379",
        STORAGE_ENDPOINT: "http://127.0.0.1:9000",
        STORAGE_REGION: "us-east-1",
        STORAGE_ACCESS_KEY: "minioadmin",
        STORAGE_SECRET_KEY: "minioadmin",
        STORAGE_BUCKET_UPLOADS: "uploads",
        STORAGE_BUCKET_EVIDENCE: "evidence-raw",
        STORAGE_BUCKET_SPECS: "specs",
        STORAGE_BUCKET_DELIVERIES: "deliveries",
        NEXTAUTH_URL: "http://localhost:3000",
        SANDBOX_RUNTIME: "runc",
        BUILD_AGENT_CONCURRENCY: 6,
        WORKER_IDLE_SHUTDOWN_MIN: 30,
        COST_CAP_RATIO: 0.6,
        MIN_BUILD_MARGIN_PCT: 25,
        MARGIN_ALERT_PCT: 20,
        PAYMENT_FEE_PERCENT: 5,
        PAYMENT_FEE_FIXED_CENTS: 50,
        PREVIEW_ORIGIN: "http://localhost:4100",
        PREVIEW_PORT_BASE: 4100,
        PREVIEW_MAX_CONCURRENT: 2,
        PREVIEW_IDLE_TTL_MIN: 10,
        PREVIEW_HARD_TTL_MIN: 60,
        PREVIEW_REQUEST_TIMEOUT_MS: 15000,
        PREVIEW_MAX_RESPONSE_BYTES: 5000000,
        WORKER_TUNNEL_URL: "http://127.0.0.1:3001",
        DELIVERY_RETENTION_DAYS: 90,
        ENABLE_GITHUB_PUSH: false,
      }) as z.infer<typeof envSchema>;
}

export const env = parseEnv();
