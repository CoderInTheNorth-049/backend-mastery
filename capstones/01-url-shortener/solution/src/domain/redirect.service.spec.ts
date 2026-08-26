import { describe, expect, it, vi } from "vitest";
import { LINK_TTL_BASE_MS, NEGATIVE_TTL_MS, NEGATIVE_VALUE, buildCacheKey } from "./cache-keys";
import type {
  CacheMetrics,
  CacheStore,
  ClickEvent,
  ClickQueue,
  Clock,
  LinkProjection,
  LinkStore,
} from "./ports";
import { RedirectService } from "./redirect.service";

const fixedClock = (t: number): Clock => ({ now: () => t });

function seedStore(seed: Record<string, LinkProjection>): LinkStore {
  return {
    save: vi.fn(async (): Promise<void> => undefined),
    findByCode: vi.fn(async (code: string): Promise<LinkProjection | null> => seed[code] ?? null),
    setDisabled: vi.fn(async (): Promise<boolean> => true),
    ping: vi.fn(async (): Promise<boolean> => true),
  };
}

function recordingCache(): CacheStore & { sets: Array<{ key: string; value: string; ttlMs: number }> } {
  const entries = new Map<string, string>();
  const sets: Array<{ key: string; value: string; ttlMs: number }> = [];
  return {
    sets,
    get: vi.fn(async (key: string): Promise<string | null> => entries.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, ttlMs: number): Promise<void> => {
      sets.push({ key, value, ttlMs });
      entries.set(key, value);
    }),
    del: vi.fn(async (key: string): Promise<void> => {
      entries.delete(key);
    }),
  };
}

function recordingQueue(): ClickQueue & { events: ClickEvent[] } {
  const events: ClickEvent[] = [];
  return { events, enqueue: vi.fn(async (evt: ClickEvent): Promise<void> => void events.push(evt)) };
}

function counters(): CacheMetrics & { hits(): number; misses(): number } {
  let hits = 0;
  let misses = 0;
  return {
    hits: (): number => hits,
    misses: (): number => misses,
    recordCacheHit: (): void => void ++hits,
    recordCacheMiss: (): void => void ++misses,
  };
}

const service = (deps: Partial<ConstructorParameters<typeof RedirectService>[0]> = {}): RedirectService =>
  new RedirectService({
    clock: deps.clock ?? fixedClock(1_000),
    links: deps.links ?? seedStore({}),
    cache: deps.cache ?? recordingCache(),
    queue: deps.queue ?? recordingQueue(),
    metrics: deps.metrics,
    logger: deps.logger,
  });

describe("RedirectService.resolve", () => {
  it("on a miss: reads the store, populates a jittered-TTL cache entry, enqueues a click", async () => {
    const links = seedStore({ abc: { targetUrl: "https://example.com", expiresAt: null, disabledAt: null } });
    const cache = recordingCache();
    const queue = recordingQueue();
    const svc = service({ links, cache, queue });

    await expect(svc.resolve("abc")).resolves.toEqual({
      kind: "redirect",
      targetUrl: "https://example.com",
    });
    expect(cache.sets).toEqual([
      { key: buildCacheKey("abc"), value: "https://example.com", ttlMs: expect.any(Number) },
    ]);
    // TTL must be the jittered base, inside +/-10%.
    const ttl = cache.sets[0]?.ttlMs ?? 0;
    expect(ttl).toBeGreaterThanOrEqual(LINK_TTL_BASE_MS * 0.9);
    expect(ttl).toBeLessThanOrEqual(LINK_TTL_BASE_MS * 1.1);
    expect(queue.events).toEqual([
      { eventId: expect.any(String), code: "abc", ts: 1_000 },
    ]);
  });

  it("on a hit: serves from cache - store untouched, no duplicate click", async () => {
    const links = seedStore({
      abc: { targetUrl: "https://example.com", expiresAt: null, disabledAt: null },
    });
    const cache = recordingCache();
    const queue = recordingQueue();
    const svc = service({ links, cache, queue });

    await svc.resolve("abc"); // miss: one store read + one enqueue
    await expect(svc.resolve("abc")).resolves.toEqual({
      kind: "redirect",
      targetUrl: "https://example.com",
    });
    expect(links.findByCode).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
  });

  it("unknown codes write a short negative entry and are then served by it", async () => {
    const links = seedStore({});
    const cache = recordingCache();
    const metrics = counters();
    const svc = service({ links, cache, metrics });

    await expect(svc.resolve("ghost")).resolves.toMatchObject({ kind: "not-found" });
    expect(cache.sets).toEqual([
      { key: buildCacheKey("ghost"), value: NEGATIVE_VALUE, ttlMs: NEGATIVE_TTL_MS },
    ]);

    // Second request hits the negative entry: the store probe count stays at 1
    // (bot protection) and the negative lookup counts as an avoided DB read.
    await svc.resolve("ghost");
    expect(links.findByCode).toHaveBeenCalledTimes(1);
    expect(metrics.hits()).toBe(1);
    expect(metrics.misses()).toBe(1);
  });

  it("reports disabled links as 404 without caching them", async () => {
    const links = seedStore({
      off: { targetUrl: "https://example.com", expiresAt: null, disabledAt: 500 },
    });
    const cache = recordingCache();
    const svc = service({ links, cache });

    const outcome = await svc.resolve("off");
    expect(outcome).toMatchObject({ kind: "not-found", detail: /disabled/ });
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("reports expired links as gone, using the injected clock", async () => {
    const links = seedStore({
      old: { targetUrl: "https://example.com", expiresAt: 900, disabledAt: null },
    });
    const svc = service({ links, clock: fixedClock(1_000) });

    await expect(svc.resolve("old")).resolves.toMatchObject({ kind: "gone" });
  });

  it("keeps redirects working when the queue rejects (fire-and-forget contract)", async () => {
    const links = seedStore({ ok: { targetUrl: "https://example.com", expiresAt: null, disabledAt: null } });
    const logger = { warn: vi.fn() };
    const brokenQueue: ClickQueue = {
      enqueue: vi.fn(async (): Promise<void> => {
        throw new Error("redis is down");
      }),
    };
    const svc = service({ links, queue: brokenQueue, logger: logger as never });

    await expect(svc.resolve("ok")).resolves.toEqual({
      kind: "redirect",
      targetUrl: "https://example.com",
    });
    // The failure was logged, not propagated - a queue outage can never take
    // the hot path down with it.
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ code: "ok" }),
      "click enqueue failed; redirect served anyway",
    );
  });
});
