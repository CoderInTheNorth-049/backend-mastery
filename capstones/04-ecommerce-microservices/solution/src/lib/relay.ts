import { randomUUID } from "node:crypto";
import type { EventBusPort } from "./event-bus.port";
import type { OutboxStorePort } from "./outbox";

export class OutboxRelay {
  constructor(
    private readonly store: OutboxStorePort,
    private readonly bus: EventBusPort,
    private readonly maxPasses = 100,
  ) {}

  // In production this is at-least-once: a crash between publish and
  // markPublished replays the row. Downstream inbox dedupe is what turns the
  // replay into effectively-once side effects - never the relay itself.
  async tick(): Promise<number> {
    let published = 0;
    for (let pass = 0; pass < this.maxPasses; pass += 1) {
      const batch = this.store.pending();
      if (batch.length === 0) return published;
      for (const row of batch) {
        await this.bus.publish({ ...row.payload, eventId: row.eventId, topic: row.topic });
        this.store.markPublished(row.eventId);
        published += 1;
      }
    }
    throw new Error(`outbox did not drain after ${this.maxPasses} passes`);
  }
}
