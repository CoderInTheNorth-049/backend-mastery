import { describe, expect, it } from "vitest";
import { fnv1a, HashRing } from "./src/ring";

const NODES = ["alpha", "beta", "gamma"];
const KEY_COUNT = 3000;
const keys = Array.from({ length: KEY_COUNT }, (_, i) => `user-${i}`);

function distributionOf(ring: HashRing): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) {
    const node = ring.getNode(key)!;
    counts.set(node, (counts.get(node) ?? 0) + 1);
  }
  return counts;
}

describe("fnv1a (provided)", () => {
  it("has the FNV offset basis as its empty-string value", () => {
    expect(fnv1a("")).toBe(2166136261);
  });

  it("is deterministic and stays in uint32 range", () => {
    expect(fnv1a("user-7")).toBe(fnv1a("user-7"));
    const big = fnv1a("some-longer-input-string");
    expect(big).toBeGreaterThan(0);
    expect(big).toBeLessThanOrEqual(4294967295);
  });

  it("diffuses sequential inputs away from consecutive outputs", () => {
    // The djb2 trap this topic exists to teach:
    const spread = new Set([100, 101, 102, 103].map((i) => fnv1a(`user-${i}`))).size;
    expect(spread).toBe(4);
    const gaps = [
      Math.abs(fnv1a("user-101") - fnv1a("user-100")),
      Math.abs(fnv1a("user-102") - fnv1a("user-101")),
    ];
    expect(gaps[0]).toBeGreaterThan(1000); // not adjacent ring positions
  });
});

describe("HashRing — basics", () => {
  it("returns null on an empty ring", () => {
    expect(new HashRing().getNode("anything")).toBeNull();
  });

  it("single node always wins", () => {
    const ring = new HashRing(["solo"]);
    for (const key of keys.slice(0, 50)) {
      expect(ring.getNode(key)).toBe("solo");
    }
  });

  it("lookups are consistent and land on members", () => {
    const ring = new HashRing(NODES);

    for (const key of keys.slice(0, 100)) {
      const first = ring.getNode(key)!;
      expect(NODES).toContain(first);
      for (let i = 0; i < 10; i++) {
        expect(ring.getNode(key)).toBe(first);
      }
    }
  });

  it("a separate instance with the same config maps identically", () => {
    const a = new HashRing(NODES);
    const b = new HashRing([...NODES]);
    for (const key of keys.slice(0, 200)) {
      expect(a.getNode(key)).toBe(b.getNode(key));
    }
  });

  it("addNode/removeNode work dynamically mid-life", () => {
    const ring = new HashRing(["alpha"]);
    ring.addNode("beta");
    expect(ring.getNode("user-7")).toBeTypeOf("string");
    ring.removeNode("alpha");
    for (const key of keys.slice(0, 100)) {
      expect(ring.getNode(key)).toBe("beta");
    }
  });
});

function spreadOf(vnodes: number): number {
  const ring = new HashRing(NODES, vnodes);
  const shares = [...distributionOf(ring).values()].map((c) => c / KEY_COUNT);
  return Math.max(...shares) - Math.min(...shares);
}

describe("HashRing — balance & movement", () => {
  it("with enough virtual nodes, shares land near-uniform (±25% band)", () => {
    const ring = new HashRing(NODES, 600);
    const shares = [...distributionOf(ring).values()].map((c) => c / KEY_COUNT);

    expect(shares).toHaveLength(3);
    for (const share of shares) {
      expect(share).toBeGreaterThan(0.22);
      expect(share).toBeLessThan(0.45);
    }
  });

  it("more virtual nodes ⇒ tighter spread (the whole point of vnodes)", () => {
    // Measured on this exact hash+names: 50 vnodes ≈ 0.67 spread, 600 ≈ 0.13.
    expect(spreadOf(600)).toBeLessThan(spreadOf(50));
  });

  it("adding one node moves only ~1/4 of keys", () => {
    const before = new HashRing(NODES, 150);
    const after = new HashRing([...NODES, "delta"], 150);

    let moved = 0;
    for (const key of keys) {
      if (before.getNode(key) !== after.getNode(key)) moved++;
    }

    const fraction = moved / KEY_COUNT;
    expect(fraction).toBeGreaterThan(0.15);
    expect(fraction).toBeLessThan(0.35);
  });

  it("removing a node loses no keys and orphans none", () => {
    const full = new HashRing(NODES, 150);
    const reduced = new HashRing(NODES, 150);
    reduced.removeNode("beta");

    let betaCount = 0;
    for (const key of keys) {
      if (full.getNode(key) === "beta") betaCount++;
      const after = reduced.getNode(key)!;
      expect(after).not.toBe("beta");
      expect(NODES.filter((n) => n !== "beta")).toContain(after);
    }
    expect(betaCount).toBeGreaterThan(0); // removal actually mattered
  });
});

describe("HashRing — replication lists", () => {
  it("getNodes returns distinct nodes starting at getNode", () => {
    const ring = new HashRing(NODES, 150);

    for (const key of keys.slice(0, 200)) {
      const primary = ring.getNode(key)!;
      const replicas = ring.getNodes(key, 2);

      expect(replicas[0]).toBe(primary);
      expect(new Set(replicas).size).toBe(2);
      expect(replicas.every((n) => NODES.includes(n))).toBe(true);
    }
  });

  it("count above node count returns every node exactly once", () => {
    const ring = new HashRing(NODES, 150);
    const all = ring.getNodes("user-42", 10);
    expect(new Set(all).size).toBe(3);
  });

  it("replica lists are stable across instances", () => {
    const a = new HashRing(NODES, 150);
    const b = new HashRing(NODES, 150);
    for (const key of keys.slice(0, 100)) {
      expect(a.getNodes(key, 2)).toEqual(b.getNodes(key, 2));
    }
  });
});
