import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .default("postgres://postgres:postgres@127.0.0.1:5432/revforge"),
  MOCK_SANDBOX: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .default("true"),
  
  // Paddle Billing (Primary Gateway)
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET_KEY: z.string().optional(),
  PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  // Stripe (Secondary Gateway)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Redis & Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Auth & Encryption
  NEXTAUTH_SECRET: z.string().default("revforge-development-secret-key-32-chars-min!"),
  NEXTAUTH_URL: z.string().default("http://localhost:3000"),

  // Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("revforge-artifacts"),
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
      throw new Error(`Invalid environment variables: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
    }
  }

  return (result.success ? result.data : envSchema.parse({})) as z.infer<typeof envSchema>;
}

export const env = parseEnv();
