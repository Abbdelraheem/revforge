import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/billing/provider";
import { systemDb } from "@/db";
import {
  webhookEvents,
  orders,
  payments,
  buildJobs,
  outbox,
  auditLog,
} from "@/db/schema";
import { transitionProject } from "@/db/state-machine";
import { dispatchOutbox } from "@/lib/queue/outbox";
import { eq, sql } from "drizzle-orm";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = getPaymentProvider();

  // 1. Signature verification (400 on failure, nothing stored in DB)
  let event;
  try {
    event = provider.verifyAndParseWebhook(rawBody, req.headers);
  } catch (err: any) {
    return NextResponse.json(
      { error: "invalid_signature", details: err?.message },
      { status: 400 }
    );
  }

  const costCapRatio = env.COST_CAP_RATIO;

  try {
    const result = await systemDb.transaction(async (tx) => {
      // 2. Idempotent event registration: retries only if earlier attempt failed
      const [claimedEvent] = await tx
        .insert(webhookEvents)
        .values({
          provider: provider.name,
          eventId: event.id,
          type: event.type,
          payload: event.raw,
          status: "received",
        })
        // onConflictDoNothing idempotency: handled via onConflictDoUpdate where status='failed'
        .onConflictDoUpdate({
          target: webhookEvents.eventId,
          set: {
            status: "received",
            error: null,
          },
          where: eq(webhookEvents.status, "failed"),
        })
        .returning();

      if (!claimedEvent) {
        // Event exists and is already received or processed
        return { isDuplicate: true };
      }

      if (event.type === "transaction.completed") {
        // 3. SELECT ... FROM orders WHERE id = $1 FOR UPDATE
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, event.orderId))
          .for("update");

        if (!order) {
          throw new Error(`Order ${event.orderId} not found`);
        }

        if (order.status !== "awaiting_payment") {
          // Already paid or cancelled
          await tx
            .update(webhookEvents)
            .set({ status: "processed", processedAt: new Date() })
            .where(eq(webhookEvents.eventId, event.id));
          return { isDuplicate: true };
        }

        // 4. Mismatch checks
        const txnMatch = order.providerTxnId === event.providerTxnId;
        const currencyMatch = event.currency === "USD";
        const amountMatch = event.subtotalCents === order.amountCents;

        if (!txnMatch || !currencyMatch || !amountMatch) {
          // Mismatch detected: mark order mismatch, log audit, no unlock
          await tx
            .update(orders)
            .set({ status: "mismatch", updatedAt: new Date() })
            .where(eq(orders.id, order.id));

          await tx.insert(auditLog).values({
            workspaceId: order.workspaceId,
            actorType: "webhook",
            action: "payment.mismatch_detected",
            resourceType: "orders",
            resourceId: order.id,
            metadata: {
              expectedCents: order.amountCents,
              receivedCents: event.subtotalCents,
              expectedTxn: order.providerTxnId,
              receivedTxn: event.providerTxnId,
              currency: event.currency,
            },
          });

          await tx
            .update(webhookEvents)
            .set({ status: "processed", processedAt: new Date() })
            .where(eq(webhookEvents.eventId, event.id));

          return { isMismatch: true };
        }

        // 5. Order paid & Payments row
        await tx
          .update(orders)
          .set({ status: "paid", updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        await tx.insert(payments).values({
          workspaceId: order.workspaceId,
          orderId: order.id,
          amountCents: event.subtotalCents,
          currency: "USD",
          provider: provider.name,
          providerTxnId: event.providerTxnId,
          payload: { eventId: event.id },
        });

        if (order.kind === "build") {
          // State transitions: awaiting_payment -> paid -> queued
          await transitionProject(
            tx as any,
            order.projectId,
            "awaiting_payment",
            "paid",
            { type: "webhook", providerTxnId: event.providerTxnId }
          );

          // 6. Build Job with cost_cap_cents = round(amount * COST_CAP_RATIO)
          const costCapCents = Math.round(order.amountCents * costCapRatio);

          const [job] = await tx
            .insert(buildJobs)
            .values({
              workspaceId: order.workspaceId,
              projectId: order.projectId,
              orderId: order.id,
              status: "queued",
              costCapCents,
              spentCents: 0,
              stage: "queued",
            })
            .returning();

          await transitionProject(
            tx as any,
            order.projectId,
            "paid",
            "queued",
            { type: "system", reason: "build_job_queued" }
          );

          // 7. Outbox row build.enqueue
          if (job) {
            await tx.insert(outbox).values({
              topic: "build.enqueue",
              payload: { jobId: job.id, projectId: order.projectId },
            });
          }
        } else {
          // Analysis fee order paid
          await tx.insert(outbox).values({
            topic: "analysis.enqueue",
            payload: { projectId: order.projectId },
          });
        }
      } else if (event.type.startsWith("adjustment.")) {
        await tx
          .update(orders)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(orders.id, event.orderId));
      }

      // 8. Mark event processed
      await tx
        .update(webhookEvents)
        .set({ status: "processed", processedAt: new Date() })
        .where(eq(webhookEvents.eventId, event.id));

      return { isSuccess: true };
    });

    if (result.isDuplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // 10. Best-effort dispatchOutbox() with 5s timeout after commit
    try {
      await Promise.race([
        dispatchOutbox(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("dispatch_timeout")), 5000)
        ),
      ]);
    } catch {
      // Redis down or slow: Outbox row is durable; background poller drains it later.
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // 11. On transaction error: record event as failed in a separate statement and return 500
    try {
      await systemDb
        .update(webhookEvents)
        .set({
          status: "failed",
          error: err?.message || String(err),
        })
        .where(eq(webhookEvents.eventId, event.id));
    } catch {}

    return NextResponse.json(
      { error: "processing_failed", message: err?.message },
      { status: 500 }
    );
  }
}
