import type { ClickCounts, ClickEvent, ClickStore, Clock } from "../../domain/ports";
import { SYSTEM_CLOCK } from "../../lib/clock";

const DAY_MS = 24 * 60 * 60 * 1000;

/** In-memory click table. bulkInsert is append-only and idempotent per flush. */
export class MemClickStore implements ClickStore {
  private readonly events: ClickEvent[] = [];

  constructor(private readonly clock: Clock = SYSTEM_CLOCK) {}

  async bulkInsert(events: ClickEvent[]): Promise<void> {
    this.events.push(...events);
  }

  /** Mirrors the SQL shape: filtered COUNTs, no raw event lists escape. */
  async aggregateByCode(code: string): Promise<ClickCounts> {
    const cutoff = this.clock.now() - DAY_MS;
    let total = 0;
    let last24h = 0;
    for (const evt of this.events) {
      if (evt.code !== code) continue;
      total += 1;
      if (evt.ts > cutoff) last24h += 1;
    }
    return { total, last24h };
  }
}
