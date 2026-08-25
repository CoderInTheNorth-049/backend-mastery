import type Redis from "ioredis";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

export interface RetryPolicy {
  attempts?: number;
  backoffMs?: number;
}

const MAX_BACKOFF_MS = 60_000;

/** Exponential delay after the `attempt`-th failure, capped at one minute. */
export function nextRetryDelayMs(
  policy: Required<RetryPolicy>,
  attempt: number,
): number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError(`attempt must be a positive integer, got ${attempt}`);
  }
  return Math.min(policy.backoffMs * 2 ** (attempt - 1), MAX_BACKOFF_MS);
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
  queueName?: string;
  policy?: RetryPolicy;
  processor: Processor;
}): Promise<ResilientQueue> {
  const queueName = opts.queueName ?? "tasks";
  const policy: Required<RetryPolicy> = {
    attempts: opts.policy?.attempts ?? 3,
    backoffMs: opts.policy?.backoffMs ?? 10,
  };

  // BullMQ blocking waits require an unlimited per-request retry ceiling.
  const connection = new IORedis(opts.redisUrl, {
    maxRetriesPerRequest: null,
  }) as unknown as Redis;

  const queue = new Queue(queueName, { connection });

  const dlqKey = `dlq:${queueName}`;
  let closed = false;

  const worker = new Worker(
    queueName,
    async (job) =>
      opts.processor({ id: job.id!, name: job.name, data: job.data }),
    { connection, concurrency: 1 }, // concurrency=1 keeps completion order deterministic
  );

  // Route exhausted jobs into our DLQ mirror — bounded retries, visible corpses.
  worker.on("failed", async (job, error) => {
    if (!job) return;
    if (job.attemptsMade < policy.attempts) return;

    const deadLetter: DeadLetter = {
      jobId: job.id!,
      name: job.name,
      data: job.data,
      failedReason: error?.message ?? String(error),
    };
    await connection.lpush(dlqKey, JSON.stringify(deadLetter));
  });

  return {
    async addJob(name, data, addOpts) {
      const job = await queue.add(
        name,
        data ?? {},
        {
          attempts: policy.attempts,
          backoff: { type: "fixed", delay: policy.backoffMs },
          ...(addOpts?.delayMs !== undefined ? { delay: addOpts.delayMs } : {}),
        },
      );
      return { id: job.id! };
    },

    async stats() {
      const counts = await queue.getJobCounts("waiting", "completed", "failed", "delayed");
      return {
        waiting: counts.waiting ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
      };
    },

    async deadLetters() {
      const raw = await connection.lrange(dlqKey, 0, -1);
      return raw.map((line) => JSON.parse(line) as DeadLetter).reverse();
    },

    async close() {
      if (closed) return;
      closed = true;
      await worker.close();
      await queue.close();
      connection.disconnect();
    },
  };
}
