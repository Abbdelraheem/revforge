/**
 * LLM Provider Outage Resilience, Retry with Exponential Backoff + Jitter,
 * and Circuit Breaker for Anthropic 429 / 5xx handling.
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Consecutive failures before opening circuit (default: 5)
  cooldownPeriodMs?: number; // Cooldown before half-open attempt (default: 30_000)
  maxRetries?: number; // Max retries per request (default: 4)
  baseDelayMs?: number; // Base delay in ms (default: 1000)
  maxDelayMs?: number; // Max delay in ms (default: 15_000)
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreakerOpenError extends Error {
  public retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "CircuitBreakerOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownPeriodMs = options.cooldownPeriodMs ?? 30_000;
  }

  public getState(): CircuitState {
    if (this.state === "OPEN") {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.cooldownPeriodMs) {
        this.state = "HALF_OPEN";
      }
    }
    return this.state;
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  public assertCanExecute(): void {
    const current = this.getState();
    if (current === "OPEN") {
      const remainingMs = Math.max(0, this.cooldownPeriodMs - (Date.now() - this.lastFailureTime));
      throw new CircuitBreakerOpenError(
        `LLM Provider circuit breaker is OPEN due to repeated upstream failures. Upstream requests paused to prevent cascading lockouts. Cooldown remaining: ${Math.ceil(
          remainingMs / 1000
        )}s`,
        remainingMs
      );
    }
  }
}

export const globalAnthropicBreaker = new CircuitBreaker();

/**
 * Calculates exponential backoff with full jitter.
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 15000
): number {
  const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  // Full jitter: random between 0 and expDelay
  return Math.floor(Math.random() * expDelay);
}

/**
 * Determines whether an error is transient (429 rate limit or 5xx server error).
 */
export function isTransientLlmError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as any;

  // Check HTTP status code
  const status = anyErr.status || anyErr.statusCode || anyErr.response?.status;
  if (typeof status === "number") {
    if (status === 429 || (status >= 500 && status < 600)) {
      return true;
    }
  }

  // Check message patterns
  const message = String(anyErr.message || "").toLowerCase();
  if (
    message.includes("rate_limit") ||
    message.includes("429") ||
    message.includes("overloaded") ||
    message.includes("529") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  ) {
    return true;
  }

  return false;
}

/**
 * Executes an async function with exponential retry + jitter and circuit breaker protection.
 */
export async function executeWithRetryAndBreaker<T>(
  operation: () => Promise<T>,
  options: CircuitBreakerOptions = {},
  breaker: CircuitBreaker = globalAnthropicBreaker
): Promise<T> {
  const maxRetries = options.maxRetries ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 15000;

  breaker.assertCanExecute();

  let attempt = 0;
  while (true) {
    try {
      breaker.assertCanExecute();
      const result = await operation();
      breaker.recordSuccess();
      return result;
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) {
        throw err;
      }

      if (isTransientLlmError(err) && attempt < maxRetries) {
        breaker.recordFailure();
        const delay = calculateBackoffWithJitter(attempt, baseDelayMs, maxDelayMs);
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      breaker.recordFailure();
      throw err;
    }
  }
}
