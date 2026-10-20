import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/billing/provider";
import { db } from "@/db";
import {
  webhookEvents,
  orders,
  payments,
  buildJobs,
  outbox,
  auditLog,
} from "@/db/schema";
import { transitionProject } from "@/db/state-machine";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // Raw body before any parsing
  const provider = getPaymentProvider();

  let event;
  try {
    event = provider.verifyAndParseWebhook(rawBody, req.headers);
  } catch (err: any) {
    return NextResponse.json(
      { error: "invalid_signature", details: err?.message },
      { status: 400 }
    );
  }

  // 1. Idempotency check via unique eventId
  const insertedEvent = await db
    .insert(webhookEvents)
    .values({
      provider: provider.name,
      eventId: event.id,
      type: event.type,
      payload: event.raw,
      status: "received",
    })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  if (insertedEvent.length === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await db.transaction(async (tx) => {
      if (event.type === "transaction.completed") {
        // Lock and retrieve the order
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, event.orderId));

        if (!order || order.status !== "awaiting_payment") {
          return; // Already processed or invalid order state
        }

        // Integrity verification: provider txn id match, currency USD, pre-tax amount match
        if (
          order.providerTxnId !== event.providerTxnId ||
          event.currency !== "USD" ||
          event.subtotalCents !== order.amountCents
        ) {
          // Amount or currency mismatch: NEVER unlock
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
            },
          });
          return;
        }

        // Mark order paid
        await tx
          .update(orders)
          .set({ status: "paid", updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        // Insert payment record
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
          // Transition project to paid then queued
          await transitionProject(
            tx as any,
            order.projectId,
            "awaiting_payment",
            "paid",
            { type: "webhook", providerTxnId: event.providerTxnId }
          );

          // Create Build Job
          const [job] = await tx
            .insert(buildJobs)
            .values({
              workspaceId: order.workspaceId,
              projectId: order.projectId,
              orderId: order.id,
              status: "queued",
              costCapCents: Math.round(order.amountCents * 0.4), // 40% hard cost cap
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

          // Insert outbox dispatch record for BullMQ worker
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
        // Refund / dispute adjustment
        await tx
          .update(orders)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(orders.id, event.orderId));
      }
    });

    // Mark event processed
    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(webhookEvents.eventId, event.id));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await db
      .update(webhookEvents)
      .set({ status: "failed", error: err?.message })
      .where(eq(webhookEvents.eventId, event.id));

    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
