import pg from "pg";
import { buildSeatRefs } from "../domain/seats";
import { ConflictError } from "../domain/errors";
import type {
  Booking,
  BookingStore,
  Clock,
  Hold,
  Movie,
  SeatStatus,
  Showing,
  TxView,
} from "../domain/types";

/**
 * PostgreSQL BookingStore - the "real" adapter behind the DATABASE_URL switch.
 *
 * Correctness rests on two database mechanisms (both documented in
 * db/migrations/0001_init.sql):
 *   1. Every mutating tx locks its showing row (`SELECT ... FOR UPDATE`),
 *      serializing hold-vs-hold / hold-vs-confirm races.
 *   2. The partial unique index holds_active_unique backstops that lock: even
 *      a buggy path that skips the lock cannot insert two ACTIVE rows for the
 *      same seat (we map the 23505 violation to ConflictError SEAT_HELD).
 */
export class PgBookingStore implements BookingStore {
  constructor(
    private readonly pool: pg.Pool,
    private readonly clock: Clock,
  ) {}

  static fromUrl(connectionString: string, clock: Clock): PgBookingStore {
    return new PgBookingStore(new pg.Pool({ connectionString }), clock);
  }

  async tx<T>(fn: (txv: TxView) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      try {
        const out = await fn(this.buildView(client));
        await client.query("COMMIT");
        return out;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    } finally {
      client.release();
    }
  }

  async isReady(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private buildView(client: pg.PoolClient): TxView {
    return {
      // THE SENIOR MOVE #2 (pessimistic locking): FOR UPDATE on the showing row
      // queues every other transaction touching this showing behind us.
      async getShowing(showingId): Promise<Showing | undefined> {
        const res = await client.query<ShowingRow>(
          `SELECT id, movie_id, starts_at, num_rows, num_cols, price_cents
             FROM showings WHERE id = $1 FOR UPDATE`,
          [showingId],
        );
        return res.rows[0] ? toShowing(res.rows[0]) : undefined;
      },
      async listMovies(): Promise<Movie[]> {
        const res = await client.query<{ id: string; title: string }>("SELECT id, title FROM movies ORDER BY id");
        return res.rows;
      },
      async listShowingsByMovie(movieId): Promise<Showing[]> {
        const res = await client.query<ShowingRow>(
          `SELECT id, movie_id, starts_at, num_rows, num_cols, price_cents
             FROM showings WHERE movie_id = $1 ORDER BY starts_at`,
          [movieId],
        );
        return res.rows.map(toShowing);
      },
      async seatStates(showingId): Promise<Map<string, SeatStatus>> {
        // The JOIN clause encodes lazy expiry on read: an ACTIVE hold past its
        // expires_at no longer counts as held.
        const res = await client.query<{ seat_ref: string; status: string }>(
          `SELECT s.seat_ref,
                  CASE
                    WHEN h.hold_id IS NULL THEN 'available'
                    WHEN h.state = 'CONFIRMED' THEN 'booked'
                    ELSE 'held'
                  END AS status
             FROM seats s
             LEFT JOIN holds h
               ON h.showing_id = s.showing_id
              AND h.seat_ref = s.seat_ref
              AND (h.state = 'CONFIRMED' OR (h.state = 'ACTIVE' AND h.expires_at > now()))
            WHERE s.showing_id = $1
            ORDER BY s.seat_ref`,
          [showingId],
        );
        return new Map(res.rows.map((r) => [r.seat_ref, r.status as SeatStatus]));
      },
      async createHold(hold) {
        try {
          for (const ref of hold.seatRefs) {
            await client.query(
              `INSERT INTO holds (hold_id, showing_id, seat_ref, user_id, state, expires_at)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [hold.holdId, hold.showingId, ref, hold.userId, hold.state, hold.expiresAt],
            );
          }
        } catch (err) {
          if (isUniqueViolation(err)) {
            // Race backstop fired: another session won this seat between our
            // availability check and our insert.
            throw new ConflictError("SEAT_HELD", "Seat was claimed by a concurrent request.");
          }
          throw err;
        }
      },
      async getHold(holdId): Promise<Hold | undefined> {
        const res = await client.query<HoldRow>(
          `SELECT hold_id, showing_id, user_id, state, max(expires_at) AS expires_at,
                  array_agg(seat_ref ORDER BY seat_ref) AS seat_refs
             FROM holds WHERE hold_id = $1
            GROUP BY hold_id, showing_id, user_id, state`,
          [holdId],
        );
        return res.rows[0] ? toHold(res.rows[0]) : undefined;
      },
      async confirmHold(holdId) {
        await client.query(`UPDATE holds SET state = 'CONFIRMED' WHERE hold_id = $1 AND state = 'ACTIVE'`, [holdId]);
      },
      async releaseHold(holdId) {
        await client.query(`UPDATE holds SET state = 'RELEASED' WHERE hold_id = $1 AND state = 'ACTIVE'`, [holdId]);
      },
      async expireHolds(now) {
        const res = await client.query<{ hold_id: string }>(
          `UPDATE holds SET state = 'EXPIRED'
            WHERE state = 'ACTIVE' AND expires_at <= $1
          RETURNING hold_id`,
          [now],
        );
        return new Set(res.rows.map((r) => r.hold_id)).size;
      },
      async findBookingByIdempotencyKey(key): Promise<Booking | undefined> {
        const res = await client.query<BookingRow>(
          `SELECT b.id, b.hold_id, b.total_cents, b.state, b.idempotency_key,
                  array_agg(bs.seat_ref ORDER BY bs.seat_ref) AS seat_refs
             FROM bookings b
             JOIN booking_seats bs ON bs.booking_id = b.id
            WHERE b.idempotency_key = $1
            GROUP BY b.id`,
          [key],
        );
        return res.rows[0] ? toBooking(res.rows[0]) : undefined;
      },
      async createBooking(booking) {
        await client.query(
          `INSERT INTO bookings (id, hold_id, idempotency_key, total_cents, state)
           VALUES ($1, $2, $3, $4, $5)`,
          [booking.bookingId, booking.holdId, booking.idempotencyKey, booking.totalCents, booking.state],
        );
        for (const ref of booking.seatRefs) {
          await client.query(`INSERT INTO booking_seats (booking_id, seat_ref) VALUES ($1, $2)`, [
            booking.bookingId,
            ref,
          ]);
        }
      },
      async listActiveHolds(showingId) {
        const res = await client.query<HoldRow>(
          `SELECT hold_id, showing_id, max(user_id) AS user_id, state, max(expires_at) AS expires_at,
                  array_agg(seat_ref ORDER BY seat_ref) AS seat_refs
             FROM holds
            WHERE showing_id = $1 AND state = 'ACTIVE' AND expires_at > now()
            GROUP BY hold_id, showing_id, state`,
          [showingId],
        );
        return res.rows.map(toHold);
      },
    };
  }
}

interface ShowingRow {
  id: string;
  movie_id: string;
  starts_at: Date;
  num_rows: number;
  num_cols: number;
  price_cents: number;
}

interface HoldRow {
  hold_id: string;
  showing_id: string;
  user_id: string;
  state: string;
  expires_at: Date;
  seat_refs: string[];
}

interface BookingRow {
  id: string;
  hold_id: string;
  total_cents: number;
  state: string;
  idempotency_key: string;
  seat_refs: string[];
}

function toShowing(row: ShowingRow): Showing {
  return {
    id: row.id,
    movieId: row.movie_id,
    startsAt: row.starts_at.toISOString(),
    rows: row.num_rows,
    cols: row.num_cols,
    seatRefs: buildSeatRefs(row.num_rows, row.num_cols),
    priceCents: row.price_cents,
  };
}

function toHold(row: HoldRow): Hold {
  return {
    holdId: row.hold_id,
    showingId: row.showing_id,
    seatRefs: [...row.seat_refs],
    userId: row.user_id,
    expiresAt: new Date(row.expires_at),
    state: row.state as Hold["state"],
  };
}

function toBooking(row: BookingRow): Booking {
  return {
    bookingId: row.id,
    holdId: row.hold_id,
    seatRefs: [...row.seat_refs],
    totalCents: row.total_cents,
    idempotencyKey: row.idempotency_key,
    state: row.state as Booking["state"],
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}
