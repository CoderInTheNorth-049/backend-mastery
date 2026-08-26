import { Pool } from "pg";
import { decodeCursor, encodeCursor } from "../domain/cursor";
import type { ChatMessage, MessagePage, MessageStore } from "../ports/message-store";

interface MessageRow {
  id: string;
  room_id: string;
  user_id: string;
  text: string;
  ts: Date | string;
}

const toIso = (ts: Date | string): string => (ts instanceof Date ? ts.toISOString() : new Date(ts).toISOString());

/**
 * Postgres adapter behind the MESSAGE_STORE port. Keyset pagination:
 * WHERE (ts, id) < (cursor.ts, cursor.id) walks the (room_id, ts DESC)
 * index and is immune to offset drift when new messages land mid-scroll.
 */
export class PgMessageStore implements MessageStore {
  constructor(private readonly pool: Pool) {}

  // PK conflict = duplicate delivery from a retried write-behind job: keep
  // the first copy, dedupe by id for free.
  async append(message: ChatMessage): Promise<ChatMessage> {
    const result = await this.pool.query<MessageRow>(
      `insert into messages (id, room_id, user_id, text, ts)
       values ($1, $2, $3, $4, $5::timestamptz)
       on conflict (id) do nothing
       returning id, room_id, user_id, text, ts`,
      [message.id, message.roomId, message.userId, message.text, message.ts],
    );
    if (result.rows.length === 0) return message;
    const row = result.rows[0];
    return { id: row.id, roomId: row.room_id, userId: row.user_id, text: row.text, ts: toIso(row.ts) };
  }

  async page(roomId: string, limit: number, cursor?: string | null): Promise<MessagePage> {
    const params: unknown[] = [roomId];
    let where = "room_id = $1";

    const decoded = decodeCursor(cursor);
    if (decoded) {
      params.push(decoded.ts, decoded.id);
      where += ` and (ts, id) < ($${params.length - 1}::timestamptz, $${params.length})`;
    }

    params.push(limit + 1); // one extra row answers "is there a next page?" cheaply
    const result = await this.pool.query<MessageRow>(
      `select id, room_id, user_id, text, ts
       from messages
       where ${where}
       order by ts desc, id desc
       limit $${params.length}`,
      params,
    );

    const rows = result.rows.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      text: row.text,
      ts: toIso(row.ts),
    }));
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      messages: page,
      nextCursor: hasMore && last ? encodeCursor({ ts: last.ts, id: last.id }) : null,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
