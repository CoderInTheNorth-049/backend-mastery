// ── Transactional outbox + relay + idempotent inbox ──────────────────────
// Implement per ../assignment.md. Do NOT rename exports.
// `pool` is a node-postgres Pool provided by the caller (specs wire it to
// the same live PostgreSQL used by the phase-03 backends).

export interface OrderInput {
  userId: number;
  amountCents: number;
}

export interface EventBus {
  publish(event: { id: string; type: string; payload: unknown }): Promise<void>;
}

/**
 * ONE transaction: insert order (status 'placed') AND its outbox row
 * (type 'order.placed'). AFTER commit, attempt a best-effort immediate
 * relay via the bus — a THROWING bus must NOT roll anything back and must
 * leave published_at NULL for the real relay to pick up later.
 */
export async function placeOrderWithOutbox(
  pool: import("pg").Pool,
  input: OrderInput,
  bus: EventBus,
): Promise<{ orderId: number }> {
  throw new Error("TODO: implement placeOrderWithOutbox");
}

/**
 * Claim up to batchSize unpublished outbox rows FOR UPDATE SKIP LOCKED,
 * publish each through the bus, mark published_at, return count.
 * Concurrent relays must never publish the same row twice.
 */
export async function relayOnce(
  pool: import("pg").Pool,
  bus: EventBus,
  batchSize?: number,
): Promise<number> {
  throw new Error("TODO: implement relayOnce");
}

export type ConsumeResult = "processed" | "duplicate";

/**
 * Idempotent consumer: claim event.id in the inbox table; if newly claimed,
 * run handler; on success keep the claim → "processed". If already claimed →
 * "duplicate" WITHOUT running the handler. If the handler THROWS, release the
 * claim so a future delivery can retry, then rethrow.
 */
export async function consumeIdempotent<T = unknown>(
  pool: import("pg").Pool,
  event: { id: string; type: string; payload: T },
  handler: (payload: T) => Promise<void>,
): Promise<ConsumeResult> {
  throw new Error("TODO: implement consumeIdempotent");
}
