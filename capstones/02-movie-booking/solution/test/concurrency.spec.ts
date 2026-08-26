import { describe, expect, it } from "vitest";
import { BookingService } from "../src/domain/booking-service";
import { ConflictError } from "../src/domain/errors";
import { HoldService } from "../src/domain/hold-service";
import { FakeClock } from "../src/infra/clocks";
import { MemoryBookingStore } from "../src/infra/memory-booking-store";
import { MemPaymentGateway } from "../src/infra/payment-gateway";
import { CountingPaymentGateway, START_ISO, TTL_MS } from "./support/test-app";

/**
 * The oversell proof. The memory store serializes transactions through its
 * promise chain (modeling SELECT ... FOR UPDATE), so these races are
 * deterministic; test/booking.pg.int.ts re-runs the same shape against real
 * Postgres row locks.
 */
describe("memory store serialization (models FOR UPDATE)", () => {
  function rig() {
    const clock = new FakeClock(START_ISO);
    const store = new MemoryBookingStore(clock);
    return {
      clock,
      holds: new HoldService(store, clock, TTL_MS),
      bookings: new BookingService(store, clock, new MemPaymentGateway()),
      store,
    };
  }

  it("20 parallel hold attempts on ONE seat: exactly one winner, 19 clean conflicts", async () => {
    const r = rig();
    const attempts = Array.from({ length: 20 }, (_, i) =>
      r.holds
        .create("seed-showing-1", ["C3"], `racer-${i}`)
        .then(() => "won" as const)
        .catch((err: unknown) => {
          if (err instanceof ConflictError && err.code === "SEAT_HELD") {
            return "conflict" as const;
          }
          throw err;
        }),
    );

    const results = await Promise.allSettled(attempts);
    const outcomes = results.map((res) => (res.status === "fulfilled" ? res.value : `rejected:${String(res.reason)}`));
    expect(outcomes.filter((o) => o === "won")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "conflict")).toHaveLength(19);

    // And the winner's seat is held exactly once - no phantom double-hold.
    const states = await r.store.tx((txv) => txv.seatStates("seed-showing-1"));
    expect(states.get("C3")).toBe("held");
    const active = await r.store.tx((txv) => txv.listActiveHolds("seed-showing-1"));
    expect(active).toHaveLength(1);
  });

  it("parallel holds on DISTINCT seats all succeed (no false contention)", async () => {
    const r = rig();
    const seats = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2"];
    const results = await Promise.allSettled(seats.map((seat) => r.holds.create("seed-showing-2", [seat], `u-${seat}`)));
    expect(results.every((res) => res.status === "fulfilled")).toBe(true);
  });

  it("multi-seat holds are all-or-nothing under contention", async () => {
    const r = rig();
    // seed-showing-2 is a 3x4 grid (rows A-C). Both racers want overlapping
    // pairs sharing C2; exactly one pair can win whole.
    const race = await Promise.allSettled([
      r.holds.create("seed-showing-2", ["C1", "C2"], "pair-a"),
      r.holds.create("seed-showing-2", ["C2", "C3"], "pair-b"),
    ]);
    const winners = race.filter((res) => res.status === "fulfilled");
    expect(winners).toHaveLength(1);
    expect(race.some((res) => res.status === "rejected" && res.reason instanceof ConflictError)).toBe(true);

    const states = await r.store.tx((txv) => txv.seatStates("seed-showing-2"));
    // The shared seat is always the winner's; exactly one exclusive seat is held.
    expect(states.get("C2")).toBe("held");
    const exclusives = [states.get("C1"), states.get("C3")];
    expect(exclusives.filter((s) => s === "held")).toHaveLength(1);
    expect(exclusives.filter((s) => s === "available")).toHaveLength(1);
  });

  it("concurrent double-confirm with one key: one charge, same bookingId both ways", async () => {
    const r = rig();
    const gateway = new CountingPaymentGateway();
    const bookings = new BookingService(r.store, r.clock, gateway);
    const hold = await r.holds.create("seed-showing-1", ["E1"], "user-1");

    const [a, b] = await Promise.allSettled([
      bookings.confirm(hold.holdId, "double-click-key", "4242424242424242"),
      bookings.confirm(hold.holdId, "double-click-key", "4242424242424242"),
    ]);
    if (a.status !== "fulfilled" || b.status !== "fulfilled") {
      throw new Error(`confirm race failed: ${JSON.stringify([a.status, b.status])}`);
    }
    expect(a.value.booking.bookingId).toBe(b.value.booking.bookingId);
    expect(new Set([a.value.kind, b.value.kind])).toEqual(new Set(["created", "replayed"]));
    expect(gateway.calls).toBe(1); // money moved exactly once

    const states = await r.store.tx((txv) => txv.seatStates("seed-showing-1"));
    expect(states.get("E1")).toBe("booked");
  });
});
