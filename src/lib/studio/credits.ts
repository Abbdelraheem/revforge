import type { DbTx } from "@/db/tenant";
import { creditsLedger } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export class InsufficientCreditsError extends Error {
  readonly availableCents: number;
  readonly requiredCents: number;

  constructor(availableCents: number, requiredCents: number) {
    super(
      `Insufficient credit balance: available ${availableCents}¢, required ${requiredCents}¢.`
    );
    this.name = "InsufficientCreditsError";
    this.availableCents = availableCents;
    this.requiredCents = requiredCents;
  }
}

export interface HoldCreditsInput {
  workspaceId: string;
  cents: number;
  editId: string;
}

export interface SettleCreditsInput {
  workspaceId: string;
  editId: string;
  heldCents: number;
  chargeCents: number;
}

/**
 * Holds credits inside the caller's transaction.
 *
 * A transaction-scoped advisory lock serializes holds per workspace, the
 * balance is read under that lock, and the debit is written as
 * `studio_hold:<editId>`. The caller supplies the transaction so the edit row
 * and the hold commit or roll back together.
 */
export async function holdCredits(
  tx: DbTx,
  { workspaceId, cents, editId }: HoldCreditsInput
): Promise<string> {
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error("Credit hold amount must be a positive integer number of cents.");
  }

  const amount = Math.floor(cents);

  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`
  );

  const [balanceRow] = await tx
    .select({
      total: sql<number>`coalesce(sum(${creditsLedger.deltaCents}), 0)::int`,
    })
    .from(creditsLedger)
    .where(eq(creditsLedger.workspaceId, workspaceId));

  const availableCents = Number(balanceRow?.total ?? 0);
  if (availableCents < amount) {
    throw new InsufficientCreditsError(availableCents, amount);
  }

  const [holdRow] = await tx
    .insert(creditsLedger)
    .values({
      workspaceId,
      deltaCents: -amount,
      reason: `studio_hold:${editId}`,
      kind: "studio_hold",
    })
    .returning({ id: creditsLedger.id });

  if (!holdRow) {
    throw new Error("Failed to write Studio credit hold to the ledger.");
  }

  return holdRow.id;
}

/**
 * Settles a hold inside the caller's transaction.
 *
 * The refund row is `+(held - charge)` with reason `studio_settle:<editId>`.
 * A pre-check plus the workspace advisory lock makes settlement idempotent:
 * retrying the same edit cannot refund the unspent amount twice.
 */
export async function settleCredits(
  tx: DbTx,
  { workspaceId, editId, heldCents, chargeCents }: SettleCreditsInput
): Promise<{ chargedCents: number; refundedCents: number }> {
  const held = Number.isFinite(heldCents) && heldCents > 0
    ? Math.floor(heldCents)
    : 0;
  const charge = Number.isFinite(chargeCents) && chargeCents > 0
    ? Math.min(held, Math.floor(chargeCents))
    : 0;
  const refundCents = Math.max(0, held - charge);
  const reason = `studio_settle:${editId}`;

  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`
  );

  const [existing] = await tx
    .select({ id: creditsLedger.id })
    .from(creditsLedger)
    .where(
      and(
        eq(creditsLedger.workspaceId, workspaceId),
        eq(creditsLedger.reason, reason)
      )
    )
    .limit(1);

  if (!existing) {
    await tx.insert(creditsLedger).values({
      workspaceId,
      deltaCents: refundCents,
      reason,
      kind: "studio_settle",
    });
  }

  return {
    chargedCents: charge,
    refundedCents: refundCents,
  };
}
