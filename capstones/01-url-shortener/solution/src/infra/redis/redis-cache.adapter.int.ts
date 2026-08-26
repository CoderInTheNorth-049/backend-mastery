import Redis from "ioredis";
import type { CacheStore } from "../../domain/ports";

/**
 * Redis cache-aside adapter (M4).
 *
 * Keys follow the build-guide format `v1|link|code=<code>`. Values are the
 * target URL, or the NEGATIVE_VALUE sentinel for unknown codes written with
 * the short 30s TTL by RedirectService. PX (millisecond) TTLs match the port.
 */
export class RedisCacheAdapter implements CacheStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.redis.set(key, value, "PX", ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
