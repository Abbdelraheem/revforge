import pino from "pino";

/**
 * Structured Pino JSON logger for RevForge web and worker services.
 * Automatically redacts secrets, tokens, PII, and credentials from all log outputs.
 */

const REDACTED_KEYS = [
  "authorization",
  "cookie",
  "apiKey",
  "secret",
  "password",
  "token",
  "ANTHROPIC_API_KEY",
  "PADDLE_API_KEY",
  "PADDLE_WEBHOOK_SECRET_KEY",
  "NEXTAUTH_SECRET",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
  "DATA_KEY",
  "cardNumber",
  "cvv",
  "headers.authorization",
  "headers.cookie",
];

export interface LogContext {
  requestId?: string;
  jobId?: string;
  workspaceId?: string;
  projectId?: string;
  module?: string;
  [key: string]: unknown;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: REDACTED_KEYS,
    censor: "[REDACTED]",
  },
  base: {
    service: "revforge",
    env: process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Creates a child logger with bound contextual metadata.
 */
export function createLogger(context: LogContext) {
  return logger.child(context);
}

export const webLogger = createLogger({ module: "web" });
export const workerLogger = createLogger({ module: "worker" });
export const queueLogger = createLogger({ module: "queue" });
export const sandboxLogger = createLogger({ module: "sandbox" });
export const billingLogger = createLogger({ module: "billing" });
