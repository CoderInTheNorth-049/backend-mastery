// FNV-1a duplicated here so the answer key is fully self-contained
// (cross-folder runtime imports through the answer-key redirector are fragile).
function fnv1a(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export { fnv1a };

export interface RingPoint {
  hash: number;
  node: string;
}

/**
 * Consistent hash ring with virtual nodes.
 *
 * Every node is placed on the ring `virtualNodes` times (as `${node}#${i}`),
 * which smooths the distribution and keeps membership changes cheap:
 * adding/removing a node moves only ~1/N of keys instead of everything.
 */
export class HashRing {
  private points: RingPoint[] = [];
  private nodes = new Set<string>();

  constructor(
    nodes: string[] = [],
    private readonly virtualNodes: number = 150,
    private readonly hash: (key: string) => number = fnv1a,
  ) {
    for (const node of nodes) this.addNode(node);
  }

  addNode(node: string): void {
    if (this.nodes.has(node)) return;
    this.nodes.add(node);

    for (let i = 0; i < this.virtualNodes; i++) {
      this.points.push({ hash: this.hash(`${node}#${i}`), node });
    }
    this.points.sort((a, b) => a.hash - b.hash);
  }

  removeNode(node: string): void {
    if (!this.nodes.has(node)) return;
    this.nodes.delete(node);
    this.points = this.points.filter((p) => p.node !== node);
  }

  getNode(key: string): string | null {
    if (this.points.length === 0) return null;

    const target = this.hash(key);
    // First point clockwise (binary search); wrap around at the end.
    let low = 0;
    let high = this.points.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.points[mid].hash < target) low = mid + 1;
      else high = mid;
    }
    return this.points[low].node;
  }

  getNodes(key: string, count: number): string[] {
    if (this.points.length === 0 || count <= 0) return [];

    const target = this.hash(key);
    const distinct: string[] = [];
    const seen = new Set<string>();

    const start = this.findIndex(target);
    for (let offset = 0; offset < this.points.length && distinct.length < count; offset++) {
      const point = this.points[(start + offset) % this.points.length];
      if (!seen.has(point.node)) {
        seen.add(point.node);
        distinct.push(point.node);
      }
    }
    return distinct;
  }

  private findIndex(target: number): number {
    let low = 0;
    let high = this.points.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.points[mid].hash < target) low = mid + 1;
      else high = mid;
    }
    return low;
  }
}
