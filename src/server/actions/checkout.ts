"use server";

import { withTenant } from "@/db/tenant";
import { quotes, orders, projects, buildJobs, outbox, auditLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/billing/provider";
import { transitionProject } from "@/db/state-machine";
import { deductCredits } from "@/lib/billing/credits";

export interface InitiateCheckoutParams {
  projectId: string;
}

export async function initiateCheckoutAction(params: InitiateCheckoutParams) {
  const session = await requireSession();
  const workspaceId = session.workspace.id;

  return withTenant(
    { userId: session.user.id, workspaceId },
    async (tx) => {
      // 1. Verify project ownership in workspace
      const [project] = await tx
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, params.projectId),
            eq(projects.workspaceId, workspaceId)
          )
        );

      if (!project) {
        return { error: "Project not found in current workspace." };
      }

      // 2. Fetch the active quote strictly from the DB - NEVER accept amount from client input
      const [activeQuote] = await tx
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.projectId, project.id),
            eq(quotes.workspaceId, workspaceId),
            eq(quotes.status, "active")
          )
        );

      if (!activeQuote) {
        return { error: "No active quote found for this project." };
      }

      if (activeQuote.needsReview) {
        return { error: "Quote requires enterprise engineering review. Our team has been notified." };
      }

      const orderAmountCents = activeQuote.totalCents;

      // 3. Case A: 100% covered by credits (0 cents to charge)
      if (orderAmountCents === 0) {
        const [order] = await tx
          .insert(orders)
          .values({
            workspaceId,
            projectId: project.id,
            quoteId: activeQuote.id,
            kind: "build",
            status: "paid_by_credit",
            amountCents: 0,
            provider: "fake",
          })
          .returning();

        if (!order) {
          throw new Error("Failed to insert credit order.");
        }

        if (activeQuote.creditsAppliedCents > 0) {
          await deductCredits({
            workspaceId,
            amountCents: activeQuote.creditsAppliedCents,
            orderId: order.id,
            reason: `Applied full credits to build order ${order.id}`,
          });
        }

        await transitionProject(
          tx as any,
          project.id,
          project.status as any,
          "awaiting_payment",
          { type: "system", reason: "checkout_credit_init" }
        );

        await transitionProject(
          tx as any,
          project.id,
          "awaiting_payment",
          "paid",
          { type: "system", reason: "paid_by_credit" }
        );

        const [job] = await tx
          .insert(buildJobs)
          .values({
            workspaceId,
            projectId: project.id,
            orderId: order.id,
            status: "queued",
            costCapCents: Math.round(activeQuote.subtotalCents * 0.4),
            spentCents: 0,
            stage: "queued",
          })
          .returning();

        if (!job) {
          throw new Error("Failed to insert build job.");
        }

        await transitionProject(
          tx as any,
          project.id,
          "paid",
          "queued",
          { type: "system", reason: "build_job_queued" }
        );

        await tx.insert(outbox).values({
          topic: "build.enqueue",
          payload: { jobId: job.id, projectId: project.id },
        });

        return { success: true, paidByCredit: true, jobId: job.id };
      }

      // 4. Case B: Paid checkout via PaymentProvider
      const provider = getPaymentProvider();

      const [order] = await tx
        .insert(orders)
        .values({
          workspaceId,
          projectId: project.id,
          quoteId: activeQuote.id,
          kind: "build",
          status: "awaiting_payment",
          amountCents: orderAmountCents,
          provider: provider.name,
        })
        .returning();

      if (!order) {
        return { error: "Failed to initialize order." };
      }

      const checkoutResult = await provider.createCheckout({
        orderId: order.id,
        amountCents: orderAmountCents,
        currency: "USD",
        description: `Clean-Room Build for ${project.name}`,
        customerEmail: session.user.email,
        successUrl: `/projects/${project.id}`,
      });

      // Update order with provider transaction ID
      await tx
        .update(orders)
        .set({
          providerTxnId: checkoutResult.providerTxnId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      // Transition project to awaiting_payment
      if (project.status === "analyzed" || project.status === "draft") {
        await transitionProject(
          tx as any,
          project.id,
          project.status as any,
          "awaiting_payment",
          { type: "user", userId: session.user.id }
        );
      }

      return {
        success: true,
        checkoutUrl: checkoutResult.checkoutUrl,
        orderId: order.id,
      };
    }
  );
}
