import type { Logger } from "pino";
import { type CodeFactory, nextUniqueCode } from "./base62";
import { buildCacheKey } from "./cache-keys";
import type { CacheStore, Clock, LinkStore } from "./ports";

export interface LinksServiceDeps {
  clock: Clock;
  links: LinkStore;
  cache: CacheStore;
  codeFactory: CodeFactory;
  logger?: Logger;
}

/**
 * Write side for links. Kept separate from RedirectService so the hot-path
 * class stays minimal enough to review at a glance.
 */
export class LinksService {
  constructor(private readonly deps: LinksServiceDeps) {}

  async create(input: { url: string; expiresAt?: number | null }): Promise<{
    code: string;
    url: string;
  }> {
    // Collision retry lives with the code factory (base62.nextUniqueCode).
    // The probe leaves a check-then-insert race that only matters across
    // processes; pg's UNIQUE(code) constraint is the backstop there - the pg
    // adapter surfaces it as a failed save and the caller retries.
    const code = await nextUniqueCode(
      this.deps.codeFactory,
      async (candidate) => (await this.deps.links.findByCode(candidate)) !== null,
    );
    await this.deps.links.save({
      code,
      targetUrl: input.url,
      expiresAt: input.expiresAt ?? null,
    });
    return { code, url: input.url };
  }

  /**
   * Invalidate-after-commit rule (asserted by unit test): the durable change
   * lands FIRST, cache DEL runs AFTER. Reversed order opens a window where a
   * concurrent reader re-populates the cache from pre-commit state and the
   * stale entry then survives a full TTL. With this order the worst case is a
   * request that still sees the old value until DEL lands - bounded, not sticky.
   */
  async disable(code: string): Promise<boolean> {
    const committed = await this.deps.links.setDisabled(code, this.deps.clock.now());
    if (!committed) return false;
    await this.deps.cache.del(buildCacheKey(code));
    return true;
  }
}
