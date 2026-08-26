import { randomUUID } from "node:crypto";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";
import type { BookingStore, Clock, Hold } from "./types";

const SEAT_REF_RE = /^[A-Z]\d+$/;

/**
 * Holds seats for a user until expiresAt. All checks and writes happen inside
 * ONE store transaction, so "check then insert" cannot race with another
 * request doing the same thing.
 */
export class HoldService {
  constructor(
    private readonly store: BookingStore,
    private readonly clock: Clock,
    private readonly holdTtlMs: number,
  ) {}

  async create(showingId: string, seatRefs: unknown, userId: unknown): Promise<Hold> {
    if (typeof userId !== "string" || userId.trim() === "") {
      throw new BadRequestError("USER_ID_REQUIRED", "body.userId must be a non-empty string.");
    }
    if (!Array.isArray(seatRefs) || seatRefs.length === 0 || !seatRefs.every((s) => typeof s === "string")) {
      throw new BadRequestError(
        "SEAT_REFS_REQUIRED",
        'body.seatRefs must be a non-empty array of seat references like ["A1"].',
      );
    }
    const refs = [...new Set(seatRefs)];
    if (refs.length !== seatRefs.length) {
      throw new BadRequestError("DUPLICATE_SEAT", "body.seatRefs contains the same seat more than once.");
    }
    if (!refs.every((r) => SEAT_REF_RE.test(r))) {
      throw new BadRequestError("UNKNOWN_SEAT", `Seat references must look like A1..E25, got: ${refs.join(", ")}.`);
    }

    return this.store.tx(async (txv) => {
      // Lazy expiry on write: past-due ACTIVE holds stop blocking seats even
      // before the sweep job has run (build-guide M4 wants both paths).
      await txv.expireHolds(this.clock.now());
      const showing = await txv.getShowing(showingId);
      if (!showing) {
        throw new NotFoundError("SHOWING_NOT_FOUND", `No showing with id ${showingId}.`);
      }
      const unknown = refs.filter((ref) => !showing.seatRefs.includes(ref));
      if (unknown.length > 0) {
        throw new BadRequestError("UNKNOWN_SEAT", `Seat(s) ${unknown.join(", ")} do not exist on showing ${showingId}.`);
      }
      const states = await txv.seatStates(showingId);
      const taken = refs.filter((ref) => states.get(ref) !== "available");
      if (taken.length > 0) {
        throw new ConflictError("SEAT_HELD", `Seat(s) ${taken.join(", ")} are already held or booked.`);
      }
      const hold: Hold = {
        holdId: randomUUID(),
        showingId,
        seatRefs: refs,
        userId,
        expiresAt: new Date(this.clock.now().getTime() + this.holdTtlMs),
        state: "ACTIVE",
      };
      await txv.createHold(hold);
      return hold;
    });
  }

  /** Returns "released" | "noop" (already expired/released); throws only for real mistakes. */
  async release(holdId: string): Promise<"released" | "noop"> {
    if (typeof holdId !== "string" || holdId === "") {
      throw new BadRequestError("HOLD_ID_REQUIRED", "hold id path parameter is required.");
    }
    return this.store.tx(async (txv) => {
      const hold = await txv.getHold(holdId);
      if (!hold) {
        throw new NotFoundError("HOLD_NOT_FOUND", `No hold with id ${holdId}.`);
      }
      if (hold.state === "CONFIRMED") {
        throw new ConflictError("HOLD_ALREADY_CONFIRMED", `Hold ${holdId} already became a booking.`);
      }
      if (hold.state === "ACTIVE") {
        await txv.releaseHold(holdId);
        return "released" as const;
      }
      // EXPIRED / RELEASED holds already freed their seats: idempotent DELETE.
      return "noop" as const;
    });
  }
}
