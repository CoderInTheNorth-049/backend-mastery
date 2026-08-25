import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sleep, withTimeout } from "./src/timing";
import { createPool, mapLimit } from "./src/pool";

describe("sleep", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves after the requested delay", async () => {
    let done = false;
    const p = sleep(100).then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });
});

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("passes through values that arrive in time", async () => {
    const result = await withTimeout(Promise.resolve("fast"), 1000);
    expect(result).toBe("fast");
  });

  it("rejects with a timeout error when too slow", async () => {
    const slow = new Promise<string>(() => {}); // never settles
    const p = withTimeout(slow, 50);

    const assertion = expect(p).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(51);
    await assertion;
  });

  it("leaks no timers after success", async () => {
    withTimeout(sleep(10), 5000); // succeeds way before its deadline
    await vi.advanceTimersByTimeAsync(11);
    // if a timer were still scheduled at +5000, advancing would hang/fail
    await vi.advanceTimersByTimeAsync(6000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("swallows the wrapped promise's late rejection after timing out", async () => {
    let rejectLater!: (error: Error) => void;
    const lateBomber = new Promise<string>((_resolve, reject) => {
      rejectLater = reject;
    });

    const p = withTimeout(lateBomber, 50);
    const assertion = expect(p).rejects.toThrow(/timed out/i);

    await vi.advanceTimersByTimeAsync(51);
    await assertion;

    // Reject long after the wrapper settled — must NOT surface as unhandled.
    rejectLater(new Error("too late"));
    await vi.advanceTimersByTimeAsync(1);
  });
});

describe("createPool", () => {
  it("rejects non-positive limits at construction", () => {
    expect(() => createPool(0)).toThrow(RangeError);
    expect(() => createPool(-3)).toThrow(RangeError);
  });

  it("runs nothing and resolves immediately for empty task lists", async () => {
    const pool = createPool(4);
    expect(await pool.run([])).toEqual([]);
    expect(pool.active()).toBe(0);
  });

  it("never exceeds the concurrency limit", async () => {
    const pool = createPool(3);
    let inFlight = 0;
    let peak = 0;

    const makeTask = (ms: number) => async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await sleep(ms);
      inFlight--;
      return ms;
    };

    const tasks = [10, 10, 10, 10, 10, 10, 10].map(makeTask);
    const results = await pool.run(tasks);

    expect(results).toEqual([10, 10, 10, 10, 10, 10, 10]);
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1); // actually parallelized
    expect(pool.active()).toBe(0);
  });

  it("preserves input order regardless of completion order", async () => {
    const pool = createPool(4);

    // later inputs resolve first
    const tasks = [
      async () => await sleep(30).then(() => "slow-first"),
      async () => await sleep(20).then(() => "medium"),
      async () => await sleep(5).then(() => "fast-last"),
    ];

    expect(await pool.run(tasks)).toEqual(["slow-first", "medium", "fast-last"]);
  }, 5_000);

  it("reports live active() during execution", async () => {
    const pool = createPool(2);
    const release: Array<() => void> = [];
    const gate = () =>
      new Promise<void>((resolve) => {
        release.push(resolve);
      });

    const running = pool.run([gate, gate, gate]);

    // limit=2 → exactly two in flight, third queued
    await vi.waitFor(() => expect(pool.active()).toBe(2));

    release[0]?.();
    release[1]?.();

    // third starts only after a worker frees up
    await vi.waitFor(() => expect(release.length).toBe(3));
    expect(pool.active()).toBe(1);

    release[2]?.();
    await running;
    expect(pool.active()).toBe(0);
  });

  it("rejects run() when any task rejects; drains active to 0", async () => {
    const pool = createPool(2);
    let settled = 0;

    const tasks = [
      async () => {
        await sleep(5);
        settled++;
        return 1;
      },
      async () => {
        await sleep(5);
        throw new Error("task exploded");
      },
      async () => {
        await sleep(5);
        settled++;
        return 3;
      },
    ];

    await expect(pool.run(tasks)).rejects.toThrow("task exploded");
    await sleep(20); // allow already-started tasks to finish draining
    expect(pool.active()).toBe(0);
    expect(settled).toBeGreaterThanOrEqual(1); // started tasks weren't aborted
  }, 5_000);

  it("is reusable across sequential runs", async () => {
    const pool = createPool(2);
    expect(await pool.run([async () => 1])).toEqual([1]);
    expect(await pool.run([async () => 2, async () => 3])).toEqual([2, 3]);
  });
});

describe("mapLimit", () => {
  it("maps with bounded concurrency, preserving order", async () => {
    let inFlight = 0;
    let peak = 0;

    const result = await mapLimit(
      [40, 30, 20, 10],
      2,
      async (ms) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await sleep(ms);
        inFlight--;
        return ms * 2;
      },
    );

    expect(result).toEqual([80, 60, 40, 20]);
    expect(peak).toBeLessThanOrEqual(2);
  }, 5_000);
});
