import { describe, expect, it, vi } from "vitest";
import { createCodeFactory } from "./base62";
import { buildCacheKey } from "./cache-keys";
import { LinksService } from "./links.service";
import type { CacheStore, Clock, LinkProjection, LinkStore } from "./ports";

const fixedClock: Clock = { now: () => 1_234 };

function spyStores(seed: Record<string, LinkProjection> = {}): {
  links: LinkStore;
  cache: CacheStore;
  order: string[];
} {
  const order: string[] = [];
  const links: LinkStore = {
    save: vi.fn(async (): Promise<void> => undefined),
    findByCode: vi.fn(async (code: string): Promise<LinkProjection | null> => seed[code] ?? null),
    setDisabled: vi.fn(async (code: string): Promise<boolean> => {
      // Mirror MemLinkStore semantics: no row -> false, nothing recorded.
      if (seed[code] === undefined) return false;
      order.push("setDisabled");
      return true;
    }),
    ping: vi.fn(async (): Promise<boolean> => true),
  };
  const cache: CacheStore = {
    get: vi.fn(async (): Promise<string | null> => null),
    set: vi.fn(async (): Promise<void> => undefined),
    del: vi.fn(async (key: string): Promise<void> => {
      order.push(`cacheDel:${key}`);
    }),
  };
  return { links, cache, order };
}

describe("LinksService", () => {
  it("create persists a generated code and echoes the url", async () => {
    const { links, cache } = spyStores();
    const svc = new LinksService({
      clock: fixedClock,
      links,
      cache,
      codeFactory: createCodeFactory({ suffixLength: 4 }),
    });
    await expect(svc.create({ url: "https://example.com" })).resolves.toMatchObject({
      url: "https://example.com",
      code: expect.stringMatching(/^[0-9A-Za-z]+$/),
    });
    expect(links.save).toHaveBeenCalledWith({
      code: expect.any(String),
      targetUrl: "https://example.com",
      expiresAt: null,
    });
  });

  it("disable commits to the store BEFORE invalidating the cache", async () => {
    const { links, cache, order } = spyStores({
      abc: { targetUrl: "https://example.com", expiresAt: null, disabledAt: null },
    });
    const svc = new LinksService({
      clock: fixedClock,
      links,
      cache,
      codeFactory: createCodeFactory(),
    });

    await expect(svc.disable("abc")).resolves.toBe(true);

    // Invalidate-after-commit rule, asserted on exact call ORDER: a reversed
    // sequence would let concurrent readers re-populate stale cache entries.
    expect(order).toEqual([`setDisabled`, `cacheDel:${buildCacheKey("abc")}`]);
  });

  it("disable of an unknown code never touches the cache", async () => {
    const { links, cache, order } = spyStores();
    const svc = new LinksService({
      clock: fixedClock,
      links,
      cache,
      codeFactory: createCodeFactory(),
    });

    await expect(svc.disable("ghost")).resolves.toBe(false);
    // setDisabled returned false (no row) - and no DEL ran.
    expect(order).toEqual([]);
    expect(cache.del).not.toHaveBeenCalled();
  });
});
