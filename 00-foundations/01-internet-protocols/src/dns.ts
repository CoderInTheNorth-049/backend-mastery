// ── Tiny recursive DNS resolver (in-process) ─────────────────────────────
// Implement the behavior contract in ../assignment.md
// Do NOT change exported names/types — the spec imports them.

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

export function resolveDns(
  records: DnsRecords,
  query: string,
  cache: DnsCache,
  now: number,
): ResolveResult {
  // TODO: implement per assignment.md
  throw new Error("TODO: implement resolveDns");
}
