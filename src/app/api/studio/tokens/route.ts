import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeStudio } from "@/lib/studio/authorize";
import { loadStudioRouteData } from "@/lib/studio/route-context";
import { getPaymentProvider } from "@/lib/billing/provider";
import { isStudioTokenPack } from "@/config/studio-tokens";
import { withTenant } from "@/db/tenant";
import { auditLog, orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: unknown; amountCents?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  const amountCents = Number(body.amountCents);

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required." },
      { status: 400 }
    );
  }

  if (!isStudioTokenPack(amountCents)) {
    return NextResponse.json(
      { error: "Choose one of the configured Studio token packs." },
      { status: 400 }
    );
  }

  const data = await loadStudioRouteData(session, projectId);
  const auth = authorizeStudio({
    session,
    project: data.project,
    orders: data.orders,
    balanceCents: data.balanceCents,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const provider = getPaymentProvider();

  try {
    const created = await withTenant(
      { userId: session.user.id, workspaceId: session.workspace.id },
      async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            workspaceId: session.workspace.id,
            projectId,
            kind: "studio_pack",
            status: "awaiting_payment",
            amountCents,
            provider: provider.name,
          })
          .returning();

        if (!order) return { error: "order_not_created" as const };

        const checkout = await provider.createCheckout({
          orderId: order.id,
          amountCents,
          currency: "USD",
          description: `Studio tokens for ${data.project?.name || "project"}`,
          customerEmail: session.user.email,
          successUrl: `/projects/${projectId}/studio?tokens=purchased`,
        });

        await tx
          .update(orders)
          .set({
            providerTxnId: checkout.providerTxnId,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        await tx.insert(auditLog).values({
          workspaceId: session.workspace.id,
          actorType: "user",
          userId: session.user.id,
          action: "studio_tokens.checkout_created",
          resourceType: "orders",
          resourceId: order.id,
          metadata: { amountCents, providerTxnId: checkout.providerTxnId },
        });

        return { orderId: order.id, checkoutUrl: checkout.checkoutUrl };
      }
    );

    if ("error" in created) {
      return NextResponse.json(
        { error: "Failed to initialize token order." },
        { status: 500 }
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to create the token checkout.",
      },
      { status: 500 }
    );
  }
}
