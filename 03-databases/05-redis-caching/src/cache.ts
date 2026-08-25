// ── Cache-aside repository + stampede guard ──────────────────────────────
// Implement per ../assignment.md. redis-cache-client.ts is PROVIDED glue.

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
  constructor(
    private readonly source: UserSource,
    private readonly cache: CacheClient,
    private readonly ttlSeconds = 60,
  ) {}

  async get(id: string): Promise<User | null> {
    throw new Error("TODO: implement CachedUserRepo.get");
  }

  async update(user: User): Promise<void> {
    throw new Error("TODO: implement CachedUserRepo.update");
  }

  async invalidate(id: string): Promise<void> {
    throw new Error("TODO: implement CachedUserRepo.invalidate");
  }

  stats(): CacheStats {
    throw new Error("TODO: implement CachedUserRepo.stats");
  }
}

export interface SingleFlight {
  /** Concurrent calls with the same key share ONE loader invocation. */
  run<T>(key: string, loader: () => Promise<T>): Promise<T>;
  /** Number of keys with an in-flight loader right now. */
  size(): number;
}

export function createSingleFlight(): SingleFlight {
  throw new Error("TODO: implement createSingleFlight");
}
