import { describe, expect, it } from "vitest";
import {
  allowedErrorCount,
  computeBurnRate,
  isAlerting,
  remainingBudget,
} from "./src/budget";

describe("allowedErrorCount", () => {
  it("computes the classic numbers", () => {
    expect(allowedErrorCount(1_000_000, 99.9)).toBe(1000);
    expect(allowedErrorCount(50_000_000, 99.9)).toBe(50_000);
  });

  it("floors partial failures (no fractional error credits)", () => {
    expect(allowedErrorCount(500, 99.95)).toBe(0); // 0.25 floors to 0
    expect(allowedErrorCount(1_001, 99)).toBe(10); // 10.01 → 10
  });
});

describe("remainingBudget", () => {
  it("decreases as failures accumulate", () => {
    expect(remainingBudget(1_000_000, 400, 99.9)).toBe(600);
    expect(remainingBudget(1_000_000, 999, 99.9)).toBe(1);
  });

  it("clamps at zero when the budget is exhausted", () => {
    expect(remainingBudget(1_000_000, 1_200, 99.9)).toBe(0);
    expect(remainingBudget(1_000_000, 5_000, 99.9)).toBe(0);
  });
});

describe("computeBurnRate", () => {
  it("1.0 means consuming budget exactly on schedule", () => {
    // error rate equals budget rate: 0.1% of traffic failing at 99.9 SLO
    const rate = computeBurnRate(100_000, 100, 99.9);
    expect(rate).toBeCloseTo(1.0, 6);
  });

  it("scales linearly with observed error rate", () => {
    expect(computeBurnRate(1_000_000, 10_000, 99.9)).toBeCloseTo(10, 6);
    // THE canonical fast-burn number: 14.4× = 1.44% errors against a 0.1% budget
    // (= burning 2% of a 30-day budget within 1 hour).
    expect(computeBurnRate(1_000_000, 14_400, 99.9)).toBeCloseTo(14.4, 6);
  });

  it("zero traffic means zero burn — no NaN traps", () => {
    expect(computeBurnRate(0, 0, 99.9)).toBe(0);
    expect(computeBurnRate(0, 5, 99.9)).toBe(0);
  });

  it("perfect reliability burns nothing", () => {
    expect(computeBurnRate(250_000, 0, 99.9)).toBe(0);
  });
});

describe("isAlerting — multiwindow policy predicates", () => {
  it("fires at or above the threshold (>= semantics)", () => {
    expect(isAlerting(14.4, 14.4)).toBe(true);
    expect(isAlerting(15, 14.4)).toBe(true);
    expect(isAlerting(14.39, 14.4)).toBe(false);
  });

  it("supports slow-burn thresholds too", () => {
    expect(isAlerting(1.2, 1)).toBe(true);
    expect(isAlerting(0.99, 1)).toBe(false);
  });
});
