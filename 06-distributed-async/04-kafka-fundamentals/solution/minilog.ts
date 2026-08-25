export interface LogEntry<T> {
  partition: number;
  offset: number;
  key: string | null;
  value: T;
}

// Inlined so the answer key never imports itself through the
// answer-key redirector (self-import breaks under CJS interop).
function fnv1a(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export { fnv1a };

/**
 * In-memory Kafka semantics: key-hash routing, per-partition monotonic
 * offsets, null-key round-robin, windowed consumption by offset.
 */
export class PartitionLog<T> {
  private readonly partitions: Array<Array<LogEntry<T>>>;
  private roundRobin = 0;
  private total = 0;

  constructor(partitions: number) {
    if (!Number.isInteger(partitions) || partitions < 1) {
      throw new RangeError(`partitions must be a positive integer, got ${partitions}`);
    }
    this.partitions = Array.from({ length: partitions }, () => []);
  }

  produce(key: string | null, value: T): { partition: number; offset: number } {
    const partition =
      key === null
        ? this.roundRobin++ % this.partitions.length
        : fnv1a(key) % this.partitions.length;

    const log = this.partitions[partition];
    const offset = log.length; // per-partition counter starts at 0

    log.push({ partition, offset, key, value });
    this.total++;

    return { partition, offset };
  }

  consume(partition: number, fromOffset: number, max: number): Array<LogEntry<T>> {
    this.assertPartition(partition);
    if (max <= 0) return [];

    const log = this.partitions[partition];
    return log.slice(fromOffset, fromOffset + max).filter(Boolean);
  }

  latestOffset(partition: number): number {
    this.assertPartition(partition);
    const log = this.partitions[partition];
    return log.length === 0 ? -1 : log[log.length - 1].offset;
  }

  totalMessages(): number {
    return this.total;
  }

  private assertPartition(partition: number): void {
    if (partition < 0 || partition >= this.partitions.length) {
      throw new RangeError(`partition ${partition} out of range [0..${this.partitions.length - 1}]`);
    }
  }
}
