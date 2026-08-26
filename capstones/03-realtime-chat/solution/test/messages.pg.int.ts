import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PgMessageStore } from "../src/adapters/pg-message-store";
import type { ChatMessage } from "../src/ports/message-store";

/**
 * INTEGRATION SUITE — needs a real Postgres, so vitest's *.spec.ts include
 * deliberately skips it. Run against docker compose:
 *
 *   docker compose up -d db
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/chat \
 *     pnpm exec vitest run test/messages.pg.int.ts
 */
const hasDatabase = Boolean(process.env.DATABASE_URL);
const suite = hasDatabase ? describe : describe.skip;

suite("PgMessageStore (integration)", () => {
  let pool: Pool;
  let store: PgMessageStore;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // The suite owns its schema so it can run against a scratch database.
    const migration = await readFile(path.join(process.cwd(), "db/migrations/0001_init.sql"), "utf8");
    await pool.query(migration);
    store = new PgMessageStore(pool);
  });

  beforeEach(async () => {
    await pool.query("truncate messages");
  });

  afterAll(async () => {
    await pool.end();
  });

  const msg = (n: number): ChatMessage => ({
    id: randomUUID(),
    roomId: "room-int",
    userId: `user-${n}`,
    text: `msg-${String(n).padStart(3, "0")}`,
    ts: new Date(Date.parse("2026-01-01T00:00:00.000Z") + n * 1000).toISOString(),
  });

  it("appends and pages newest-first with working cursors", async () => {
    const seed = Array.from({ length: 7 }, (_, i) => msg(i));
    for (const m of seed) await store.append(m);

    const pageOne = await store.page("room-int", 3);
    expect(pageOne.messages.map((m) => m.text)).toEqual(["msg-006", "msg-005", "msg-004"]);
    expect(pageOne.nextCursor).not.toBeNull();

    const pageTwo = await store.page("room-int", 3, pageOne.nextCursor);
    expect(pageTwo.messages.map((m) => m.text)).toEqual(["msg-003", "msg-002", "msg-001"]);

    const pageThree = await store.page("room-int", 3, pageTwo.nextCursor);
    expect(pageThree.messages.map((m) => m.text)).toEqual(["msg-000"]);
    expect(pageThree.nextCursor).toBeNull();
  });

  it("ignores duplicate appends via the primary key", async () => {
    const first = msg(1);
    await store.append(first);
    const again = await store.append(first); // retried write-behind delivery

    expect(again.id).toBe(first.id);
    const page = await store.page(first.roomId, 10);
    expect(page.messages).toHaveLength(1);
  });

  it("returns empty pages for unknown rooms and unreadable cursors", async () => {
    expect(await store.page("missing-room", 5)).toEqual({ messages: [], nextCursor: null });
    const seeded = await store.append(msg(1));
    const page = await store.page(seeded.roomId, 5, "garbage-cursor");
    expect(page.messages.map((m) => m.id)).toEqual([seeded.id]);
  });
});
