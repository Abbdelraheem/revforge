/**
 * Rate Limiter interface supporting in-memory dev mode and Redis for production
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private static store = new Map<string, RateLimitRecord>();

  /**
   * Consumes points for a given key (IP, user, or workspace)
   */
  static async consume(
    key: string,
    limit: number = 30,
    windowSec: number = 60
  ): Promise<{ success: boolean; remaining: number; resetInSec: number }> {
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: limit - 1, resetInSec: windowSec };
    }

    if (record.count >= limit) {
      const resetInSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      return { success: false, remaining: 0, resetInSec };
    }

    record.count += 1;
    const remaining = Math.max(0, limit - record.count);
    const resetInSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { success: true, remaining, resetInSec };
  }
}
