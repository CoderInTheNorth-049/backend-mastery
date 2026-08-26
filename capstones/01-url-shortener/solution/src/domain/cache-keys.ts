/**
 * Cache key format and TTL constants (build-guide M4 names this exact shape).
 * The "v1|" prefix lets a future schema change invalidate everything by
 * switching to v2 instead of flushing.
 */
export const buildCacheKey = (code: string): string => `v1|link|code=${code}`;

/** Sentinel stored under a code that does not exist ("negative caching"). */
export const NEGATIVE_VALUE = "__not_found__";
/** Unknown-code entries live 30s: enough to blunt bot scans, short enough... */
export const NEGATIVE_TTL_MS = 30_000;
/** Positive entries base TTL; jitteredTtl spreads it +/-10%. */
export const LINK_TTL_BASE_MS = 300_000;
/**
 * Browser-facing max-age. Deliberately NOT jittered: jitter is a server-cache
 * herd defense, and stable headers play nicer with CDNs/proxies.
 */
export const REDIRECT_CACHE_CONTROL = "public, max-age=300";
