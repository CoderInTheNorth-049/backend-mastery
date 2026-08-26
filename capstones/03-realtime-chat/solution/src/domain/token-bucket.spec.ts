import { describe, expect, it } from "vitest";
import { TokenBucket } from "./token-bucket";

describe("token-bucket", () => {
  it("allows a full burst, then refuses until refill", () => {
    let nowMs = 0;
    const bucket = new TokenBucket(5, 1, () => nowMs);

    expect(Array.from({ length: 5 }, () => bucket.take())).toEqual([true, true, true, true, true]);
    expect(bucket.take()).toBe(false);

    // Half a second passes: half a token accrued, still short of one.
    nowMs += 500;
    expect(bucket.take()).toBe(false);
    nowMs += 500;
    expect(bucket.take()).toBe(true);
    expect(bucket.take()).toBe(false);
  });

  it("refills lazily but never beyond capacity", () => {
    let nowMs = 0;
    const bucket = new TokenBucket(5, 1, () => nowMs);

    nowMs += 10_000; // idle long enough to owe 10 tokens; capped at 5
    expect(Array.from({ length: 5 }, () => bucket.take())).toEqual([true, true, true, true, true]);
    expect(bucket.take()).toBe(false);
  });
});
