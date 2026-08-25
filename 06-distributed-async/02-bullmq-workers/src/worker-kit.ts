// ── Resilient BullMQ wrapper ─────────────────────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export interface RetryPolicy {
  attempts?: number;   // TOTAL executions allowed. default 3
  backoffMs?: number;  // fixed delay between tries. default 10 (test-friendly)
}

/**
 * Pure helper: delay before retry AFTER `attempt` failed (1-based).
 * Exponential: backoffMs * 2^(attempt-1), capped at 60_000ms.
 * attempt < 1 → RangeError.
 */
export function nextRetryDelayMs(policy: Required<RetryPolicy>, attempt: number): number {
  throw new Error("TODO: implement nextRetryDelayMs");
}

export interface DeadLetter {
  jobId: string;
  name: string;
  data: unknown;
  failedReason: string;
}

export interface NormalizedJob<T = unknown> {
  id: string;
  name: string;
  data: T;
}

export type Processor<T = unknown> = (job: NormalizedJob<T>) => Promise<unknown>;

export interface AddOptions {
  delayMs?: number;
}

export interface QueueStats {
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface ResilientQueue {
  addJob(name: string, data?: unknown, opts?: AddOptions): Promise<{ id: string }>;
  stats(): Promise<QueueStats>;
  deadLetters(): Promise<DeadLetter[]>;
  close(): Promise<void>;
}

export async function createResilientQueue(opts: {
  redisUrl: string;
  queueName?: string;      // default "tasks"
  policy?: RetryPolicy;
  processor: Processor;
}): Promise<ResilientQueue> {
  throw new Error("TODO: implement createResilientQueue");
}
