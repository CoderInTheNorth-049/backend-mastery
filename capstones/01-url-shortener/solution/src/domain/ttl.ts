/**
 * Jittered TTL for cache-aside entries (M4).
 *
 * Why jitter: N keys populated by one traffic spike expire simultaneously and
 * stampede the origin ("thundering herd"). Spreading expirations +/-10% around
 * the 300s base de-synchronizes them for free.
 */
export function jitteredTtl(
  baseMs: number = 300_000,
  jitterPct: number = 0.1,
  rand: () => number = Math.random,
): number {
  const spread = baseMs * jitterPct;
  const low = baseMs - spread;
  return Math.round(low + rand() * 2 * spread);
}
