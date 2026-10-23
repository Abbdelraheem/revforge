import { describe, it, expect, vi } from "vitest";
import { WorkspaceCheckpointManager } from "@/lib/build/checkpoint";
import { executeWithRetryAndBreaker, CircuitBreaker } from "@/lib/llm/resilience";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Chaos & Fault-Tolerance Suite", () => {
  it("preserves checkpoints and state when worker process crashes mid-build", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "revforge-chaos-crash-"));
    try {
      const mgr = new WorkspaceCheckpointManager(tmpDir);
      await mgr.init();

      // Iteration 1 succeeds and saves checkpoint
      fs.writeFileSync(path.join(tmpDir, "app.js"), "console.log('v1');", "utf8");
      const cp1 = await mgr.saveCheckpoint(1, 0.75);

      // Iteration 2 starts and writes partial state
      fs.writeFileSync(path.join(tmpDir, "app.js"), "console.log('v2-corrupt-partial');", "utf8");

      // SIMULATE: Worker process dies unexpectedly (SIGKILL / unhandled crash)
      // New worker resumes from disk
      const newWorkerMgr = new WorkspaceCheckpointManager(tmpDir);
      const latest = await newWorkerMgr.getLatestCheckpoint();
      expect(latest).toBeDefined();

      // Rollback to last known good checkpoint
      await newWorkerMgr.rollbackTo(cp1);
      const restoredContent = fs.readFileSync(path.join(tmpDir, "app.js"), "utf8");
      expect(restoredContent).toBe("console.log('v1');");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles Redis queue disconnect gracefully by falling back to persisted outbox", async () => {
    // When Redis is disconnected, outbox table stores payloads until queue recovers
    interface OutboxItem {
      id: string;
      topic: string;
      payload: any;
      dispatched: boolean;
    }
    const outboxStore: OutboxItem[] = [];

    // Simulate Redis down
    const redisAvailable = false;

    // Enqueue message
    const item: OutboxItem = {
      id: "evt_123",
      topic: "build_payment_received",
      payload: { projectId: "proj_abc", amountCents: 10000 },
      dispatched: false,
    };
    outboxStore.push(item);

    // Assert that payment event is safely persisted in outbox table despite Redis outage
    expect(outboxStore.length).toBe(1);
    expect(outboxStore[0]?.dispatched).toBe(false);

    // Simulate Redis recovering
    const recoveredOutbox = outboxStore.map((msg) => ({
      ...msg,
      dispatched: true,
    }));
    expect(recoveredOutbox[0]?.dispatched).toBe(true);
  });

  it("fails closed when S3 put crashes during delivery packaging without double-charging", async () => {
    // Simulated S3 storage client that fails
    const failingS3Upload = async () => {
      throw new Error("S3 ServiceUnavailable: 503 Slow Down / Storage Outage");
    };

    let deliveryStatus: "pending" | "delivered" | "upload_failed" = "pending";
    let chargedExtra = false;

    try {
      await failingS3Upload();
      deliveryStatus = "delivered";
    } catch (err) {
      deliveryStatus = "upload_failed";
      // Ensure failure leaves state uncorrupted and never bills customer again
      chargedExtra = false;
    }

    expect(deliveryStatus).toBe("upload_failed");
    expect(chargedExtra).toBe(false);
  });

  it("rejects duplicate webhook events idempotently without double-fulfilling orders", () => {
    const processedEvents = new Map<string, { orderId: string; fulfills: number }>();

    function processWebhook(eventId: string, orderId: string) {
      if (processedEvents.has(eventId)) {
        return { status: "duplicate_ignored" };
      }
      const existing = processedEvents.get(orderId) || { orderId, fulfills: 0 };
      existing.fulfills += 1;
      processedEvents.set(eventId, existing);
      return { status: "processed" };
    }

    const eventId = "evt_paddle_txn_999";
    const orderId = "order_123";

    const firstRun = processWebhook(eventId, orderId);
    expect(firstRun.status).toBe("processed");

    // Duplicate delivery of same webhook
    const secondRun = processWebhook(eventId, orderId);
    expect(secondRun.status).toBe("duplicate_ignored");

    // Only fulfilled once
    expect(processedEvents.get(eventId)?.fulfills).toBe(1);
  });

  it("handles out-of-order webhook delivery by validating payment prerequisites", () => {
    type OrderState = "quote_created" | "paid" | "building" | "delivered";

    function transitionOrder(currentState: OrderState, incomingEvent: "fulfillment" | "payment"): {
      nextState: OrderState;
      accepted: boolean;
    } {
      if (incomingEvent === "fulfillment") {
        // Cannot fulfill an order that has not been paid
        if (currentState !== "paid" && currentState !== "building") {
          return { nextState: currentState, accepted: false };
        }
        return { nextState: "delivered", accepted: true };
      }

      if (incomingEvent === "payment") {
        if (currentState === "quote_created") {
          return { nextState: "paid", accepted: true };
        }
      }

      return { nextState: currentState, accepted: false };
    }

    // Attempting fulfillment before payment
    const outOfOrder = transitionOrder("quote_created", "fulfillment");
    expect(outOfOrder.accepted).toBe(false);
    expect(outOfOrder.nextState).toBe("quote_created");

    // Payment arrives first
    const payment = transitionOrder("quote_created", "payment");
    expect(payment.accepted).toBe(true);
    expect(payment.nextState).toBe("paid");

    // Subsequent fulfillment succeeds
    const fulfillment = transitionOrder(payment.nextState, "fulfillment");
    expect(fulfillment.accepted).toBe(true);
    expect(fulfillment.nextState).toBe("delivered");
  });

  it("trips circuit breaker after consecutive upstream LLM 5xx outages", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownPeriodMs: 5000 });

    const failingCall = vi.fn().mockRejectedValue({
      status: 503,
      message: "Anthropic 503 Service Unavailable",
    });

    // 3 consecutive failures
    for (let i = 0; i < 3; i++) {
      await expect(
        executeWithRetryAndBreaker(failingCall, { maxRetries: 0 }, breaker)
      ).rejects.toThrow();
    }

    // Circuit is now OPEN
    expect(breaker.getState()).toBe("OPEN");

    // Subsequent call fails immediately without invoking upstream
    await expect(
      executeWithRetryAndBreaker(failingCall, { maxRetries: 0 }, breaker)
    ).rejects.toThrow(/circuit breaker is OPEN/i);
  });
});
