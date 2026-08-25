import { describe, expect, it, vi } from "vitest";
import {
  buildCacheKey,
  evaluateFreshness,
  jitteredTtl,
  type FreshnessInput,
} from "./src/cache-math";

const NOW = Date.parse("2026-08-24T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toUTCString();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toUTCString();

describe("evaluateFreshness — precedence ladder", () => {
  it("no-store wins over everything, zero lifetime", () => {
    const input: FreshnessInput = {
      cacheControl: "public, max-age=3600, no-store",
      date: minutesAgo(1),
    };
    expect(evaluateFreshness(input, NOW)).toEqual({
      fresh: false,
      reason: "no-store",
      ageSeconds: 0,
      lifetimeSeconds: 0,
    });
  });

  it("no-cache means revalidate-always even with a fresh max-age", () => {
    const input: FreshnessInput = {
      cacheControl: "no-cache, max-age=600",
      date: minutesAgo(1),
    };
    expect(evaluateFreshness(input, NOW)).toMatchObject({
      fresh: false,
      reason: "no-cache",
    });
  });

  it("max-age: fresh inside the window with correct age math", () => {
    const input: FreshnessInput = { cacheControl: "max-age=3600", date: minutesAgo(30) };
    expect(evaluateFreshness(input, NOW)).toEqual({
      fresh: true,
      reason: "max-age",
      ageSeconds: 1800,
      lifetimeSeconds: 3600,
    });
  });

  it("max-age: stale past the window; boundary is exclusive", () => {
    const input: FreshnessInput = { cacheControl: "max-age=60", date: minutesAgo(1) };
    expect(evaluateFreshness(input, NOW)).toMatchObject({ fresh: false, reason: "max-age" });
  });

  it("missing Date treats the response as just-fetched", () => {
    const input: FreshnessInput = { cacheControl: "max-age=3600" };
    expect(evaluateFreshness(input, NOW)).toEqual({
      fresh: true,
      reason: "max-age",
      ageSeconds: 0,
      lifetimeSeconds: 3600,
    });
  });

  it("malformed max-age is ignored and falls through to Expires", () => {
    const input: FreshnessInput = {
      cacheControl: "max-age=banana",
      expires: new Date(NOW + 60_000).toUTCString(),
      date: minutesAgo(1),
    };
    expect(evaluateFreshness(input, NOW)).toMatchObject({
      fresh: true,
      reason: "expires",
    });
  });

  it("expires fallback computes lifetime from Date when present", () => {
    const input: FreshnessInput = {
      expires: new Date(NOW + 30 * 60_000).toUTCString(),
      date: minutesAgo(10),
    };
    const verdict = evaluateFreshness(input, NOW);
    expect(verdict.fresh).toBe(true);
    expect(verdict.reason).toBe("expires");
    expect(verdict.ageSeconds).toBe(600);
    // lifetime = expires − Date = 30min ahead + 10min already aged = 40min
    expect(verdict.lifetimeSeconds).toBe(2400);
  });

  it("expires without Date measures remaining time from now", () => {
    const input: FreshnessInput = { expires: new Date(NOW + 45_000).toUTCString() };
    const verdict = evaluateFreshness(input, NOW);
    expect(verdict.fresh).toBe(true);
    expect(verdict.lifetimeSeconds).toBe(45);
  });

  it("heuristic freshness uses 10% of Date−Last-Modified", () => {
    const input: FreshnessInput = { date: minutesAgo(50), lastModified: daysAgo(10) };
    const verdict = evaluateFreshness(input, NOW);
    // delta = 10d − 50min = 86_100min; heuristic = 10% → 86_100s; age 3_000s → fresh
    expect(verdict).toEqual({
      fresh: true,
      reason: "heuristic",
      ageSeconds: 3000,
      lifetimeSeconds: 86_100,
    });
  });

  it("nothing applicable → stale", () => {
    expect(evaluateFreshness({}, NOW)).toEqual({ fresh: false, reason: "stale" });
    expect(evaluateFreshness({ cacheControl: "public" }, NOW)).toMatchObject({ reason: "stale" });
  });
});

describe("jitteredTtl", () => {
  it("zero factor returns the base exactly", () => {
    expect(jitteredTtl(300, 0, () => 0.99)).toBe(300);
  });

  it("rng=0 returns base; rng=1 shrinks by the full factor", () => {
    expect(jitteredTtl(300, 0.2, () => 0)).toBe(300);
    expect(jitteredTtl(300, 0.2, () => 1)).toBe(240); // 300 * 0.8
  });

  it("clamps out-of-range factors", () => {
    expect(jitteredTtl(100, 5, () => 1)).toBe(1); // factor clamps to 1 → max(1, round(0))
    expect(jitteredTtl(100, -3, () => 0.7)).toBe(100);
  });

  it("never below one second", () => {
    expect(jitteredTtl(2, 1, () => 1)).toBe(1);
  });

  it("uses the injected rng sequence (deterministic)", () => {
    const rng = vi.fn().mockReturnValueOnce(0.5).mockReturnValueOnce(0.25);
    expect(jitteredTtl(200, 0.5, rng)).toBe(150);
    expect(jitteredTtl(200, 0.5, rng)).toBe(175);
  });
});

describe("buildCacheKey", () => {
  it("sorts params by key regardless of insertion order", () => {
    expect(buildCacheKey("users", { b: 2, a: "x", c: true })).toBe("users|a=x|b=2|c=true");
    expect(buildCacheKey("users", { c: true, a: "x", b: 2 })).toBe("users|a=x|b=2|c=true");
  });

  it("prefixes version when provided", () => {
    expect(buildCacheKey("feed", { page: 1 }, "3")).toBe("v3|feed|page=1");
  });

  it("handles empty params and namespaces", () => {
    expect(buildCacheKey("health", {})).toBe("health");
    expect(buildCacheKey("", {}, "1")).toBe("v1|");
  });
});
