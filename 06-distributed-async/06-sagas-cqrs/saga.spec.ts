import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DATABASE_URL, HAS_DB } from "../../03-databases/test-support/env";
import { runSaga, type SagaDefinition } from "./src/saga";
import { appendEvent, projectOnce, readModel } from "./src/saga";

describe("runSaga — orchestration semantics (pure)", () => {
  it("executes all steps in order with a shared ctx", async () => {
    const calls: string[] = [];
    const def: SagaDefinition = {
      name: "order",
      steps: [
        { name: "charge", execute: async (ctx) => void (calls.push("charge"), (ctx.chargeId = "ch_1")) },
        { name: "reserve", execute: async (ctx) => void calls.push(`reserve:${ctx.chargeId}`) },
      ],
    };

    const outcome = await runSaga(def, {});
    expect(outcome).toEqual({ status: "completed", executed: ["charge", "reserve"] });
    expect(calls).toEqual(["charge", "reserve:ch_1"]);
  });

  it("compensates executed steps in REVERSE on failure", async () => {
    const calls: string[] = [];
    const def: SagaDefinition = {
      name: "order",
      steps: [
        { name: "reserve", execute: async () => {}, compensate: async () => void calls.push("unreserve") },
        { name: "charge", execute: async () => {}, compensate: async () => void calls.push("refund") },
        {
          name: "ship",
          execute: async () => {
            throw new Error("no drivers");
          },
        },
        // never reached; has no compensation anyway
        { name: "notify", execute: async () => {} },
      ],
    };

    const outcome = await runSaga(def);

    expect(outcome.status).toBe("compensated");
    if (outcome.status === "compensated") {
      expect(outcome.executed).toEqual(["reserve", "charge"]);
      expect(outcome.compensated).toEqual(["charge", "reserve"]); // reverse!
      expect(calls).toEqual(["refund", "unreserve"]);
      expect(outcome.error.message).toBe("no drivers");
    }
  });

  it("skips steps without compensations during unwind but keeps unwinding others", async () => {
    const calls: string[] = [];
    const outcome = await runSaga({
      name: "mixed",
      steps: [
        { name: "with-undo", execute: async () => {}, compensate: async () => void calls.push("undo-1") },
        { name: "pivot-no-undo", execute: async () => {} },
        { name: "with-undo-2", execute: async () => {}, compensate: async () => void calls.push("undo-2") },
        {
          name: "boom",
          execute: async () => {
            throw new Error("fail");
          },
        },
      ],
    });

    if (outcome.status !== "compensated") throw new Error("expected compensated");
    expect(calls).toEqual(["undo-2", "undo-1"]);
    expect(outcome.compensated).toEqual(["with-undo-2", "with-undo"]);
    expect(outcome.compensationErrors).toEqual([]);
  });

  it("keeps compensating when a compensation itself throws; collects errors", async () => {
    const calls: string[] = [];
    const outcome = await runSaga({
      name: "messy",
      steps: [
        { name: "s1", execute: async () => {}, compensate: async () => void calls.push("c1") },
        {
          name: "s2",
          execute: async () => {},
          compensate: async () => {
            calls.push("c2");
            throw new Error("refund provider down");
          },
        },
        {
          name: "s3",
          execute: async () => {
            throw new Error("step failed");
          },
        },
      ],
    });

    if (outcome.status !== "compensated") throw new Error("expected compensated");
    expect(calls).toEqual(["c2", "c1"]); // didn't abort after c2 failed
    expect(outcome.compensationErrors).toEqual([
      { step: "s2", message: "refund provider down" },
    ]);
    expect(outcome.error.message).toBe("step failed"); // original error reported
  });

  it("handles empty definitions and reports completed", async () => {
    const outcome = await runSaga({ name: "noop", steps: [] });
    expect(outcome).toEqual({ status: "completed", executed: [] });
  });
});

// ─────────────────────────────────────────────────────────────────────────

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS post_events (
    id bigserial primary key,
    post_id int not null,
    kind text not null,
    payload jsonb not null default '{}',
    created_at timestamptz default now()
  );
  CREATE TABLE IF NOT EXISTS projector_state (
    model text primary key,
    last_event bigint not null default 0
  );
  CREATE TABLE IF NOT EXISTS post_summary (
    post_id int primary key,
    title text,
    comment_count int not null default 0,
    updated_at timestamptz default now()
  );
`;

describe.skipIf(!HAS_DB)("CQRS projector (real PostgreSQL)", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    await pool.query(SCHEMA);
  });

  beforeEach(async () => {
    await pool.query(`TRUNCATE post_events, projector_state, post_summary RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("folds created/title/comment events into the read model", async () => {
    await appendEvent(pool, { postId: 1, kind: "post.created", payload: { title: "Hello" } });
    await appendEvent(pool, { postId: 1, kind: "comment.added" });
    await appendEvent(pool, { postId: 1, kind: "comment.added" });
    await appendEvent(pool, { postId: 1, kind: "title.changed", payload: { title: "Hello v2" } });

    const applied = await projectOnce(pool);
    expect(applied).toBe(4);

    expect(await readModel(pool, 1)).toEqual({
      postId: 1,
      title: "Hello v2",
      commentCount: 2,
    });
  });

  it("is incremental: second projection applies only new events", async () => {
    await appendEvent(pool, { postId: 5, kind: "post.created", payload: { title: "One" } });
    expect(await projectOnce(pool)).toBe(1);

    await appendEvent(pool, { postId: 5, kind: "comment.added" });
    expect(await projectOnce(pool)).toBe(1); // watermark moved

    expect(await readModel(pool, 5)).toEqual({ postId: 5, title: "One", commentCount: 1 });
  });

  it("projection with no pending events is a zero no-op", async () => {
    expect(await projectOnce(pool)).toBe(0);
  });

  it("unknown posts referenced by comments still materialize rows", async () => {
    await appendEvent(pool, { postId: 9, kind: "comment.added" });
    await projectOnce(pool);
    expect(await readModel(pool, 9)).toEqual({ postId: 9, title: null, commentCount: 1 });
  });

  it("watermark survives concurrent projections without double-applying", async () => {
    await appendEvent(pool, { postId: 2, kind: "post.created", payload: { title: "T" } });
    await Promise.all([projectOnce(pool), projectOnce(pool)]);

    const afterDouble = await readModel(pool, 2);
    expect(afterDouble?.commentCount ?? 0).toBe(0);
    await appendEvent(pool, { postId: 2, kind: "comment.added" });
    await projectOnce(pool);
    expect((await readModel(pool, 2))!.commentCount).toBe(1);
  });
});
