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
import type { CatalogSeed } from "./seed";
import { seedCatalog } from "./seed";

interface MemoryTables {
  movies: Map<string, Movie>;
  showings: Map<string, Showing>;
  holds: Map<string, Hold>;
  bookings: Map<string, Booking>;
  bookingsByIdempotencyKey: Map<string, string>;
}

/**
 * In-memory BookingStore.
 *
 * HOW IT MODELS `SELECT ... FOR UPDATE`: every tx() is funneled through a
 * single promise chain, so at most one transaction body runs at any moment
 * and later transactions observe earlier ones' writes in full - the same
 * serialization Postgres gives the pg adapter via row locks on the showing
 * (see db/migrations/0001_init.sql, "THE SENIOR MOVE #2"). That lets the
 * concurrency suite prove the DOMAIN logic identically offline and against
 * real Postgres.
 *
 * The trade-off vs pg: no durability and no DB-level unique-index backstop -
 * correctness here rests entirely on the serialized chain.
 */
export class MemoryBookingStore implements BookingStore {
  private readonly tables: MemoryTables;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly clock: Clock,
    seed: CatalogSeed = seedCatalog(),
  ) {
    this.tables = {
      movies: new Map(seed.movies.map((m) => [m.id, m])),
      showings: new Map(seed.showings.map((s) => [s.id, s])),
      holds: new Map(),
      bookings: new Map(),
      bookingsByIdempotencyKey: new Map(),
    };
  }

  tx<T>(fn: (txv: TxView) => Promise<T>): Promise<T> {
    // Chain on the previous run but swallow its rejection first, so one failed
    // transaction neither corrupts nor starves the ones queued behind it.
    const result = this.tail.then(() => fn(this.buildView()));
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async isReady(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    /* nothing to release */
  }

  private buildView(): TxView {
    const t = this.tables;
    // Shorthand methods below get `this` = the view object, so capture the
    // store's collaborators here.
    const clock = this.clock;
    return {
      async getShowing(showingId) {
        return t.showings.get(showingId);
      },
      async listMovies() {
        return [...t.movies.values()];
      },
      async listShowingsByMovie(movieId) {
        return [...t.showings.values()].filter((s) => s.movieId === movieId);
      },
      async seatStates(showingId) {
        const states = new Map<string, SeatStatus>();
        const showing = t.showings.get(showingId);
        if (!showing) {
          return states;
        }
        for (const ref of showing.seatRefs) {
          states.set(ref, "available");
        }
        // The injected clock (fake in tests) drives lazy expiry, never Date.now().
        const now = clock.now().getTime();
        for (const hold of t.holds.values()) {
          if (hold.showingId !== showingId) {
            continue;
          }
          if (hold.state === "CONFIRMED") {
            for (const ref of hold.seatRefs) {
              states.set(ref, "booked");
            }
          } else if (hold.state === "ACTIVE" && hold.expiresAt.getTime() > now) {
            // Lazy expiry on read: an ACTIVE hold past expiresAt does not
            // block seats even before any sweep has run.
            for (const ref of hold.seatRefs) {
              states.set(ref, "held");
            }
          }
        }
        return states;
      },
      async createHold(hold) {
        t.holds.set(hold.holdId, { ...hold, seatRefs: [...hold.seatRefs] });
      },
      async getHold(holdId) {
        const hold = t.holds.get(holdId);
        return hold ? { ...hold, seatRefs: [...hold.seatRefs] } : undefined;
      },
      async confirmHold(holdId) {
        const hold = t.holds.get(holdId);
        if (!hold || hold.state !== "ACTIVE") {
          throw new Error(`confirmHold precondition failed for ${holdId}`);
        }
        hold.state = "CONFIRMED";
      },
      async releaseHold(holdId) {
        const hold = t.holds.get(holdId);
        if (!hold || hold.state !== "ACTIVE") {
          throw new Error(`releaseHold precondition failed for ${holdId}`);
        }
        hold.state = "RELEASED";
      },
      async expireHolds(now) {
        let expired = 0;
        for (const hold of t.holds.values()) {
          if (hold.state === "ACTIVE" && hold.expiresAt.getTime() <= now.getTime()) {
            hold.state = "EXPIRED";
            expired += 1;
          }
        }
        return expired;
      },
      async findBookingByIdempotencyKey(key) {
        const id = t.bookingsByIdempotencyKey.get(key);
        return id ? t.bookings.get(id) : undefined;
      },
      async createBooking(booking) {
        t.bookings.set(booking.bookingId, booking);
        t.bookingsByIdempotencyKey.set(booking.idempotencyKey, booking.bookingId);
      },
      async listActiveHolds(showingId) {
        const now = clock.now().getTime();
        return [...t.holds.values()].filter(
          (h) => h.showingId === showingId && h.state === "ACTIVE" && h.expiresAt.getTime() > now,
        );
      },
    };
  }
}
