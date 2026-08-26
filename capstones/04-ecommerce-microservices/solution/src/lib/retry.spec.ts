import { describe, expect, it } from "vitest";
import { RetryPolicy } from "./retry";

const noDelay = { backoffMs: () => 0, sleep: async () => {} };

describe("RetryPolicy", () => {
  it("recovers a transient failure on the next attempt", async () => {
    const policy = new RetryPolicy(noDelay);
    let calls = 0;
    const result = await policy.attempt(() => {
      calls += 1;
      if (calls < 2) throw new Error("flaky");
      return "ok";
    });
    expect(result).toBe("ok");
    expect(calls).toBe(2);
    expect(policy.deadLetters).toHaveLength(0);
  });

  it("dead-letters after exhausting max attempts and rethrows", async () => {
    const policy = new RetryPolicy({ ...noDelay, maxAttempts: 3 });
    let calls = 0;
    await expect(
      policy.attempt(() => {
        calls += 1;
        throw new Error(`boom ${calls}`);
      }),
    ).rejects.toThrow("boom 3");
    expect(calls).toBe(3);
    expect(policy.deadLetters).toHaveLength(1);
    expect(policy.deadLetters[0].attempts).toBe(3);
    expect((policy.deadLetters[0].error as Error).message).toBe("boom 3");
  });
});
