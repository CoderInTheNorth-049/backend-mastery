// ── Part 1: saga orchestrator (pure statechart) ──────────────────────────

export interface SagaStep {
  name: string;
  execute(ctx: Record<string, unknown>): Promise<void>;
  /** Business-level undo. Absent ⇒ step is a pivot or needs no undo. */
  compensate?(ctx: Record<string, unknown>): Promise<void>;
}

export interface SagaDefinition {
  name: string;
  steps: SagaStep[];
}

export type SagaOutcome =
  | { status: "completed"; executed: string[] }
  | {
      status: "compensated";
      executed: string[];
      compensated: string[];
      compensationErrors: Array<{ step: string; message: string }>;
      error: Error;
    };

/**
 * Forward pass executes steps in order sharing one ctx. On the first
 * failure, unwind: compensations run in REVERSE order over executed steps,
 * never aborting early — compensation failures are collected, and the
 * original error is what the outcome reports.
 */
export async function runSaga(
  def: SagaDefinition,
  ctx: Record<string, unknown> = {},
): Promise<SagaOutcome> {
  const executed: Array<SagaStep> = [];
  const executedNames: string[] = [];

  for (const step of def.steps) {
    try {
      await step.execute(ctx);
      executed.push(step);
      executedNames.push(step.name);
    } catch (error) {
      const original =
        error instanceof Error ? error : new Error(String(error));

      const compensated: string[] = [];
      const compensationErrors: Array<{ step: string; message: string }> = [];

      // Reverse unwind — isolation is already lost; finish the job anyway.
      for (const done of [...executed].reverse()) {
        if (!done.compensate) continue;
        try {
          await done.compensate(ctx);
          compensated.push(done.name);
        } catch (compError) {
          compensationErrors.push({
            step: done.name,
            message: compError instanceof Error ? compError.message : String(compError),
          });
        }
      }

      return {
        status: "compensated",
        executed: executedNames,
        compensated,
        compensationErrors,
        error: original,
      };
    }
  }

  return { status: "completed", executed: executedNames };
}

// ── Part 2: CQRS projector (real PostgreSQL via pool) ────────────────────

export type PostEventKind = "post.created" | "title.changed" | "comment.added";

/**
 * Fold rules applied in event order:
 *   post.created   → upsert row (title from payload.title, count 0)
 *   title.changed  → update title
 *   comment.added  → comment_count + 1 (row auto-created if missing)
 */
export async function appendEvent(
  pool: import("pg").Pool,
  event: { postId: number; kind: PostEventKind; payload?: Record<string, unknown> },
): Promise<void> {
  await pool.query(`INSERT INTO post_events (post_id, kind, payload) VALUES ($1, $2, $3)`, [
    event.postId,
    event.kind,
    JSON.stringify(event.payload ?? {}),
  ]);
}

export async function projectOnce(pool: import("pg").Pool): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const watermark = await client.query<{ last_event: string }>(
      `SELECT last_event FROM projector_state WHERE model = 'post-summary'`,
    );
    const since = watermark.rows[0] ? Number(watermark.rows[0].last_event) : 0;

    const pending = await client.query<{
      id: string;
      post_id: number;
      kind: string;
      payload: Record<string, unknown>;
    }>(
      `SELECT id, post_id, kind, payload FROM post_events WHERE id > $1 ORDER BY id`,
      [since],
    );

    for (const event of pending.rows) {
      const postId = event.post_id;

      if (event.kind === "post.created") {
        const title = String((event.payload as { title?: unknown }).title ?? "");
        await client.query(
          `INSERT INTO post_summary (post_id, title, comment_count)
           VALUES ($1, $2, 0)
           ON CONFLICT (post_id) DO UPDATE SET title = EXCLUDED.title`,
          [postId, title],
        );
      } else if (event.kind === "title.changed") {
        const title = String((event.payload as { title?: unknown }).title ?? "");
        await client.query(`UPDATE post_summary SET title = $2 WHERE post_id = $1`, [
          postId,
          title,
        ]);
      } else if (event.kind === "comment.added") {
        await client.query(
          `INSERT INTO post_summary (post_id, title, comment_count)
           VALUES ($1, NULL, 1)
           ON CONFLICT (post_id) DO UPDATE SET comment_count = post_summary.comment_count + 1`,
          [postId],
        );
      }
    }

    if (pending.rows.length > 0) {
      const newWatermark = pending.rows[pending.rows.length - 1].id;
      await client.query(
        `INSERT INTO projector_state (model, last_event)
         VALUES ('post-summary', $1)
         ON CONFLICT (model) DO UPDATE SET last_event = $1`,
        [newWatermark],
      );
    }

    await client.query("COMMIT");
    return pending.rows.length;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function readModel(
  pool: import("pg").Pool,
  postId: number,
): Promise<{ postId: number; title: string | null; commentCount: number } | null> {
  const { rows } = await pool.query<{
    post_id: number;
    title: string | null;
    comment_count: number;
  }>(`SELECT post_id, title, comment_count FROM post_summary WHERE post_id = $1`, [postId]);

  const row = rows[0];
  return row
    ? { postId: row.post_id, title: row.title, commentCount: row.comment_count }
    : null;
}
