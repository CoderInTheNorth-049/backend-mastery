import { Pool } from "pg";
import type { ClickCounts, ClickEvent, ClickStore } from "../../domain/ports";

/**
 * Postgres click store. The clicks table's event_id UUID PRIMARY KEY plus
 * ON CONFLICT DO NOTHING IS the dedupe: queue redelivery (at-least-once) can
 * never create duplicate rows, so no separate inbox table is needed here.
 */
export class PgClickStore implements ClickStore {
  constructor(private readonly pool: Pool) {}

  async bulkInsert(events: ClickEvent[]): Promise<void> {
    if (events.length === 0) return;
    const values: unknown[] = [];
    const tuples = events.map((evt, i) => {
      const b = i * 5;
      values.push(
        evt.eventId,
        evt.code,
        new Date(evt.ts),
        evt.uaHash ?? null,
        evt.country ?? null,
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
    });
    await this.pool.query(
      `INSERT INTO clicks (event_id, code, ts, ua_hash, country)
       VALUES ${tuples.join(", ")}
       ON CONFLICT (event_id) DO NOTHING`,
      values,
    );
  }

  async aggregateByCode(code: string): Promise<ClickCounts> {
    // Pre-aggregated counts only (M3): one filtered-COUNT query over the
    // (code, ts DESC) index - stats never scans or returns raw events.
    const { rows } = await this.pool.query<{ total: number; last24h: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE ts > now() - interval '24 hours')::int AS "last24h"
       FROM clicks
       WHERE code = $1`,
      [code],
    );
    const row = rows[0];
    return { total: row?.total ?? 0, last24h: row?.last24h ?? 0 };
  }
}
