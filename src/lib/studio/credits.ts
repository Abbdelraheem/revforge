import { systemDb } from "@/db";
import { creditsLedger, studioEdits } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { settleEdit } from "./pricing";

export class InsufficientCreditsError extends Error {
  readonly availableCents: number;
  readonly requiredCents: number;

  constructor(availableCents: number, requiredCents: number) {
    super(`Insufficient credit balance: available ${availableCents}¢, required ${requiredCents}¢.`);
    this.name = "InsufficientCreditsError";
    this.availableCents = availableCents;
    this.requiredCents = requiredCents;
  }
}

/**
 * Holds credits for a Studio edit using a transaction-level PostgreSQL advisory lock.
 * Checks that net balance >= maxCents, inserts hold row with delta_cents = -maxCents, kind = 'studio_hold'.
 * Returns the hold row id.
 */
export async function holdCredits(
  workspaceId: string,
  maxCents: number,
  editId?: string
): Promise<string> {
  if (maxCents <= 0) {
    throw new Error("Credit hold amount must be positive integer cents.");
  }

  return await systemDb.transaction(async (tx) => {
    // 1. Transaction-level advisory lock serializes hold operations per workspace
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`);

    // 2. Compute current balance under lock
    const [balanceRow] = await tx
      .select({
        total: sql<number>`coalesce(sum(${creditsLedger.deltaCents}), 0)::int`,
      })
      .from(creditsLedger)
      .where(eq(creditsLedger.workspaceId, workspaceId));

    const balanceCents = balanceRow?.total ?? 0;
    if (balanceCents < maxCents) {
      throw new InsufficientCreditsError(balanceCents, maxCents);
    }

    // 3. Insert hold row
    const [holdRow] = await tx
      .insert(creditsLedger)
      .values({
        workspaceId,
        deltaCents: -maxCents,
        reason: `Studio edit hold for ${editId || "edit"}`,
        kind: "studio_hold",
      })
      .returning({ id: creditsLedger.id });

    if (!holdRow) {
      throw new Error("Failed to insert hold record into credits ledger.");
    }

    // 4. Update edit record if provided
    if (editId) {
      await tx
        .update(studioEdits)
        .set({
          tokensHeldCents: maxCents,
          status: "held",
        })
        .where(eq(studioEdits.id, editId));
    }

    return holdRow.id;
  });
}

/**
 * Settles a credit hold by releasing the difference if actualCents < maxCents;
 * if actualCents === 0 (failed edit), refunds full maxCents with kind = 'studio_refund'.
 */
export async function settleCredits(
  workspaceId: string,
  holdId: string,
  actualCents: number,
  editId?: string
): Promise<{ chargedCents: number; refundedCents: number }> {
  return await systemDb.transaction(async (tx) => {
    // 1. Lock workspace
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`);

    // 2. Fetch original hold row
    const [holdRow] = await tx
      .select()
      .from(creditsLedger)
      .where(eq(creditsLedger.id, holdId));

    if (!holdRow) {
      throw new Error(`Hold record "${holdId}" not found in credits ledger.`);
    }

    const heldCents = Math.abs(holdRow.deltaCents);
    const { chargeCents, refundCents } = settleEdit(heldCents, actualCents);

    // 3. If refundCents > 0, insert refund row
    if (refundCents > 0) {
      const isFullRefund = chargeCents === 0;
      await tx.insert(creditsLedger).values({
        workspaceId,
        deltaCents: refundCents,
        reason: isFullRefund
          ? `Studio edit failed — full refund of ${refundCents}¢`
          : `Studio edit settle — unspent refund of ${refundCents}¢`,
        kind: "studio_refund",
      });
    }

    // 4. Update edit record if provided
    if (editId) {
      await tx
        .update(studioEdits)
        .set({
          tokensSettledCents: chargeCents,
          status: chargeCents > 0 ? "committed" : "refunded",
        })
        .where(eq(studioEdits.id, editId));
    }

    return {
      chargedCents: chargeCents,
      refundedCents: refundCents,
    };
  });
}
