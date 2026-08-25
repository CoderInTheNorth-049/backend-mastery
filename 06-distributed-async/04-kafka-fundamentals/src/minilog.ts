// ── Mini Kafka: an in-memory partitioned log ─────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

/**
 * FNV-1a 32-bit — PROVIDED for key→partition routing (good avalanche;
 * djb2-style hashes cluster sequential keys into one partition).
 */
export function fnv1a(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface LogEntry<T> {
  partition: number;
  offset: number;
  key: string | null;
  value: T;
}

export class PartitionLog<T> {
  constructor(partitions: number) {
    throw new Error("TODO: initialize partitions");
  }

  /**
   * Append a message. Key present → fnv1a(key) % partitions.
   * Key null → round-robin across partitions (first produce → partition 0).
   * Returns the assigned position. Offsets are per-partition, starting at 0.
   */
  produce(key: string | null, value: T): { partition: number; offset: number } {
    throw new Error("TODO: implement produce");
  }

  /** Entries with offset >= fromOffset, oldest first, at most `max`. */
  consume(partition: number, fromOffset: number, max: number): Array<LogEntry<T>> {
    throw new Error("TODO: implement consume");
  }

  /** Offset of the LAST message in the partition; -1 when empty. */
  latestOffset(partition: number): number {
    throw new Error("TODO: implement latestOffset");
  }

  /** Total messages across all partitions — handy for tests & metrics. */
  totalMessages(): number {
    throw new Error("TODO: implement totalMessages");
  }
}
