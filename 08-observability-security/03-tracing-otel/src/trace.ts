// ── Instrumented checkout flow ───────────────────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

import type { Tracer } from "@opentelemetry/api";

export interface CheckoutDeps {
  dbQuery(): Promise<unknown>;
  publish(): Promise<void>;
}

/**
 * Flow (using the GLOBAL tracer, tracer name "checkout"):
 *   root span  "http.post /checkout"        — wraps everything; attribute
 *             http.method=POST, http.route=/checkout
 *   child span "db.query"                   — wraps deps.dbQuery();
 *             attribute db.system=postgres
 *   child span "queue.publish"              — wraps deps.publish()
 *
 * Children are created INSIDE the root's active context (proper parenting).
 * If publish() throws: record exception on that span, set ERROR status,
 * rethrow. Every span ends exactly once, even on failure.
 */
export function handleCheckout(deps: CheckoutDeps, tracer?: Tracer): Promise<void> {
  throw new Error("TODO: implement handleCheckout");
}
