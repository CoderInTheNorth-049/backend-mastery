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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const order = await client.query<{ id: number }>(
      `INSERT INTO orders (user_id, amount_cents, status) VALUES ($1, $2, 'placed') RETURNING id`,
      [input.userId, input.amountCents],
    );
    const orderId = order.rows[0].id;

    await client.query(
      `INSERT INTO outbox (aggregate_id, type, payload)
       VALUES ($1, 'order.placed', $2)`,
      [orderId, JSON.stringify({ orderId, userId: input.userId, amountCents: input.amountCents })],
    );

    // The COMMIT is the atomicity boundary. Everything after it is
    // best-effort: the event already exists in committed data.
    await client.query("COMMIT");

    try {
      await relayOnce(pool, bus);
    } catch {
      /* publisher down ⇒ relay picks it up later; state is safe */
    }

    return { orderId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Claim → publish → mark, with SKIP LOCKED so concurrent relays steal
 * disjoint work instead of colliding. Crash after publish before mark ⇒
 * at-least-once redelivery; consumers dedupe via the inbox.
 */
export async function relayOnce(
  pool: import("pg").Pool,
  bus: EventBus,
  batchSize = 10,
): Promise<number> {
  const client = await pool.connect();
  let published = 0;

  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ id: string; type: string; payload: unknown }>(
      `SELECT id, type, payload FROM outbox
        WHERE published_at IS NULL
        ORDER BY id
        LIMIT $1
        FOR UPDATE SKIP LOCKED`,
      [batchSize],
    );

    for (const row of rows) {
      await bus.publish({
        id: String(row.id), // deterministic dedupe identity for consumers
        type: row.type,
        payload: row.payload,
      });
      published++;
    }

    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      await client.query(`UPDATE outbox SET published_at = now() WHERE id = ANY($1::bigint[])`, [
        ids,
      ]);
    }

    await client.query("COMMIT");
    return published;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export type ConsumeResult = "processed" | "duplicate";

/**
 * Claim-then-run with release-on-failure: the inbox row IS the claim.
 * Handler success commits it; handler failure deletes it and rethrows so
 * the next delivery can retry from scratch.
 */
export async function consumeIdempotent<T = unknown>(
  pool: import("pg").Pool,
  event: { id: string; type: string; payload: T },
  handler: (payload: T) => Promise<void>,
): Promise<ConsumeResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const claim = await client.query<{ processed_key: string }>(
      `INSERT INTO inbox (processed_key) VALUES ($1)
       ON CONFLICT DO NOTHING
       RETURNING processed_key`,
      [event.id],
    );

    if (claim.rows.length === 0) {
      await client.query("COMMIT");
      return "duplicate";
    }

    try {
      await handler(event.payload);
      await client.query("COMMIT");
      return "processed";
    } catch (error) {
      // Release the claim — this delivery never happened.
      await client.query("ROLLBACK");
      await pool.query(`DELETE FROM inbox WHERE processed_key = $1`, [event.id]);
      throw error;
    }
  } finally {
    client.release();
  }
}
