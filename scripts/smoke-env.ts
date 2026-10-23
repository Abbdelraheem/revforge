/**
 * Must be imported before any application module in the smoke harness.
 *
 * The repository's `.env` is a production configuration pointer. The smoke
 * script is a test harness and must be allowed to run against local services
 * without pretending to be a production deployment. It still uses the real
 * DATABASE_URL / REDIS_URL / STORAGE_* values from the environment.
 */
const vars = process.env as Record<string, string | undefined>;
vars.NODE_ENV = "test";
vars.LLM_PROVIDER = vars.LLM_PROVIDER || "fixture";
vars.PAYMENT_PROVIDER = vars.PAYMENT_PROVIDER || "fake";
