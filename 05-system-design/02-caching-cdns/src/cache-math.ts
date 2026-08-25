// ── Cache math: HTTP freshness, TTL jitter, key building ─────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export type FreshnessReason =
  | "no-store"
  | "no-cache"
  | "max-age"
  | "expires"
  | "heuristic"
  | "stale";

export interface FreshnessInput {
  cacheControl?: string;
  date?: string;
  expires?: string;
  lastModified?: string;
}

export interface FreshnessVerdict {
  fresh: boolean;
  reason: FreshnessReason;
  ageSeconds?: number;
  lifetimeSeconds?: number;
}

export function evaluateFreshness(
  input: FreshnessInput,
  nowMs: number,
): FreshnessVerdict {
  throw new Error("TODO: implement evaluateFreshness");
}

/**
 * Downward-only jittered TTL: base * (1 - jitterFactor * rng()), floored at 1s.
 * rng is injected (0..1] — deterministic in tests.
 */
export function jitteredTtl(
  baseSeconds: number,
  jitterFactor: number,
  rng: () => number,
): number {
  throw new Error("TODO: implement jitteredTtl");
}

/**
 * `[v<version>|]<namespace>|<k1>=<v1>|…` with params sorted by key.
 */
export function buildCacheKey(
  namespace: string,
  params: Record<string, string | number | boolean>,
  version?: string,
): string {
  throw new Error("TODO: implement buildCacheKey");
}
