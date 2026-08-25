export type DnsRecordType = "A" | "CNAME";

export interface DnsRecord {
  type: DnsRecordType;
  /** "A" → IPv4 address; "CNAME" → alias hostname */
  value: string;
  /** seconds this answer may be cached */
  ttl: number;
}

/** hostname → record */
export type DnsRecords = Record<string, DnsRecord>;

export interface CacheEntry {
  ip: string;
  expiresAt: number;
}

export type DnsCache = Map<string, CacheEntry>;

export interface ResolveResult {
  ip: string;
  /** hostnames traversed in order; ends at the owner of the final A record */
  chain: string[];
  cached: boolean;
}

const MAX_CHAIN = 16;

/**
 * Resolve `query` against a flat record map, following CNAME chains,
 * with loop detection and a TTL-aware cache.
 *
 * Contract: see ../assignment.md
 */
export function resolveDns(
  records: DnsRecords,
  query: string,
  cache: DnsCache,
  now: number,
): ResolveResult {
  const hit = cache.get(query);
  if (hit && now < hit.expiresAt) {
    return { ip: hit.ip, chain: [query], cached: true };
  }

  let current = query;
  const chain: string[] = [];
  const visited = new Set<string>();
  let minTtl = Number.POSITIVE_INFINITY;

  while (true) {
    if (visited.has(current) || chain.length > MAX_CHAIN) {
      throw new Error(`DNS loop detected while resolving "${query}"`);
    }
    visited.add(current);

    const record = records[current];
    if (!record) {
      throw new Error(`NXDOMAIN: no record for "${current}" (resolving "${query}")`);
    }

    chain.push(current);
    minTtl = Math.min(minTtl, record.ttl);

    if (record.type === "A") {
      cache.set(query, { ip: record.value, expiresAt: now + minTtl });
      return { ip: record.value, chain, cached: false };
    }

    current = record.value;
  }
}
