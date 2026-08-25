import { describe, expect, it, vi } from "vitest";
import { DEADLOCK_CODE, withDeadlockRetry } from "./src/seats";

function deadlockError(): Error {
  return Object.assign(new Error("deadlock detected"), { code: DEADLOCK_CODE });
}

describe("withDeadlockRetry", () => {
  it("passes values through when the first attempt succeeds", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    await expect(withDeadlockRetry(fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries deadlock failures and then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(deadlockError())
      .mockRejectedValueOnce(deadlockError())
      .mockResolvedValueOnce("won");

    await expect(withDeadlockRetry(fn)).resolves.toBe("won");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last deadlock error after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(deadlockError());

    await expect(withDeadlockRetry(fn, 2)).rejects.toMatchObject({
      code: DEADLOCK_CODE,
    });
    // first attempt + 2 retries = 3 total
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("propagates non-deadlock errors without retrying", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error("boom"), { code: "23505" }));

    await expect(withDeadlockRetry(fn, 5)).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("defaults to 3 extra attempts when maxRetries is omitted", async () => {
    const fn = vi.fn().mockRejectedValue(deadlockError());

    await expect(withDeadlockRetry(fn)).rejects.toMatchObject({ code: DEADLOCK_CODE });
    expect(fn).toHaveBeenCalledTimes(4); // 1 + default 3
  });
});
