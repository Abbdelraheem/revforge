import { dispatchOutbox } from "@/lib/queue/outbox";

export interface ReconcileResult {
  dispatched: number;
}

/**
 * Periodic reconciliation loop:
 * Inspects transactional outbox table and re-dispatches any unhandled or pending events to BullMQ queues.
 */
export async function reconcileOutbox(): Promise<ReconcileResult> {
  const dispatched = await dispatchOutbox(50);
  return { dispatched };
}
