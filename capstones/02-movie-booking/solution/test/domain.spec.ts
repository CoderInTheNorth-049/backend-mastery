import { describe, expect, it } from "vitest";
import { BookingService } from "../src/domain/booking-service";
import {
  BadRequestError,
  ConflictError,
  DomainError,
  GoneError,
  PaymentDeclinedError,
} from "../src/domain/errors";
import { HoldService } from "../src/domain/hold-service";
import { SweepService } from "../src/domain/sweep-service";
import { FakeClock } from "../src/infra/clocks";
import { MemoryBookingStore } from "../src/infra/memory-booking-store";
import { MemPaymentGateway } from "../src/infra/payment-gateway";
import { CountingPaymentGateway, START_ISO, TTL_MS } from "./support/test-app";

interface Rig {
  clock: FakeClock;
  store: MemoryBookingStore;
  gateway: MemPaymentGateway;
  holds: HoldService;
  bookings: BookingService;
  sweep: SweepService;
}

function rig(): Rig {
  const clock = new FakeClock(START_ISO);
  const store = new MemoryBookingStore(clock);
  const gateway = new MemPaymentGateway();
  return {
    clock,
    store,
    gateway,
    holds: new HoldService(store, clock, TTL_MS),
    bookings: new BookingService(store, clock, gateway),
    sweep: new SweepService(store),
  };
}

async function seatStates(rig_: Rig, showingId: string): Promise<Map<string, string>> {
  return rig_.store.tx((txv) => txv.seatStates(showingId));
}

async function expectDomainError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    expect.fail(`expected ${code}`);
  } catch (err) {
    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe(code);
  }
}

describe("HoldService", () => {
  it("creates an ACTIVE hold whose expiry is now + HOLD_TTL_MS", async () => {
    const r = rig();
    const hold = await r.holds.create("seed-showing-1", ["A1", "A2"], "user-1");
    expect(hold.state).toBe("ACTIVE");
    expect(hold.expiresAt.getTime()).toBe(Date.parse(START_ISO) + TTL_MS);
    const states = await seatStates(r, "seed-showing-1");
    expect(states.get("A1")).toBe("held");
    expect(states.get("B1")).toBe("available");
  });

  it("rejects a second hold on a taken seat with SEAT_HELD", async () => {
    const r = rig();
    await r.holds.create("seed-showing-1", ["C3"], "user-1");
    await expectDomainError(r.holds.create("seed-showing-1", ["C3"], "user-2"), "SEAT_HELD");
  });

  it("rejects unknown seat refs with a 400-shaped error", async () => {
    const r = rig();
    // seed-showing-2 is a 3x4 grid, so E1 does not exist.
    await expectDomainError(r.holds.create("seed-showing-2", ["E1"], "user-1"), "UNKNOWN_SEAT");
    const err = await r.holds.create("seed-showing-2", ["E1"], "user-1").catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestError);
  });

  it("rejects duplicate refs inside one request", async () => {
    const r = rig();
    await expectDomainError(r.holds.create("seed-showing-1", ["A1", "A1"], "user-1"), "DUPLICATE_SEAT");
  });

  it("treats an ACTIVE hold past its TTL as non-blocking (lazy expiry on read)", async () => {
    const r = rig();
    await r.holds.create("seed-showing-1", ["D4"], "user-1");
    r.clock.advance(TTL_MS + 1);
    const states = await seatStates(r, "seed-showing-1");
    expect(states.get("D4")).toBe("available");
  });
});

describe("SweepService", () => {
  it("flips past-due ACTIVE holds to EXPIRED and frees their seats", async () => {
    const r = rig();
    const dying = await r.holds.create("seed-showing-1", ["B5"], "user-2");
    r.clock.advance(TTL_MS - 60_000);
    await r.holds.create("seed-showing-1", ["A5"], "user-1"); // expires a full TTL later

    expect(await r.sweep.sweepExpired(r.clock.now())).toBe(0);

    r.clock.advance(120_000); // past the first hold's expiry only
    expect(await r.sweep.sweepExpired(r.clock.now())).toBe(1);

    const states = await seatStates(r, "seed-showing-1");
    expect(states.get("B5")).toBe("available"); // swept
    expect(states.get("A5")).toBe("held"); // still within TTL

    await expectDomainError(r.bookings.confirm(dying.holdId, "key-dying", "4242424242424242"), "HOLD_EXPIRED");
  });
});

describe("BookingService.confirm", () => {
  it("charges the SERVER-SIDE total (price x seats) and books the seats", async () => {
    const r = rig();
    const hold = await r.holds.create("seed-showing-2", ["B1", "B2", "B3"], "user-1");
    const result = await r.bookings.confirm(hold.holdId, "key-1", "4242424242424242");

    if (result.kind !== "created") {
      throw new Error("expected a fresh booking");
    }
    expect(result.booking.totalCents).toBe(900 * 3);
    expect(result.booking.state).toBe("CONFIRMED");
    const states = await seatStates(r, "seed-showing-2");
    expect(states.get("B1")).toBe("booked");
    expect(states.get("B2")).toBe("booked");
    expect(states.get("B3")).toBe("booked");
  });

  it("returns the ORIGINAL booking on idempotency-key replay and never charges twice", async () => {
    const r = rig();
    const gateway = new CountingPaymentGateway();
    const bookings = new BookingService(r.store, r.clock, gateway);
    const hold = await r.holds.create("seed-showing-1", ["E5"], "user-1");
    const first = await bookings.confirm(hold.holdId, "replay-key", "4242424242424242");
    const second = await bookings.confirm(hold.holdId, "replay-key", "4242424242424242");

    if (first.kind !== "created" || second.kind !== "replayed") {
      throw new Error(`unexpected kinds: ${first.kind}, ${second.kind}`);
    }
    expect(second.booking.bookingId).toBe(first.booking.bookingId);
    expect(second.booking.idempotencyKey).toBe("replay-key");
    expect(gateway.calls).toBe(1);
  });

  it("fails a confirm of an expired hold with HOLD_EXPIRED (410)", async () => {
    const r = rig();
    const hold = await r.holds.create("seed-showing-1", ["C1"], "user-1");
    r.clock.advance(TTL_MS + 1);
    const err = await r.bookings.confirm(hold.holdId, "k", "4242424242424242").catch((e) => e);
    expect(err).toBeInstanceOf(GoneError);
    expect((err as GoneError).code).toBe("HOLD_EXPIRED");
    expect((err as GoneError).status).toBe(410);
  });

  it("on decline: throws 402 AND releases the seats atomically (they are re-holdable)", async () => {
    const r = rig();
    const hold = await r.holds.create("seed-showing-1", ["A3"], "user-1");
    const err = await r.bookings.confirm(hold.holdId, "decline-key", "1111222233334444").catch((e) => e);

    expect(err).toBeInstanceOf(PaymentDeclinedError);
    expect((err as PaymentDeclinedError).status).toBe(402);
    expect((await seatStates(r, "seed-showing-1")).get("A3")).toBe("available");

    const again = await r.holds.create("seed-showing-1", ["A3"], "user-2");
    expect(again.state).toBe("ACTIVE");
  });

  it("refuses a second confirm of an already-CONFIRMED hold under a different key", async () => {
    const r = rig();
    const hold = await r.holds.create("seed-showing-2", ["A1"], "user-1");
    await r.bookings.confirm(hold.holdId, "key-a", "4242424242424242");
    await expectDomainError(r.bookings.confirm(hold.holdId, "key-b", "4242424242424242"), "HOLD_ALREADY_CONFIRMED");
  });

  it("validates required input", async () => {
    const r = rig();
    const err = await r.bookings.confirm("whatever", "", "4242424242424242").catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestError);
  });
});

describe("HoldService.release", () => {
  it("frees seats on release and is idempotent for already-freed holds", async () => {
    const r = rig();
    const hold = await r.holds.create("seed-showing-1", ["B2"], "user-1");
    expect(await r.holds.release(hold.holdId)).toBe("released");
    expect((await seatStates(r, "seed-showing-1")).get("B2")).toBe("available");
    expect(await r.holds.release(hold.holdId)).toBe("noop");
  });

  it("refuses to release a CONFIRMED hold", async () => {
    const r = rig();
    const hold = await r.holds.create("seed-showing-1", ["B4"], "user-1");
    await r.bookings.confirm(hold.holdId, "k", "4242424242424242");
    const err = await r.holds.release(hold.holdId).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect((err as ConflictError).code).toBe("HOLD_ALREADY_CONFIRMED");
  });
});
