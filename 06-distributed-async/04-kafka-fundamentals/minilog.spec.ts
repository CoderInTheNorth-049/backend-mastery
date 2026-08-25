import { describe, expect, it } from "vitest";
import { PartitionLog } from "./src/minilog";

describe("PartitionLog — routing", () => {
  it("rejects non-positive partition counts", () => {
    expect(() => new PartitionLog(0)).toThrow(RangeError);
  });

  it("routes identical keys to identical partitions", () => {
    const log = new PartitionLog<string>(4);
    for (let i = 0; i < 20; i++) {
      log.produce("user-7", `m${i}`);
    }
    // every entry for user-7 lives on ONE partition
    const perPartition = [0, 1, 2, 3].map((p) => log.consume(p, 0, 100).length);
    expect(perPartition.filter((n) => n > 0)).toHaveLength(1);
    expect(perPartition.reduce((a, b) => a + b, 0)).toBe(20);
  });

  it("null keys round-robin starting at partition 0", () => {
    const log = new PartitionLog<number>(3);
    const routes = Array.from({ length: 7 }, (_, i) => log.produce(null, i).partition);
    expect(routes).toEqual([0, 1, 2, 0, 1, 2, 0]);
  });
});

describe("PartitionLog — offsets", () => {
  it("offsets are monotonic per partition, starting at 0", () => {
    const log = new PartitionLog<number>(2);

    const a1 = log.produce("a", 1);
    const b1 = log.produce("b", 2);
    const a2 = log.produce("a", 3);

    expect(a1.offset).toBe(0);
    expect(a2.offset).toBe(1); // same partition as 'a', advanced independently
    expect(b1.offset).toBe(0); // other partition has its own counter
    expect(log.latestOffset(0)).toBeGreaterThanOrEqual(0);
  });

  it("latestOffset is -1 for untouched partitions", () => {
    const log = new PartitionLog<string>(3);
    log.produce("k", "v");
    expect(log.latestOffset(1)).toBe(-1);
    expect(log.totalMessages()).toBe(1);
  });
});

describe("PartitionLog — consumption windows", () => {
  const log = new PartitionLog<string>(1);
  for (let i = 0; i < 10; i++) {
    log.produce(null, `m${i}`);
  }

  it("slices from an offset up to max, oldest first", () => {
    const batch = log.consume(0, 2, 3);
    expect(batch.map((e: { value: unknown }) => e.value)).toEqual(["m2", "m3", "m4"]);
    expect(batch[0].offset).toBe(2);
  });

  it("returns fewer than max at the tail; empty past the end", () => {
    expect(log.consume(0, 8, 10).map((e) => (e as { value: string }).value)).toEqual(["m8", "m9"]);
    expect(log.consume(0, 99, 5)).toEqual([]);
  });

  it("simulates two independent consumers with their own cursors", () => {
    // consumer A reads slowly from 0; consumer B already caught up
    const aFirst = log.consume(0, 0, 2);
    const bAll = log.consume(0, 0, 100);

    expect(aFirst).toHaveLength(2);
    expect(bAll).toHaveLength(10);
    expect(bAll[bAll.length - 1].value).toBe("m9");
  });

  it("throws on out-of-range partitions", () => {
    expect(() => log.consume(5, 0, 1)).toThrow(RangeError);
    expect(() => log.latestOffset(-1)).toThrow(RangeError);
  });
});
