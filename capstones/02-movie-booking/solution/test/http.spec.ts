import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import type { BookingDto, HoldCreatedDto } from "../src/http/holds.controller";
import type { SeatRow } from "../src/http/showings.controller";
import { bootHttp, drain, START_ISO, TTL_MS } from "./support/test-app";

let current: Awaited<ReturnType<typeof bootHttp>> | undefined;

async function rig() {
  current = await bootHttp();
  return current;
}

afterEach(async () => {
  if (current) {
    await drain(current);
    current = undefined;
  }
});

function client() {
  if (!current) {
    throw new Error("test bug: call rig() before using request helpers");
  }
  return request(current.url);
}

async function holdSeats(showingId: string, seatRefs: string[], userId = "user-1") {
  const res = await client()
    .post(`/showings/${showingId}/holds`)
    .send({ userId, seatRefs });
  return res as { status: number; body: HoldCreatedDto & { type?: string } };
}

async function confirmHold(holdId: string, idempotencyKey: string, cardNumber: string) {
  const res = await client()
    .post(`/holds/${holdId}/confirm`)
    .send({ idempotencyKey, card: { number: cardNumber } });
  return res as { status: number; headers: Record<string, string>; body: BookingDto & { type?: string; detail?: string } };
}

function bookedSeats(body: SeatRow[]): string[] {
  return body.filter((r) => r.status === "booked").map((r) => r.seatRef);
}

describe("health", () => {
  it("reports ok on /healthz and /readyz in memory mode", async () => {
    await rig();
    expect((await client().get("/healthz")).status).toBe(200);
    const ready = await client().get("/readyz");
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: "ok", store: "memory" });
  });
});

describe("catalog browsing", () => {
  it("serves the deterministic seed: movies -> showings -> seats", async () => {
    await rig();
    const movies = await client().get("/movies");
    expect(movies.status).toBe(200);
    expect(movies.body).toEqual([
      { id: "seed-movie-1", title: "The Matrix" },
      { id: "seed-movie-2", title: "Spirited Away" },
    ]);

    const showings = await client().get("/movies/seed-movie-2/showings");
    expect(showings.status).toBe(200);
    expect(showings.body).toEqual([
      {
        id: "seed-showing-2",
        movieId: "seed-movie-2",
        startsAt: "2026-09-16T14:00:00.000Z",
        rows: 3,
        cols: 4,
        seatCount: 12,
        priceCents: 900,
      },
    ]);

    const seats = await client().get("/showings/seed-showing-1/seats");
    expect(seats.status).toBe(200);
    expect(seats.body).toHaveLength(25); // 5x5 grid
    expect(seats.body.every((row: SeatRow) => row.status === "available")).toBe(true);
    expect(seats.body[0].seatRef).toBe("A1");
  });

  it("404s unknown movies/showings as problem+json", async () => {
    await rig();
    const res = await client().get("/movies/nope/showings");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body.type).toBe("https://backend-mastery.dev/problems/movie-not-found");
    expect(res.body.instance).toBe("/movies/nope/showings");

    const seats = await client().get("/showings/nope/seats");
    expect(seats.status).toBe(404);
    expect(seats.body.type).toContain("showing-not-found");
  });
});

describe("the full booking tour over HTTP", () => {
  it("hold -> confirm books seats end to end with server-side totals", async () => {
    await rig();

    const holdRes = await holdSeats("seed-showing-2", ["A1", "A2"]);
    expect(holdRes.status).toBe(201);
    expect(Date.parse(holdRes.body.expiresAt)).toBe(Date.parse(START_ISO) + TTL_MS);

    const held = await client().get("/showings/seed-showing-2/seats");
    expect(held.body.filter((r: SeatRow) => r.status === "held").map((r: SeatRow) => r.seatRef)).toEqual(["A1", "A2"]);

    const confirmRes = await confirmHold(holdRes.body.holdId, "tour-key", "4242424242424242");
    expect(confirmRes.status).toBe(201);
    expect(confirmRes.headers.location).toBe(`/bookings/${confirmRes.body.bookingId}`);
    // Client sent NO amount anywhere; the server computed 900 x 2.
    expect(confirmRes.body.totalCents).toBe(1800);
    expect(confirmRes.body.state).toBe("CONFIRMED");

    const seats = await client().get("/showings/seed-showing-2/seats");
    expect(bookedSeats(seats.body)).toEqual(["A1", "A2"]);
  });

  it("two simultaneous holds on one seat: exactly one 201 and one 409 SEAT_HELD", async () => {
    await rig();
    const [a, b] = await Promise.allSettled([
      client().post("/showings/seed-showing-1/holds").send({ userId: "racer", seatRefs: ["B3"] }),
      client().post("/showings/seed-showing-1/holds").send({ userId: "racer-2", seatRefs: ["B3"] }),
    ]);
    const statuses = [a, b].map((res) =>
      res.status === "fulfilled" ? res.value.status : `rejected:${String(res.reason)}`,
    );
    expect([...statuses].sort()).toEqual([201, 409]);

    const conflict = [a, b].find((res) => res.status === "fulfilled" && res.value.status === 409);
    if (!conflict || conflict.status !== "fulfilled") {
      throw new Error("expected a 409 response");
    }
    expect(conflict.value.headers["content-type"]).toContain("application/problem+json");
    expect(conflict.value.body.type).toBe("https://backend-mastery.dev/problems/seat-held");
    expect(conflict.value.headers["x-request-id"]).toBeTruthy();
  });

  it("ten racers on one seat yield exactly one winner", async () => {
    await rig();
    const attempts = Array.from({ length: 10 }, (_, i) =>
      client()
        .post("/showings/seed-showing-1/holds")
        .send({ userId: `racer-${i}`, seatRefs: ["E5"] }),
    );
    const responses = (await Promise.all(attempts)) as { status: number }[];
    expect(responses.filter((res) => res.status === 201)).toHaveLength(1);
    expect(responses.filter((res) => res.status === 409)).toHaveLength(9);
  });

  it("replaying an idempotency key returns 200 with the SAME bookingId", async () => {
    await rig();
    const hold = await holdSeats("seed-showing-1", ["D2"]);
    const first = await confirmHold(hold.body.holdId, "same-key", "4242424242424242");
    const replay = await confirmHold(hold.body.holdId, "same-key", "4242424242424242");

    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.body.bookingId).toBe(first.body.bookingId);
    expect(current?.gateway.calls).toBe(1);
  });

  it("confirming an expired hold returns 410 HOLD_EXPIRED and frees the seats", async () => {
    const { clock } = await rig();
    const hold = await holdSeats("seed-showing-1", ["C5"]);

    clock.advance(TTL_MS + 1_000);
    const gone = await confirmHold(hold.body.holdId, "late-key", "4242424242424242");
    expect(gone.status).toBe(410);
    expect(gone.body.type).toBe("https://backend-mastery.dev/problems/hold-expired");

    const seats = await client().get("/showings/seed-showing-1/seats");
    expect(seats.body.find((r: SeatRow) => r.seatRef === "C5").status).toBe("available");
  });

  it("a declined card yields 402 AND the seats are immediately re-holdable", async () => {
    await rig();
    const hold = await holdSeats("seed-showing-1", ["B1"], "buyer");

    const declined = await confirmHold(hold.body.holdId, "decline-key", "4000000000000002");
    expect(declined.status).toBe(402);
    expect(declined.body.type).toBe("https://backend-mastery.dev/problems/payment-declined");

    const retry = await holdSeats("seed-showing-1", ["B1"], "second-chance");
    expect(retry.status).toBe(201);
  });

  it("unknown seat refs are rejected with 400 UNKNOWN_SEAT", async () => {
    await rig();
    const res = await holdSeats("seed-showing-2", ["Z9"]);
    expect(res.status).toBe(400);
    expect(res.body.type).toContain("unknown-seat");
  });

  it("DELETE /holds/:id frees the seats; repeating is still 204", async () => {
    await rig();
    const hold = await holdSeats("seed-showing-1", ["A4"]);

    const del = await client().delete(`/holds/${hold.body.holdId}`);
    expect(del.status).toBe(204);

    const seats = await client().get("/showings/seed-showing-1/seats");
    expect(seats.body.find((r: SeatRow) => r.seatRef === "A4").status).toBe("available");

    const again = await client().delete(`/holds/${hold.body.holdId}`);
    expect(again.status).toBe(204);

    const confirmAfterRelease = await confirmHold(hold.body.holdId, "post-delete-key", "4242424242424242");
    expect(confirmAfterRelease.status).toBe(410);
    expect(confirmAfterRelease.body.type).toContain("hold-released");
  });
});

describe("cross-cutting", () => {
  it("echoes an inbound X-Request-Id and mints one when absent", async () => {
    await rig();
    const echoed = await client().get("/healthz").set("X-Request-Id", "trace-42");
    expect(echoed.headers["x-request-id"]).toBe("trace-42");

    const fresh = await client().get("/healthz");
    expect(fresh.headers["x-request-id"]).toMatch(/[0-9a-f-]{36}/);
  });

  it("renders malformed input as problem+json, not a stack trace", async () => {
    await rig();
    const res = await client()
      .post("/showings/seed-showing-1/holds")
      .send({ userId: "user-1", seatRefs: "not-an-array" });
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect((res.body as { type: string }).type).toContain("seat-refs-required");
  });
});
