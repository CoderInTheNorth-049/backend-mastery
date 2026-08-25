import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DATABASE_URL, HAS_DB } from "../test-support/env";
import {
  reserveSeatOptimistic,
  reserveSeatPessimistic,
  transferWithRetry,
} from "./src/seats";

const CONTESTANTS = Array.from({ length: 8 }, (_, i) => `user-${i}`);

describe.skipIf(!HAS_DB)("seat reservation under real contention", () => {
  let pool: Pool;

  beforeAll(() => {
    // Enough simultaneous clients for the 8-way races.
    pool = new Pool({ connectionString: DATABASE_URL, max: 12 });
  });

  beforeEach(async () => {
    await pool.query(`TRUNCATE "Seat" RESTART IDENTITY CASCADE`);
    for (let i = 1; i <= 5; i++) {
      await pool.query(
        `INSERT INTO "Seat" ("showtimeId", label) VALUES (1, $1)`,
        [`A${i}`],
      );
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  async function seatRow(id: number) {
    const { rows } = await pool.query(
      `SELECT status, "heldBy", version FROM "Seat" WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  it("pessimistic: exactly one of eight concurrent reservers wins", async () => {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM "Seat" WHERE label = 'A3'`,
    );
    const seatId = rows[0].id;

    const results = await Promise.all(
      CONTESTANTS.map((holder) => reserveSeatPessimistic(pool, seatId, holder)),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((r) => !r)).toHaveLength(CONTESTANTS.length - 1);

    const seat = await seatRow(seatId);
    expect(seat.status).toBe("held");
    expect(CONTESTANTS).toContain(seat.heldBy);
    expect(Number(seat.version)).toBe(1);
  });

  it("optimistic: exactly one winner even when everyone starts together", async () => {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM "Seat" WHERE label = 'A4'`,
    );
    const seatId = rows[0].id;

    const results = await Promise.all(
      CONTESTANTS.map((holder) => reserveSeatOptimistic(pool, seatId, holder)),
    );

    expect(results.filter(Boolean)).toHaveLength(1);

    const seat = await seatRow(seatId);
    expect(seat.status).toBe("held");
    expect(Number(seat.version)).toBe(1);
  });

  it("optimistic returns false without retrying decided seats", async () => {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM "Seat" WHERE label = 'A2'`,
    );
    const seatId = rows[0].id;

    expect(await reserveSeatOptimistic(pool, seatId, "first")).toBe(true);

    const spyPool = new Proxy(pool, {});
    const start = Date.now();
    const secondAttempt = await reserveSeatOptimistic(pool, seatId, "second", 5);
    void spyPool;
    expect(secondAttempt).toBe(false);
    expect(Date.now() - start).toBeLessThan(1000); // no retry storm
  });
});

describe.skipIf(!HAS_DB)("transferWithRetry — invariants under chaos", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 12 });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("conerves total balance across 60 overlapping mixed-direction transfers", async () => {
    const pairs: Array<[number, number]> = [
      [1, 2], [2, 1], [2, 3], [3, 2], [1, 3], [3, 1],
    ];

    const transfers = Array.from({ length: 60 }, (_, i) => {
      const [fromId, toId] = pairs[i % pairs.length];
      const amountCents = 13 + (i % 7) * 100;
      return transferWithRetry(pool, fromId, toId, amountCents);
    });

    await Promise.all(transfers);

    const { rows } = await pool.query<{ total: string }>(
      `SELECT SUM(balance) AS total FROM "Account"`,
    );
    expect(Number(rows[0].total)).toBe(300_000); // seeded 3 × 100000

    const negatives = await pool.query(
      `SELECT id FROM "Account" WHERE balance < 0`,
    );
    expect(negatives.rows).toEqual([]);
  }, 20_000);

  it("rejects invalid amounts and unknown accounts with domain errors", async () => {
    await expect(transferWithRetry(pool, 1, 2, 0)).rejects.toMatchObject({
      code: "invalid-amount",
    });
    await expect(transferWithRetry(pool, 1, 999, 500)).rejects.toMatchObject({
      code: "account-not-found",
    });
    await expect(transferWithRetry(pool, 1, 2, 10_000_000)).rejects.toMatchObject({
      code: "insufficient-funds",
    });
  });
});
