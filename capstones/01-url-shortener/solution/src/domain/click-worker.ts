import type { ClickDrain, ClickEvent, ClickStore } from "./ports";

/** Cap per bulk INSERT - matches the pg adapter's statement sizing. */
export const FLUSH_BATCH_SIZE = 100;

export interface FlushOptions {
  batchSize?: number;
}

/**
 * Worker flush (M3): drain the queue in bounded batches, dedupe by eventId
 * (first wins), bulk-insert. Dedupe here covers redelivery WITHIN one flush
 * window; across restarts the store's event_id primary key is the final
 * arbiter (pg uses ON CONFLICT DO NOTHING).
 *
 * Events are taken off the queue before the insert, so a crash mid-flush
 * drops that batch - the accepted tradeoff for click analytics. A durable
 * deployment would ack jobs only after insert (the BullMQ worker does).
 */
export async function flushClicks(
  drain: ClickDrain,
  store: ClickStore,
  options: FlushOptions = {},
): Promise<{ inserted: number }> {
  const batchSize = options.batchSize ?? FLUSH_BATCH_SIZE;
  const seen = new Set<string>();
  let inserted = 0;

  for (;;) {
    const batch = drain.take(batchSize);
    if (batch.length === 0) break;

    const unique: ClickEvent[] = [];
    for (const evt of batch) {
      if (!seen.has(evt.eventId)) {
        seen.add(evt.eventId);
        unique.push(evt);
      }
    }
    if (unique.length > 0) {
      await store.bulkInsert(unique);
      inserted += unique.length;
    }
  }
  return { inserted };
}
