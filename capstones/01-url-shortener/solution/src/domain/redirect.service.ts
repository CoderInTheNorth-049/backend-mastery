import { randomUUID } from "node:crypto";
import type { Logger } from "pino";
import {
  buildCacheKey,
  LINK_TTL_BASE_MS,
  NEGATIVE_TTL_MS,
  NEGATIVE_VALUE,
} from "./cache-keys";
import type { CacheMetrics, CacheStore, ClickQueue, Clock, LinkStore } from "./ports";
import { jitteredTtl } from "./ttl";

export type RedirectOutcome =
  | { kind: "redirect"; targetUrl: string }
  | { kind: "not-found"; detail: string }
  | { kind: "gone"; detail: string };

export interface RedirectServiceDeps {
  clock: Clock;
  links: LinkStore;
  cache: CacheStore;
  queue: ClickQueue;
  metrics?: CacheMetrics;
  logger?: Logger;
}

/**
 * The hot path (M3 + M4 in one class, cache-aside pattern):
 *
 *   cache hit -> serve
 *   miss      -> read the store projection -> populate cache (jittered TTL)
 *                -> enqueue click fire-and-forget
 *
 * Nothing here ever awaits a durable WRITE: clicks ride the queue and a queue
 * outage must not be able to break redirects.
 */
export class RedirectService {
  constructor(private readonly deps: RedirectServiceDeps) {}

  async resolve(code: string): Promise<RedirectOutcome> {
    const key = buildCacheKey(code);

    const cached = await this.deps.cache.get(key);
    if (cached !== null) {
      // Negative entries count as hits too: they also spared the store.
      this.deps.metrics?.recordCacheHit();
      if (cached === NEGATIVE_VALUE) {
        return { kind: "not-found", detail: `no link for code '${code}'` };
      }
      return { kind: "redirect", targetUrl: cached };
    }
    this.deps.metrics?.recordCacheMiss();

    const link = await this.deps.links.findByCode(code);
    if (link === null) {
      // Negative caching (M4): unknown codes get a short-TTL tombstone so a
      // bot scanning random codes hammers Redis instead of Postgres.
      await this.deps.cache.set(key, NEGATIVE_VALUE, NEGATIVE_TTL_MS);
      return { kind: "not-found", detail: `no link for code '${code}'` };
    }
    if (link.disabledAt !== null) {
      return { kind: "not-found", detail: "link is disabled" };
    }
    if (link.expiresAt !== null && link.expiresAt <= this.deps.clock.now()) {
      return { kind: "gone", detail: "link has expired" };
    }

    await this.deps.cache.set(key, link.targetUrl, jitteredTtl(LINK_TTL_BASE_MS));

    // Fire-and-forget on purpose: losing click events degrades analytics;
    // awaiting the queue would put its availability inside the redirect SLA -
    // exactly the coupling M3 exists to remove. .catch keeps an enqueue
    // rejection from surfacing as an unhandled rejection.
    const event = { eventId: randomUUID(), code, ts: this.deps.clock.now() };
    try {
      void this.deps.queue.enqueue(event).catch((err: unknown) => {
        this.deps.logger?.warn({ err, code }, "click enqueue failed; redirect served anyway");
      });
    } catch (err) {
      this.deps.logger?.warn({ err, code }, "click enqueue threw; redirect served anyway");
    }

    return { kind: "redirect", targetUrl: link.targetUrl };
  }
}
