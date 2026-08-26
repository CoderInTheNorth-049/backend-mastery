/**
 * Pure domain contracts (ports). Nothing here knows about Nest, Express, pg,
 * or Redis - adapters implement these interfaces and the composition root in
 * src/app.ts picks which ones to wire.
 */

export interface Clock {
  now(): number;
}

/** Minimal redirect projection: the ONLY columns the hot path may read. */
export interface LinkProjection {
  targetUrl: string;
  expiresAt: number | null;
  disabledAt: number | null;
}

export interface NewLink {
  code: string;
  targetUrl: string;
  expiresAt: number | null;
}

export interface LinkStore {
  save(link: NewLink): Promise<void>;
  findByCode(code: string): Promise<LinkProjection | null>;
  /** Returns false when the code does not exist (or was already disabled). */
  setDisabled(code: string, disabledAt: number): Promise<boolean>;
  ping(): Promise<boolean>;
}

export interface ClickEvent {
  eventId: string;
  code: string;
  ts: number;
  uaHash?: string;
  country?: string;
}

export interface ClickCounts {
  total: number;
  last24h: number;
}

export interface ClickStore {
  /** Idempotent: duplicate eventIds must not create duplicate rows. */
  bulkInsert(events: ClickEvent[]): Promise<void>;
  /** Reads pre-aggregated counts only - never raw event lists. */
  aggregateByCode(code: string): Promise<ClickCounts>;
}

/**
 * Cache-aside port. Values are opaque strings; the redirect layer stores
 * either a target URL or the NEGATIVE_VALUE sentinel.
 */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
}

/** Producer side. Implementations must not throw synchronously. */
export interface ClickQueue {
  enqueue(evt: ClickEvent): Promise<void>;
}

/** Drain-side view consumed by the flush worker (memory impl splices a buffer). */
export interface ClickDrain {
  take(max?: number): ClickEvent[];
}

/** Hit/miss accounting fed by RedirectService, rendered by /metrics. */
export interface CacheMetrics {
  recordCacheHit(): void;
  recordCacheMiss(): void;
}
