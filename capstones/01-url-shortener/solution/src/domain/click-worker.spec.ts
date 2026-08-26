import { describe, expect, it, vi } from "vitest";
import type { ClickDrain, ClickEvent, ClickStore } from "./ports";
import { FLUSH_BATCH_SIZE, flushClicks } from "./click-worker";

class BufferQueue implements ClickDrain {
  constructor(private pending: ClickEvent[]) {}
  take(max: number = Number.POSITIVE_INFINITY): ClickEvent[] {
    return this.pending.splice(0, max);
  }
}

function spyStore(): ClickStore & { batches: ClickEvent[][] } {
  const batches: ClickEvent[][] = [];
  return {
    batches,
    bulkInsert: vi.fn(async (events: ClickEvent[]): Promise<void> => {
      batches.push([...events]);
    }),
    aggregateByCode: vi.fn(async (): Promise<{ total: number; last24h: number }> => ({
      total: 0,
      last24h: 0,
    })),
  };
}

const evt = (id: string): ClickEvent => ({ eventId: id, code: "abc", ts: 1 });

describe("flushClicks (worker)", () => {
  it("dedupes by eventId within a flush - first wins", async () => {
    const store = spyStore();
    const result = await flushClicks(new BufferQueue([evt("a"), evt("a"), evt("b")]), store);
    expect(result).toEqual({ inserted: 2 });
    expect(store.batches).toEqual([[evt("a"), evt("b")]]);
  });

  it("splits large buffers into bounded batches", async () => {
    const store = spyStore();
    const events: ClickEvent[] = [evt("1"), evt("2"), evt("3")];
    // Copy: draining splices the queue's buffer, and the assertions below
    // still need the original elements.
    const result = await flushClicks(new BufferQueue([...events]), store, { batchSize: 2 });
    expect(result.inserted).toBe(3);
    expect(store.batches).toEqual([[events[0], events[1]], [events[2]]]);
  });

  it("dedupes across batch boundaries and skips empty inserts", async () => {
    const store = spyStore();
    // "a" reappears in the second batch; the seen-set must suppress it there.
    const result = await flushClicks(new BufferQueue([evt("a"), evt("b"), evt("a")]), store, {
      batchSize: 2,
    });
    expect(result.inserted).toBe(2);
    expect(store.batches).toEqual([[evt("a"), evt("b")]]);
  });

  it("does not insert when the buffer is empty", async () => {
    const store = spyStore();
    await flushClicks(new BufferQueue([]), store);
    expect(store.bulkInsert).not.toHaveBeenCalled();
  });

  it("defaults to a 100-event cap per insert", () => {
    expect(FLUSH_BATCH_SIZE).toBe(100);
  });
});
