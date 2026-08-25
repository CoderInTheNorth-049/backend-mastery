import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DATABASE_URL, HAS_DB } from "../../03-databases/test-support/env";
import {
  consumeIdempotent,
  placeOrderWithOutbox,
  relayOnce,
  type EventBus,
} from "./src/outbox";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS orders (
    id serial primary key,
    user_id int not null,
    amount_cents int not null,
    status text not null default 'new'
  );
  CREATE TABLE IF NOT EXISTS outbox (
    id bigserial primary key,
    aggregate_id int not null,
    type text not null,
    payload jsonb not null,
    created_at timestamptz default now(),
    published_at timestamptz
  );
  CREATE TABLE IF NOT EXISTS inbox (
    processed_key text primary key,
    processed_at timestamptz default now()
  );
`;

function spyBus() {
  const published: Array<{ id: string; type: string; payload: unknown }> = [];
  const bus: EventBus = {
    publish: vi.fn(async (event) => {
      published.push(event);
    }),
  };
  return { bus, published };
}

describe.skipIf(!HAS_DB)("transactional outbox (real PostgreSQL)", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    await pool.query(SCHEMA);
  });

  beforeEach(async () => {
    await pool.query(`TRUNCATE orders, outbox, inbox RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("commits order + outbox atomically; immediate relay publishes and marks", async () => {
    const { bus, published } = spyBus();
    const { orderId } = await placeOrderWithOutbox(pool, { userId: 7, amountCents: 1999 }, bus);

    expect(orderId).toBeGreaterThan(0);
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ type: "order.placed" });
    expect((published[0].payload as { orderId: number }).orderId).toBe(orderId);

    // marked as published by the inline relay
    const pending = await pool.query(`SELECT count(*)::int AS n FROM outbox WHERE published_at IS NULL`);
    expect(pending.rows[0].n).toBe(0);
  });

  it("a THROWING publisher never loses the event — commit already happened", async () => {
    const failingBus: EventBus = {
      publish: async () => {
        throw new Error("kafka is down");
      },
    };

    const { orderId } = await placeOrderWithOutbox(pool, { userId: 1, amountCents: 500 }, failingBus);

    // state committed...
    const order = await pool.query<{ status: string }>(`SELECT status FROM orders WHERE id=$1`, [orderId]);
    expect(order.rows[0].status).toBe("placed");

    // ...event still pending for the real relay
    const pending = await pool.query(`SELECT count(*)::int AS n FROM outbox WHERE published_at IS NULL`);
    expect(pending.rows[0].n).toBe(1);

    // later, the relay succeeds — no data was lost in the gap
    const { bus, published } = spyBus();
    const relayed = await relayOnce(pool, bus);
    expect(relayed).toBe(1);
    expect((published[0].payload as { orderId: number }).orderId).toBe(orderId);
  });

  it("concurrent relays never publish duplicates (SKIP LOCKED claims)", async () => {
    const { bus, published } = spyBus();
    // seed three pending events without an inline relay
    for (const amount of [100, 200, 300]) {
      await placeOrderWithOutbox(pool, { userId: 1, amountCents: amount }, {
        publish: async () => {
          throw new Error("inline relay disabled");
        },
      });
    }
    void bus;

    const relayBus = spyBus();
    await Promise.all([
      relayOnce(pool, relayBus.bus),
      relayOnce(pool, relayBus.bus),
      relayOnce(pool, relayBus.bus),
    ]);

    expect(relayBus.published).toHaveLength(3);
    const ids = relayBus.published.map((e) => e.id);
    expect(new Set(ids).size).toBe(3); // each event exactly once

    const pending = await pool.query(`SELECT count(*)::int AS n FROM outbox WHERE published_at IS NULL`);
    expect(pending.rows[0].n).toBe(0);
  });

  it("relayOnce with nothing pending is a no-op returning zero", async () => {
    const { bus, published } = spyBus();
    expect(await relayOnce(pool, bus)).toBe(0);
    expect(published).toEqual([]);
  });
});

describe.skipIf(!HAS_DB)("idempotent consumer (inbox pattern)", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    await pool.query(SCHEMA);
  });

  beforeEach(async () => {
    await pool.query(`TRUNCATE orders, outbox, inbox RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("processes once, then reports duplicate without re-running the handler", async () => {
    const handler = vi.fn(async () => {});
    const event = { id: "evt-1", type: "order.placed", payload: { orderId: 1 } };

    await expect(consumeIdempotent(pool, event, handler)).resolves.toBe("processed");
    await expect(consumeIdempotent(pool, event, handler)).resolves.toBe("duplicate");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("releases the claim when the handler throws, enabling retry", async () => {
    let attempts = 0;
    const flaky = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw new Error("transient");
    });

    const event = { id: "evt-2", type: "order.placed", payload: {} };

    await expect(consumeIdempotent(pool, event, flaky)).rejects.toThrow("transient");
    await expect(consumeIdempotent(pool, event, flaky)).resolves.toBe("processed");

    expect(flaky).toHaveBeenCalledTimes(2);
  });

  it("different event ids are independent claims", async () => {
    const handler = vi.fn(async () => {});
    await consumeIdempotent(pool, { id: "a", type: "t", payload: null }, handler);
    await consumeIdempotent(pool, { id: "b", type: "t", payload: null }, handler);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("end-to-end: outbox events consumed idempotently even when delivered twice", async () => {
    const deferredBus: EventBus = {
      publish: async () => {
        throw new Error("defer");
      },
    };
    const { orderId } = await placeOrderWithOutbox(
      pool,
      { userId: 3, amountCents: 700 },
      deferredBus,
    );

    const { bus, published } = spyBus();
    await relayOnce(pool, bus);
    const first = published[0];

    const handledPayloads: unknown[] = [];
    const deliver = () =>
      consumeIdempotent(pool, first, async (payload) => {
        handledPayloads.push(payload);
      });

    expect(await deliver()).toBe("processed");
    expect(await deliver()).toBe("duplicate"); // redelivery from crash-window

    expect(handledPayloads).toHaveLength(1);
    expect((handledPayloads[0] as { orderId: number }).orderId).toBe(orderId);
  });
});
