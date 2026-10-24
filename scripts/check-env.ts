import "dotenv/config";
import { z } from "zod";

interface EnvCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  environment: string;
}

export function validateEnvironment(env = process.env): EnvCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeEnv = env.NODE_ENV || "development";

  // Check required baseline variables
  if (!env.DATABASE_URL) {
    errors.push("Missing required variable: DATABASE_URL");
  }

  if (!env.NEXTAUTH_SECRET && !env.AUTH_SECRET) {
    errors.push("Missing authentication secret: NEXTAUTH_SECRET or AUTH_SECRET must be set");
  }

  // Production-specific strict requirements
  if (nodeEnv === "production") {
    if (env.PAYMENT_PROVIDER === "fake") {
      errors.push("CRITICAL: Production refuses PAYMENT_PROVIDER=fake. Must be configured with real provider ('paddle').");
    }

    if (env.LLM_PROVIDER === "fixture") {
      errors.push("CRITICAL: Production refuses LLM_PROVIDER=fixture. Must be configured with real provider ('anthropic').");
    }

    if (env.SANDBOX_RUNTIME === "runc" && env.ALLOW_RUNC !== "true" && env.ALLOW_RUNC !== "1") {
      errors.push("CRITICAL: Production refuses SANDBOX_RUNTIME=runc without explicit ALLOW_RUNC override. gVisor (runsc) is required.");
    }

    if (!env.ANTHROPIC_API_KEY) {
      errors.push("Missing ANTHROPIC_API_KEY in production mode.");
    }

    if (!env.PADDLE_API_KEY || !env.PADDLE_WEBHOOK_SECRET_KEY) {
      errors.push("Missing Paddle credentials (PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET_KEY are required in production).");
    }

    if (!env.RESEND_API_KEY) {
      warnings.push("RESEND_API_KEY not set. Outbound transactional emails will fail in production.");
    }

    if (!env.DATA_KEY) {
      warnings.push("DATA_KEY not set. Uploaded customer binaries will not have application-level envelope encryption.");
    }
  } else {
    // Development/Test checks
    if (env.PAYMENT_PROVIDER === "fake") {
      warnings.push("Running with PAYMENT_PROVIDER=fake (acceptable for local dev/testing only).");
    }
    if (env.LLM_PROVIDER === "fixture") {
      warnings.push("Running with LLM_PROVIDER=fixture (acceptable for offline development and CI only).");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment: nodeEnv,
  };
}

function main() {
  process.stdout.write("[Check-Env] Auditing active environment variables...\n");
  const result = validateEnvironment();

  process.stdout.write(`Environment: ${result.environment}\n`);

  if (result.warnings.length > 0) {
    process.stdout.write("\nWARNINGS:\n");
    for (const w of result.warnings) {
      process.stdout.write(`  [!] ${w}\n`);
    }
  }

  if (!result.valid) {
    process.stderr.write("\nFATAL CONFIGURATION ERRORS:\n");
    for (const err of result.errors) {
      process.stderr.write(`  [X] ${err}\n`);
    }
    process.exit(1);
  }

  process.stdout.write("\n[Check-Env] Environment configuration validated successfully.\n");
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith("check-env.ts")) {
  main();
}
