import { describe, expect, it, vi } from "vitest";
import { nextRetryDelayMs } from "./src/worker-kit";

const policy = { attempts: 3, backoffMs: 100 };

describe("nextRetryDelayMs (pure — always runs)", () => {
  it("exponentially grows: base, base×2, base×4…", () => {
    expect(nextRetryDelayMs(policy, 1)).toBe(100);
    expect(nextRetryDelayMs(policy, 2)).toBe(200);
    expect(nextRetryDelayMs(policy, 3)).toBe(400);
  });

  it("caps at 60_000ms no matter the attempt", () => {
    expect(nextRetryDelayMs({ attempts: 10, backoffMs: 500 }, 9)).toBe(60_000);
  });

  it("rejects non-positive attempt numbers", () => {
    expect(() => nextRetryDelayMs(policy, 0)).toThrow(RangeError);
  });
});
