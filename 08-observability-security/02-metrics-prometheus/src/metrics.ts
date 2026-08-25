// ── RED metrics module ───────────────────────────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

import type { Counter, Gauge, Histogram, Registry } from "prom-client";

export interface HttpMetrics {
  requestsTotal: Counter;   // labels: method, route, status
  requestDuration: Histogram; // labels: method, route
  inflight: Gauge;
}

export function createHttpMetrics(registry: Registry): HttpMetrics {
  throw new Error("TODO: implement createHttpMetrics");
}

export interface RequestLabels {
  method: string;
  route: string;
  status: number;
}

/** Record one finished request: count it, observe duration, adjust in-flight. */
export function observeRequest(
  metrics: HttpMetrics,
  labels: RequestLabels,
  durationSeconds: number,
): void {
  throw new Error("TODO: implement observeRequest");
}

export async function renderMetrics(registry: Registry): Promise<string> {
  throw new Error("TODO: implement renderMetrics");
}
