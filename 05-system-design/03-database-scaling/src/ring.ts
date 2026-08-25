// ── Consistent hash ring ─────────────────────────────────────────────────
// djb2 is PROVIDED — every ring point hashes through it.

/**
 * FNV-1a 32-bit — PROVIDED.
 * Chosen over djb2 because djb2 emits near-consecutive values for
 * sequential inputs ("id-1", "id-2", …), which clusters them into one
 * ring arc. FNV-1a's multiply diffuses that properly.
 */
export function fnv1a(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface RingPoint {
  hash: number;
  node: string;
}

export class HashRing {
  constructor(
    nodes: string[] = [],
    private readonly virtualNodes: number = 150,
    private readonly hash: (key: string) => number = fnv1a,
  ) {
    throw new Error("TODO: initialize the ring");
  }

  addNode(node: string): void {
    throw new Error("TODO: implement addNode");
  }

  removeNode(node: string): void {
    throw new Error("TODO: implement removeNode");
  }

  getNode(key: string): string | null {
    throw new Error("TODO: implement getNode");
  }

  /** First `count` DISTINCT nodes clockwise from the key's position. */
  getNodes(key: string, count: number): string[] {
    throw new Error("TODO: implement getNodes");
  }
}
