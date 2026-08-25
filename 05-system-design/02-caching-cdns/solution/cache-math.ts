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

function parseDateMs(value?: string): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

function parseCacheControl(header?: string): {
  flags: Set<string>;
  maxAge?: number;
} {
  const tokens = (header ?? "")
    .toLowerCase()
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const flags = new Set(tokens);
  let maxAge: number | undefined;

  for (const token of tokens) {
    const match = /^max-age=(\d+)$/.exec(token);
    if (match && maxAge === undefined) {
      maxAge = Number(match[1]);
    }
  }

  return { flags, maxAge };
}

export function evaluateFreshness(
  input: FreshnessInput,
  nowMs: number,
): FreshnessVerdict {
  const { flags, maxAge } = parseCacheControl(input.cacheControl);

  // 1. no-store — never cached anywhere, no lifetime to speak of.
  if (flags.has("no-store")) {
    return { fresh: false, reason: "no-store", ageSeconds: 0, lifetimeSeconds: 0 };
  }

  // 2. no-cache — cache allowed, but revalidate before EVERY reuse.
  if (flags.has("no-cache")) {
    return { fresh: false, reason: "no-cache", ageSeconds: 0, lifetimeSeconds: 0 };
  }

  const dateMs = parseDateMs(input.date);

  // 3. max-age — age computed against the response Date (absent ⇒ just-fetched).
  if (maxAge !== undefined) {
    const ageSeconds =
      dateMs !== undefined ? Math.floor(Math.max(0, nowMs - dateMs) / 1000) : 0;
    return {
      fresh: ageSeconds < maxAge,
      reason: "max-age",
      ageSeconds,
      lifetimeSeconds: maxAge,
    };
  }

  // 4. Expires fallback.
  const expiresMs = parseDateMs(input.expires);
  if (expiresMs !== undefined) {
    if (dateMs !== undefined) {
      const ageSeconds = Math.floor(Math.max(0, nowMs - dateMs) / 1000);
      const lifetimeSeconds = Math.max(0, Math.floor((expiresMs - dateMs) / 1000));
      return { fresh: ageSeconds < lifetimeSeconds, reason: "expires", ageSeconds, lifetimeSeconds };
    }
    const remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
    return { fresh: nowMs < expiresMs, reason: "expires", ageSeconds: 0, lifetimeSeconds: remainingSeconds };
  }

  // 5. Heuristic: 10% of (Date − Last-Modified), per RFC guidance.
  const lastModifiedMs = parseDateMs(input.lastModified);
  if (dateMs !== undefined && lastModifiedMs !== undefined) {
    const ageSeconds = Math.floor(Math.max(0, nowMs - dateMs) / 1000);
    const lifetimeSeconds = Math.max(0, Math.floor(((dateMs - lastModifiedMs) / 1000) * 0.1));
    return { fresh: ageSeconds < lifetimeSeconds, reason: "heuristic", ageSeconds, lifetimeSeconds };
  }

  // 6. Nothing tells us how long this is good for.
  return { fresh: false, reason: "stale" };
}

export function jitteredTtl(
  baseSeconds: number,
  jitterFactor: number,
  rng: () => number,
): number {
  const clamped = Math.min(1, Math.max(0, jitterFactor));
  return Math.max(1, Math.round(baseSeconds * (1 - clamped * rng())));
}

export function buildCacheKey(
  namespace: string,
  params: Record<string, string | number | boolean>,
  version?: string,
): string {
  const parts: string[] = [];
  if (version !== undefined) parts.push(`v${version}`);
  parts.push(namespace);

  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    parts.push(`${key}=${String(params[key])}`);
  }

  return parts.join("|");
}
