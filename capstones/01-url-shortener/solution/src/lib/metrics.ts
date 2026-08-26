import client from "prom-client";
import type { CacheMetrics } from "../domain/ports";

/**
 * Prometheus registry (M6). Cache hit/miss counters are plain numbers here and
 * the gauge is derived at scrape time - keeps the domain free of prom-client.
 */
export class AppMetrics implements CacheMetrics {
  readonly registry = new client.Registry();
  readonly httpDuration: client.Histogram<string>;
  private readonly cacheHitRatioGauge: client.Gauge<string>;
  private readonly queueDepthGauge: client.Gauge<string>;
  private hits = 0;
  private misses = 0;

  constructor() {
    // Buckets chosen around the SLO from the build guide: redirect p95 < 15ms
    // local; the upper buckets exist to make regressions visible.
    this.httpDuration = new client.Histogram({
      name: "http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "status_code"] as const,
      buckets: [0.001, 0.005, 0.01, 0.015, 0.05, 0.1, 0.3, 1],
      registers: [this.registry],
    });
    this.cacheHitRatioGauge = new client.Gauge({
      name: "cache_hit_ratio",
      help: "Share of redirect lookups served without touching the link store",
      registers: [this.registry],
    });
    this.queueDepthGauge = new client.Gauge({
      name: "queue_depth",
      help: "Click events buffered, not yet flushed to storage",
      registers: [this.registry],
    });
  }

  recordCacheHit(): void {
    this.hits += 1;
    this.publishHitRatio();
  }

  recordCacheMiss(): void {
    this.misses += 1;
    this.publishHitRatio();
  }

  ratio(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  setQueueDepth(depth: number): void {
    this.queueDepthGauge.set(depth);
  }

  observeHttp(method: string, route: string, statusCode: number, seconds: number): void {
    this.httpDuration.observe({ method, route, status_code: String(statusCode) }, seconds);
  }

  async render(): Promise<string> {
    this.publishHitRatio();
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  private publishHitRatio(): void {
    this.cacheHitRatioGauge.set(this.ratio());
  }
}
