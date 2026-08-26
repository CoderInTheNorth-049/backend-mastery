import { Queue, Worker } from "bullmq";
import type { ConnectionOptions, JobsOptions, Processor } from "bullmq";
import type { ClickEvent, ClickQueue } from "../../domain/ports";
import { FLUSH_BATCH_SIZE } from "../../domain/click-worker";

export const CLICK_QUEUE_NAME = "clicks";

/**
 * BullMQ producer + worker skeleton (M3 in real-adapters mode).
 *
 * - Producer: jobId = eventId so BullMQ drops duplicate jobs while one with
 *   that id is still pending/completed (first dedupe layer; the clicks-table
 *   PK is the second).
 * - Worker skeleton: BullMQ hands over one job at a time; a full deployment
 *   accumulates jobs per tick and bulk-inserts in FLUSH_BATCH_SIZE chunks
 *   (phase-01 pool discipline). The skeleton inserts each job's batch as it
 *   arrives via the injected callback.
 */
export class BullmqClickQueue implements ClickQueue {
  private readonly queue: Queue<ClickEvent>;
  private worker?: Worker<ClickEvent>;

  constructor(
    connection: ConnectionOptions,
    private readonly insertBatch: (events: ClickEvent[]) => Promise<void>,
  ) {
    this.queue = new Queue<ClickEvent>(CLICK_QUEUE_NAME, { connection });
  }

  async enqueue(evt: ClickEvent): Promise<void> {
    const opts: JobsOptions = {
      jobId: evt.eventId,
      removeOnComplete: true,
      removeOnFail: true,
    };
    await this.queue.add("click", evt, opts);
  }

  startWorker(connection: ConnectionOptions): void {
    const processor: Processor<ClickEvent> = async (job) => {
      // Batch-of-one until the accumulation window lands; the flush contract
      // (dedupe by eventId) is enforced downstream by the store.
      await this.insertBatch([job.data]);
    };
    this.worker = new Worker<ClickEvent>(CLICK_QUEUE_NAME, processor, {
      connection,
      concurrency: 10,
    });
  }

  async waitingCount(): Promise<number> {
    return this.queue.getWaitingCount();
  }

  async close(): Promise<void> {
    if (this.worker !== undefined) await this.worker.close();
    await this.queue.close();
  }
}
