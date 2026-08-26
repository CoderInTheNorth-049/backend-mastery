import { describe, expect, it } from "vitest";
import { jitteredTtl } from "./ttl";

describe("jitteredTtl", () => {
  it("stays within base +/-10% across many draws", () => {
    for (let i = 0; i < 200; i++) {
      expect(jitteredTtl()).toBeGreaterThanOrEqual(270_000);
      expect(jitteredTtl()).toBeLessThanOrEqual(330_000);
    }
  });

  it("maps rand to the full range deterministically", () => {
    expect(jitteredTtl(300_000, 0.1, () => 0)).toBe(270_000);
    expect(jitteredTtl(300_000, 0.1, () => 1)).toBe(330_000);
  });

  it("honors custom base and jitter percentage", () => {
    for (let i = 0; i < 50; i++) {
      const ttl = jitteredTtl(1000, 0.25, Math.random);
      expect(ttl).toBeGreaterThanOrEqual(750);
      expect(ttl).toBeLessThanOrEqual(1250);
    }
  });
});
