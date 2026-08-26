import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, paginate } from "./cursor";

interface Row {
  id: string;
  ts: string;
}

const T = "2026-01-01T00:00:00.000Z";
const row = (id: string, ts: string = T): Row => ({ id, ts });

describe("cursor codec", () => {
  it("roundtrips through base64url-json", () => {
    const cursor = { ts: T, id: "msg-42" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("returns null for missing or malformed cursors", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ nope: 1 })).toString("base64url"))).toBeNull();
    expect(decodeCursor("!!!not-base64url-json!!!")).toBeNull();
  });
});

describe("paginate", () => {
  const seed: Row[] = [
    row("a", "2025-12-31T23:59:59.000Z"), // oldest
    row("b"), // same ts as c,d: tie-break territory
    row("c"),
    row("d"),
    row("e", "2026-01-01T00:00:05.000Z"), // newest
  ];

  it("orders by (ts, id) descending with a stable tie-break", () => {
    const shuffled = [seed[3], seed[0], seed[4], seed[2], seed[1]];
    const once = paginate(shuffled, { limit: 10 }).page.map((r) => r.id);
    const again = paginate([...shuffled].reverse(), { limit: 10 }).page.map((r) => r.id);
    expect(once).toEqual(["e", "d", "c", "b", "a"]); // e newest; d>c>b by id within equal ts
    expect(again).toEqual(once); // input order never leaks into output order
  });

  it("walks pages via cursor roundtrip and ends with nextCursor null", () => {
    let page = paginate(seed, { limit: 2 });
    expect(page.page.map((r) => r.id)).toEqual(["e", "d"]);

    const cursor = decodeCursor(page.nextCursor as string);
    expect(cursor).toEqual({ ts: T, id: "d" }); // cursor = last row of the page

    page = paginate(seed, { limit: 2, cursor: page.nextCursor });
    expect(page.page.map((r) => r.id)).toEqual(["c", "b"]);
    page = paginate(seed, { limit: 2, cursor: page.nextCursor });
    expect(page.page.map((r) => r.id)).toEqual(["a"]);
    expect(page.nextCursor).toBeNull(); // end of feed is explicit, not an empty page
  });

  it("survives a deleted cursor row by positioning on value", () => {
    const withoutD = seed.filter((r) => r.id !== "d");
    const page = paginate(withoutD, { limit: 2, cursor: encodeCursor({ ts: T, id: "d" }) });
    expect(page.page.map((r) => r.id)).toEqual(["c", "b"]);
  });

  it("treats nonsense limits and cursors defensively", () => {
    expect(paginate(seed, { limit: 0 })).toEqual({ page: [], nextCursor: null });
    expect(paginate(seed, { limit: -5 })).toEqual({ page: [], nextCursor: null });
    expect(paginate(seed, { limit: 2, cursor: "garbage" }).page.map((r) => r.id)).toEqual(["e", "d"]);
  });
});
