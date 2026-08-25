import type Redis from "ioredis";
import type { CacheClient } from "./cache";

/**
 * PROVIDED adapter — bridges the CacheClient contract to a real ioredis
 * instance. Learners implement the LOGIC in cache.ts; this file exists so
 * integration specs can prove that logic against actual Redis semantics.
 */
export class RedisCacheClient implements CacheClient {
  constructor(private readonly redis: Redis) {}

  get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.redis.set(key, value, "EX", ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
