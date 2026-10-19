import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // LLM Configuration (Anthropic API only per Section 1)
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL_FAST: z.string().default("claude-haiku-5-5"),
  LLM_MODEL_STANDARD: z.string().default("claude-sonnet-5-5"),
  LLM_MODEL_PREMIUM: z.string().default("claude-opus-5-5"),
  LLM_PROVIDER: z.enum(["anthropic", "fixture"]).default("fixture"),

  // Payment Provider Configuration (Paddle Billing per Section 1)
  PAYMENT_PROVIDER: z.enum(["paddle", "fake"]).default("fake"),
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET_KEY: z.string().optional(),
  PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  FAKE_WEBHOOK_SECRET: z.string().default("fake_webhook_secret_dev_testing_only"),

  // Redis & Queues
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

  // Storage (S3-compatible: MinIO locally / Cloudflare R2 in prod)
  STORAGE_ENDPOINT: z.string().default("http://127.0.0.1:9000"),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_ACCESS_KEY: z.string().default("minioadmin"),
  STORAGE_SECRET_KEY: z.string().default("minioadmin"),
  STORAGE_BUCKET_UPLOADS: z.string().default("uploads"),
  STORAGE_BUCKET_EVIDENCE: z.string().default("evidence-raw"),
  STORAGE_BUCKET_SPECS: z.string().default("specs"),
  STORAGE_BUCKET_DELIVERIES: z.string().default("deliveries"),

  // Security & Crypto
  DATA_KEY: z.string().min(32, "DATA_KEY must be at least 32 characters for AES-256-GCM").default("revforge_data_encryption_key_32_chars_min!"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters").default("revforge_super_secret_architect_key_32_characters_minimum!"),
  NEXTAUTH_URL: z.string().default("http://localhost:3000"),

  // Sandbox runtime
  SANDBOX_RUNTIME: z.enum(["runsc", "runc"]).default("runc"),
  ALLOW_RUNC: z.string().transform((v) => v === "true" || v === "1").default("true"),
  BUILD_AGENT_CONCURRENCY: z.coerce.number().default(6),
  WORKER_IDLE_SHUTDOWN_MIN: z.coerce.number().default(30),
});

const isServer = typeof window === "undefined";

function parseEnv() {
  if (!isServer) {
    return {} as z.infer<typeof envSchema>;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ CRITICAL: Invalid environment variables at boot:", result.error.format());
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Invalid environment variables in production: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
    }
  }

  // Production safety guards
  if (process.env.NODE_ENV === "production") {
    const data = result.success ? result.data : ({} as any);
    if (data.PAYMENT_PROVIDER === "fake") {
      throw new Error("FATAL: PAYMENT_PROVIDER cannot be 'fake' in production mode.");
    }
    if (data.SANDBOX_RUNTIME === "runc" && !data.ALLOW_RUNC) {
      throw new Error("FATAL: In production, SANDBOX_RUNTIME must be 'runsc' (gVisor) unless ALLOW_RUNC=true is explicitly set.");
    }
  }

  return (result.success ? result.data : envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/revforge",
  })) as z.infer<typeof envSchema>;
}

export const env = parseEnv();
