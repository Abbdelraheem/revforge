import { logger } from "./logger";

export interface AlertPayload {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Dispatches critical operational alerts to webhook / log stream.
 */
export async function sendAlert(alert: AlertPayload): Promise<boolean> {
  const webhookUrl = process.env.OPS_ALERT_WEBHOOK_URL;
  const timestamp = alert.timestamp || new Date().toISOString();

  if (alert.severity === "critical") {
    logger.error({ alert, timestamp }, "ALERT_CRITICAL");
  } else if (alert.severity === "warning") {
    logger.warn({ alert, timestamp }, "ALERT_WARNING");
  } else {
    logger.info({ alert, timestamp }, "ALERT_INFO");
  }

  if (!webhookUrl) {
    return true; // Gracefully logged to standard stream when webhook is not configured
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...alert,
        timestamp,
        environment: process.env.NODE_ENV || "development",
      }),
    });
    return res.ok;
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "ALERT_DISPATCH_FAILED");
    return false;
  }
}
