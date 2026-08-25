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
      executed: string[];        // steps that ran BEFORE the failure
      compensated: string[];     // compensations that ran, reverse order
      compensationErrors: Array<{ step: string; message: string }>;
      error: Error;              // the original failure
    };

/**
 * Execute steps in order, threading one shared mutable ctx.
 * On failure: compensate EXECUTED steps in REVERSE order — keep going even
 * if compensations throw (collect them); the ORIGINAL error wins the report.
 */
export function runSaga(def: SagaDefinition, ctx?: Record<string, unknown>): Promise<SagaOutcome> {
  throw new Error("TODO: implement runSaga");
}

// ── Part 2: CQRS projector (real PostgreSQL via pool) ────────────────────

export type PostEventKind = "post.created" | "title.changed" | "comment.added";

export async function appendEvent(
  pool: import("pg").Pool,
  event: { postId: number; kind: PostEventKind; payload?: Record<string, unknown> },
): Promise<void> {
  throw new Error("TODO: implement appendEvent");
}

/** Fold all events past the watermark into post_summary; return count applied. */
export async function projectOnce(pool: import("pg").Pool): Promise<number> {
  throw new Error("TODO: implement projectOnce");
}

export async function readModel(
  pool: import("pg").Pool,
  postId: number,
): Promise<{ postId: number; title: string | null; commentCount: number } | null> {
  throw new Error("TODO: implement readModel");
}
