export interface OutboxRow {
  eventId: string;
  topic: string;
  payload: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
}

export interface OutboxStorePort {
  append(topic: string, payload: Record<string, unknown>): OutboxRow;
  pending(): OutboxRow[];
  markPublished(eventId: string): void;
}

export class MemOutboxStore implements OutboxStorePort {
  private rows: OutboxRow[] = [];

  append(topic: string, payload: Record<string, unknown>): OutboxRow {
    const row: OutboxRow = {
      eventId: crypto.randomUUID(),
      topic,
      payload,
      createdAt: new Date().toISOString(),
      publishedAt: null,
    };
    this.rows.push(row);
    return row;
  }

  pending(): OutboxRow[] {
    return this.rows.filter((row) => row.publishedAt === null);
  }

  markPublished(eventId: string): void {
    const row = this.rows.find((candidate) => candidate.eventId === eventId);
    if (row && row.publishedAt === null) {
      row.publishedAt = new Date().toISOString();
    }
  }
}
