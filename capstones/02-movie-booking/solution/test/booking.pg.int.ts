/**
 * Integration spec for the REAL Postgres adapter.
 *
 * Named *.int.ts so the default offline suite never touches it. Run it with a
 * database up:
 *
 *   docker compose up -d postgres
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/movie_booking pnpm test:pg
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { BookingService } from "../src/domain/booking-service";
import { ConflictError } from "../src/domain/errors";
import { HoldService } from "../src/domain/hold-service";
import { PgBookingStore } from "../src/infra/pg-booking-store";
import { MemPaymentGateway } from "../src/infra/payment-gateway";
import { buildSeatRefs } from "../src/domain/seats";

const url = process.env.PG_TEST_URL ?? process.env.DATABASE_URL;

describe.skipIf(!url)("PgBookingStore against real Postgres", () => {
  let pool: pg.Pool;
  let store: PgBookingStore;
  let showingId: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url });
    // Apply the migration exactly as documented (multi-statement simple query).
    const migration = readFileSync(join(__dirname, "..", "db", "migrations", "0001_init.sql"), "utf8");
    await pool.query(migration);

    // Fresh showing per run so reruns are independent of leftover rows.
    showingId = `int-showing-${randomUUID()}`;
    await pool.query("INSERT INTO movies (id, title) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
      `int-movie-${randomUUID()}`,
      "Integration Flick",
    ]);
    const movie = await pool.query("SELECT id FROM movies ORDER BY id DESC LIMIT 1");
    await pool.query(
      `INSERT INTO showings (id, movie_id, starts_at, num_rows, num_cols, price_cents)
       VALUES ($1, $2, now() + interval '7 days', 2, 2, 1000)`,
      [showingId, movie.rows[0].id],
    );
    for (const ref of buildSeatRefs(2, 2)) {
      await pool.query("INSERT INTO seats (showing_id, seat_ref) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
        showingId,
        ref,
      ]);
    }

    store = new PgBookingStore(pool, { now: () => new Date() });
  });

  afterAll(async () => {
    await store.close();
  });

  async function tryHold(seatRef: string, userId: string): Promise<"won" | "conflict"> {
    const holds = new HoldService(store, { now: () => new Date() }, 600_000);
    return holds
      .create(showingId, [seatRef], userId)
      .then(() => "won" as const)
      .catch((err: unknown) => {
        if (err instanceof ConflictError && err.code === "SEAT_HELD") {
          return "conflict" as const;
        }
        throw err;
      });
  }

  it("8 parallel holds on one seat: FOR UPDATE + the partial unique index allow exactly one winner", async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => tryHold("A1", `racer-${i}`)));
    const outcomes = results.map((r) => (r.status === "fulfilled" ? r.value : `rejected:${String(r.reason)}`));
    expect(outcomes.filter((o) => o === "won")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "conflict")).toHaveLength(7);

    const seats = await store.tx((txv) => txv.seatStates(showingId));
    expect(seats.get("A1")).toBe("held");
    expect(seats.get("B2")).toBe("available");
  });

  it("confirm persists; replay from a fresh service instance returns the same booking", async () => {
    const clock = { now: () => new Date() };
    const holds = new HoldService(store, clock, 600_000);
    const hold = await holds.create(showingId, ["B1", "B2"], "user-confirm");

    const confirm = () =>
      new BookingService(store, clock, new MemPaymentGateway()).confirm(hold.holdId, `int-key-${hold.holdId}`, "4242424242424242");

    const first = await confirm();
    if (first.kind !== "created") {
      throw new Error("expected created booking");
    }
    expect(first.booking.totalCents).toBe(2000); // 1000 x 2 seats

    // Fresh instances prove this came from the DATABASE, not memory.
    const replay = await confirm();
    expect(replay.kind).toBe("replayed");
    if (replay.kind === "replayed") {
      expect(replay.booking.bookingId).toBe(first.booking.bookingId);
    }

    const seats = await store.tx((txv) => txv.seatStates(showingId));
    expect(seats.get("B1")).toBe("booked");
    expect(seats.get("B2")).toBe("booked");
  });
});
