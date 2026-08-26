import { randomUUID } from "node:crypto";
import {
  BadRequestError,
  ConflictError,
  GoneError,
  NotFoundError,
  PaymentDeclinedError,
} from "./errors";
import type { Booking, BookingStore, ChargeRequest, Clock, PaymentGateway } from "./types";

/**
 * Converts an ACTIVE hold into a CONFIRMED booking. The money math happens
 * HERE, server-side, from showing.priceCents - the client never sends amounts.
 *
 * Decline semantics (the subtle part): the payment gateway is called INSIDE
 * the transaction closure, but its refusal is translated into a result object
 * instead of an exception, so the adapter can COMMIT the hold release. The
 * HTTP 402 is thrown only after the release is durably committed - a declined
 * card and freed seats can never be observed apart.
 */
export interface ConfirmOutcome {
  kind: "created" | "replayed";
  booking: Booking;
}

export class BookingService {
  constructor(
    private readonly store: BookingStore,
    private readonly clock: Clock,
    private readonly gateway: PaymentGateway,
  ) {}

  async confirm(holdId: string, idempotencyKey: unknown, cardNumber: unknown): Promise<ConfirmOutcome> {
    if (typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
      throw new BadRequestError("IDEMPOTENCY_KEY_REQUIRED", "body.idempotencyKey must be a non-empty string.");
    }
    if (typeof cardNumber !== "string" || cardNumber.trim() === "") {
      throw new BadRequestError("CARD_REQUIRED", "body.card.number must be a non-empty string.");
    }

    type TxConfirmResult =
      | { kind: "created"; booking: Booking }
      | { kind: "replayed"; booking: Booking }
      | { kind: "declined"; reason?: string };

    const result = await this.store.tx(async (txv): Promise<TxConfirmResult> => {
      const hold = await txv.getHold(holdId);
      if (!hold) {
        throw new NotFoundError("HOLD_NOT_FOUND", `No hold with id ${holdId}.`);
      }

      // Idempotency replay lookup BEFORE anything else: a retry after a lost
      // response (or after the hold quietly expired mid-retry) must still
      // return the ORIGINAL booking, not a fresh error.
      const existing = await txv.findBookingByIdempotencyKey(idempotencyKey);
      if (existing) {
        return { kind: "replayed", booking: existing };
      }

      if (hold.state === "ACTIVE" && hold.expiresAt.getTime() <= this.clock.now().getTime()) {
        await txv.expireHolds(this.clock.now());
        throw new GoneError("HOLD_EXPIRED", `Hold ${holdId} expired at ${hold.expiresAt.toISOString()}.`);
      }
      if (hold.state === "EXPIRED") {
        throw new GoneError("HOLD_EXPIRED", `Hold ${holdId} has expired.`);
      }
      if (hold.state === "RELEASED") {
        throw new GoneError("HOLD_RELEASED", `Hold ${holdId} was released; hold the seats again first.`);
      }
      if (hold.state === "CONFIRMED") {
        throw new ConflictError("HOLD_ALREADY_CONFIRMED", `Hold ${holdId} already became a booking.`);
      }

      const showing = await txv.getShowing(hold.showingId);
      if (!showing) {
        throw new NotFoundError("SHOWING_NOT_FOUND", `Showing ${hold.showingId} vanished mid-confirm.`);
      }
      const totalCents = showing.priceCents * hold.seatRefs.length;

      const charge: ChargeRequest = {
        showingId: showing.id,
        holdId,
        amountCents: totalCents,
        idempotencyKey,
        cardNumber,
      };
      const outcome = await this.gateway.charge(charge);
      if (!outcome.approved) {
        await txv.releaseHold(holdId); // same critical section: decline => seats free, atomically
        return { kind: "declined", reason: outcome.declineReason };
      }

      const booking: Booking = {
        bookingId: randomUUID(),
        holdId,
        seatRefs: [...hold.seatRefs],
        totalCents,
        idempotencyKey,
        state: "CONFIRMED",
      };
      await txv.confirmHold(holdId);
      await txv.createBooking(booking);
      return { kind: "created", booking };
    });

    if (result.kind === "declined") {
      throw new PaymentDeclinedError(result.reason ? `Card declined (${result.reason}).` : undefined);
    }
    return { kind: result.kind, booking: result.booking };
  }
}
