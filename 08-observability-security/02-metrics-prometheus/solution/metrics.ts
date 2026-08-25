import { Counter, Gauge, Histogram, Registry } from "prom-client";

export interface HttpMetrics {
  requestsTotal: Counter;
  requestDuration: Histogram;
  inflight: Gauge;
}

export function createHttpMetrics(registry: Registry): HttpMetrics {
  const requestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total HTTP requests processed",
    labelNames: ["method", "route", "status"] as const,
    registers: [registry],
  });

  const requestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route"] as const,
    // Bounds chosen for typical API latency SLOs (sub-second world).
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  const inflight = new Gauge({
    name: "http_requests_inflight",
    help: "Requests currently being served",
    registers: [registry],
  });

  return { requestsTotal, requestDuration, inflight };
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
  metrics.requestsTotal.inc(
    { method: labels.method, route: labels.route, status: String(labels.status) },
  );
  metrics.requestDuration.observe(
    { method: labels.method, route: labels.route },
    durationSeconds,
  );
}

export async function renderMetrics(registry: Registry): Promise<string> {
  return registry.metrics();
}
