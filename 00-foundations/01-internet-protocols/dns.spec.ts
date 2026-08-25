import { describe, expect, it } from "vitest";
import {
  resolveDns,
  type DnsCache,
  type DnsRecords,
} from "./src/dns";

const NOW = 1_000_000;

describe("resolveDns — direct A record", () => {
  const records: DnsRecords = {
    "example.com": { type: "A", value: "93.184.216.34", ttl: 300 },
  };

  it("resolves immediately with a single-hop chain", () => {
    const cache: DnsCache = new Map();
    const result = resolveDns(records, "example.com", cache, NOW);
    expect(result).toEqual({
      ip: "93.184.216.34",
      chain: ["example.com"],
      cached: false,
    });
  });

  it("populates the cache with now + ttl", () => {
    const cache: DnsCache = new Map();
    resolveDns(records, "example.com", cache, NOW);
    expect(cache.get("example.com")).toEqual({
      ip: "93.184.216.34",
      expiresAt: NOW + 300,
    });
  });
});

describe("resolveDns — CNAME chains", () => {
  const records: DnsRecords = {
    "www.example.com": { type: "CNAME", value: "cdn.example.net", ttl: 100 },
    "cdn.example.net": { type: "A", value: "203.0.113.7", ttl: 20 },
  };

  it("follows aliases and reports the full chain", () => {
    const result = resolveDns(records, "www.example.com", new Map(), NOW);
    expect(result.ip).toBe("203.0.113.7");
    expect(result.chain).toEqual(["www.example.com", "cdn.example.net"]);
    expect(result.cached).toBe(false);
  });

  it("uses the minimum TTL along the chain for caching", () => {
    const cache: DnsCache = new Map();
    resolveDns(records, "www.example.com", cache, NOW);
    expect(cache.get("www.example.com")?.expiresAt).toBe(NOW + 20);
  });
});

describe("resolveDns — caching", () => {
  const records: DnsRecords = {
    "api.example.com": { type: "A", value: "198.51.100.9", ttl: 50 },
  };

  it("serves from cache without consulting records", () => {
    const cache: DnsCache = new Map();
    resolveDns(records, "api.example.com", cache, NOW);

    const emptyRecords: DnsRecords = {};
    const result = resolveDns(emptyRecords, "api.example.com", cache, NOW + 10);

    expect(result).toEqual({ ip: "198.51.100.9", chain: ["api.example.com"], cached: true });
  });

  it("re-resolves after expiry and refreshes the entry", () => {
    const cache: DnsCache = new Map();
    resolveDns(records, "api.example.com", cache, NOW);

    const updated: DnsRecords = {
      "api.example.com": { type: "A", value: "198.51.100.10", ttl: 50 },
    };
    const result = resolveDns(updated, "api.example.com", cache, NOW + 51);

    expect(result.cached).toBe(false);
    expect(result.ip).toBe("198.51.100.10");
    expect(cache.get("api.example.com")?.ip).toBe("198.51.100.10");
  });
});

describe("resolveDns — failure modes", () => {
  it("throws for unknown names (mentioning the name)", () => {
    expect(() => resolveDns({}, "ghost.io", new Map(), NOW)).toThrow(/ghost\.io/);
  });

  it("throws when a CNAME points at a missing name", () => {
    const records: DnsRecords = {
      "a.test": { type: "CNAME", value: "missing.test", ttl: 60 },
    };
    expect(() => resolveDns(records, "a.test", new Map(), NOW)).toThrow(/missing\.test/);
  });

  it("detects loops regardless of cycle position", () => {
    const loop: DnsRecords = {
      "a.test": { type: "CNAME", value: "b.test", ttl: 60 },
      "b.test": { type: "CNAME", value: "c.test", ttl: 60 },
      "c.test": { type: "CNAME", value: "a.test", ttl: 60 },
    };
    expect(() => resolveDns(loop, "a.test", new Map(), NOW)).toThrow(/loop/i);
  });

  it("rejects data-driven chains longer than 16 hops as loops", () => {
    const longChain: DnsRecords = {};
    for (let i = 0; i < 40; i++) {
      longChain[`h${i}.test`] = { type: "CNAME", value: `h${i + 1}.test`, ttl: 60 };
    }
    expect(() => resolveDns(longChain, "h0.test", new Map(), NOW)).toThrow(/loop/i);
  });
});
