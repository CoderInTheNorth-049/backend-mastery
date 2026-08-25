export interface User {
  id: string;
  name: string;
  email: string;
  version: number;
}

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export interface UserSource {
  fetch(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface CacheStats {
  hits: number;
  misses: number;
}

export function userCacheKey(id: string): string {
  return `user:${id}`;
}

export class CachedUserRepo {
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly source: UserSource,
    private readonly cache: CacheClient,
    private readonly ttlSeconds = 60,
  ) {}

  async get(id: string): Promise<User | null> {
    const key = userCacheKey(id);
    const cached = await this.cache.get(key);

    if (cached !== null) {
      this.hits++;
      // Negative entries parse back to null — that's the point.
      return JSON.parse(cached) as User | null;
    }

    this.misses++;
    const user = await this.source.fetch(id);
    // Always populate — including "not found" — so repeated misses of the
    // same id never punch through to the source again within TTL.
    await this.cache.set(key, JSON.stringify(user), this.ttlSeconds);
    return user;
  }

  async update(user: User): Promise<void> {
    // DB first (source of truth), invalidate AFTER commit succeeds —
    // otherwise a concurrent reader re-caches the stale committed value.
    await this.source.save(user);
    await this.cache.del(userCacheKey(user.id));
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.del(userCacheKey(id));
  }

  stats(): CacheStats {
    return { hits: this.hits, misses: this.misses };
  }
}

export interface SingleFlight {
  run<T>(key: string, loader: () => Promise<T>): Promise<T>;
  size(): number;
}

export function createSingleFlight(): SingleFlight {
  const inflight = new Map<string, Promise<unknown>>();

  return {
    run<T>(key: string, loader: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key);
      if (existing) return existing as Promise<T>;

      const promise = (async () => loader())().finally(() => {
        inflight.delete(key); // clears on resolve AND reject
      });

      inflight.set(key, promise);
      return promise as Promise<T>;
    },
    size() {
      return inflight.size;
    },
  };
}
