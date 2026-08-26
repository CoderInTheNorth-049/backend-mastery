import type { CacheStore, Clock } from "../../domain/ports";
import { SYSTEM_CLOCK } from "../../lib/clock";

interface Entry {
  value: string;
  expiresAt: number;
}

/**
 * TTL-faithful stand-in for Redis: expired entries disappear exactly like
 * they would under PX, using the injected clock so tests can travel in time.
 */
export class MemCacheAdapter implements CacheStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly clock: Clock = SYSTEM_CLOCK) {}

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.clock.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: this.clock.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
