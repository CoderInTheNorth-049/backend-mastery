import type { Pool } from "pg";

export const DEADLOCK_CODE = "40P01";

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function isDeadlock(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === DEADLOCK_CODE
  );
}

/** Retries ONLY pg deadlocks; everything else surfaces immediately. */
export async function withDeadlockRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isDeadlock(error)) throw error;
      lastError = error;
    }
  }

  throw lastError;
}

/**
 * Pessimistic: lock the row first, decide while nobody else can.
 * The FOR UPDATE lock serializes contenders; losers simply observe 'held'.
 */
export async function reserveSeatPessimistic(
  pool: Pool,
  seatId: number,
  holder: string,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ status: string }>(
      `SELECT status FROM "Seat" WHERE id = $1 FOR UPDATE`,
      [seatId],
    );

    let reserved = false;
    if (rows[0]?.status === "free") {
      await client.query(
        `UPDATE "Seat"
           SET status = 'held',
               "heldBy" = $2,
               "heldUntil" = now() + interval '15 minutes',
               version = version + 1
         WHERE id = $1`,
        [seatId, holder],
      );
      reserved = true;
    }

    await client.query("COMMIT");
    return reserved;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Optimistic: try the conditional write; a zero-row result means someone
 * won between our read and write — retry on a FRESH transaction so we see
 * their committed state.
 */
export async function reserveSeatOptimistic(
  pool: Pool,
  seatId: number,
  holder: string,
  maxRetries = 5,
): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query<{ status: string; version: number }>(
        `SELECT status, version FROM "Seat" WHERE id = $1`,
        [seatId],
      );
      const seat = rows[0];

      if (!seat || seat.status !== "free") {
        await client.query("COMMIT");
        return false; // decided — retries can't change it
      }

      const result = await client.query(
        `UPDATE "Seat"
             SET status = 'held',
                 "heldBy" = $2,
                 "heldUntil" = now() + interval '15 minutes',
                 version = version + 1
           WHERE id = $1 AND version = $3 AND status = 'free'`,
        [seatId, holder, seat.version],
      );

      if ((result.rowCount ?? 0) === 1) {
        await client.query("COMMIT");
        return true;
      }

      // Lost the race this round; commit the no-op and re-read fresh state.
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  return false; // contention never resolved in our favor
}

/**
 * Deadlock-proof by construction: BOTH account rows are locked in one
 * statement ordered by id. A canonical global acquisition order makes the
 * circular-wait pattern structurally impossible, so withDeadlockRetry is a
 * safety net (e.g. planner surprises), not the primary defense.
 */
export async function transferWithRetry(
  pool: Pool,
  fromId: number,
  toId: number,
  amountCents: number,
): Promise<void> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new DomainError("invalid-amount", "amount must be positive integer cents");
  }

  await withDeadlockRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const lowId = Math.min(fromId, toId);
      const highId = Math.max(fromId, toId);

      const { rows } = await client.query<{
        id: number;
        balance: number;
      }>(
        `SELECT id, balance FROM "Account" WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`,
        [lowId, highId],
      );

      const byId = new Map(rows.map((r) => [r.id, r]));
      const from = byId.get(fromId);
      const to = byId.get(toId);

      if (!from || !to) {
        throw new DomainError(
          "account-not-found",
          `missing account(s): ${!from ? fromId : ""} ${!to ? toId : ""}`.trim(),
        );
      }
      if (from.balance < amountCents) {
        throw new DomainError("insufficient-funds", `account ${fromId} cannot cover ${amountCents}`);
      }

      await client.query(`UPDATE "Account" SET balance = balance - $1 WHERE id = $2`, [
        amountCents,
        fromId,
      ]);
      await client.query(`UPDATE "Account" SET balance = balance + $1 WHERE id = $2`, [
        amountCents,
        toId,
      ]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  });
}
