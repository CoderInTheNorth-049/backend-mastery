// ── Error-budget math ────────────────────────────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

/** Allowed failures for a window: floor(totalRequests × (100 − sloPercent) / 100). */
export function allowedErrorCount(totalRequests: number, sloPercent: number): number {
  throw new Error("TODO: implement allowedErrorCount");
}

/** Budget left after observed failures; never below zero. */
export function remainingBudget(
  totalRequests: number,
  failedRequests: number,
  sloPercent: number,
): number {
  throw new Error("TODO: implement remainingBudget");
}

/**
 * Observed error rate ÷ budget rate:
 *   (failed / total) / ((100 − sloPercent) / 100)
 * Zero traffic → 0 (no consumption). Guard division by zero everywhere.
 */
export function computeBurnRate(
  totalRequests: number,
  failedRequests: number,
  sloPercent: number,
): number {
  throw new Error("TODO: implement computeBurnRate");
}

/** Alerting when burnRate meets-or-exceeds the threshold. */
export function isAlerting(burnRate: number, threshold: number): boolean {
  throw new Error("TODO: implement isAlerting");
}
