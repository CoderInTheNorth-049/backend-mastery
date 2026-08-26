import { describe, expect, it } from "vitest";
import { AppMetrics } from "./metrics";

describe("AppMetrics", () => {
  it("renders the three M6 series even before traffic", async () => {
    const metrics = new AppMetrics();
    const body = await metrics.render();
    expect(body).toContain("cache_hit_ratio");
    expect(body).toContain("queue_depth");
    expect(body).toContain("http_request_duration_seconds");
    expect(body).toMatch(/cache_hit_ratio 0/);
  });

  it("feeds hit-ratio accounting into the gauge", async () => {
    const metrics = new AppMetrics();
    metrics.recordCacheHit();
    for (let i = 0; i < 3; i++) metrics.recordCacheMiss();
    expect(metrics.ratio()).toBeCloseTo(0.25);

    const body = await metrics.render();
    expect(body).toMatch(/cache_hit_ratio 0\.25/);
  });

  it("records http durations with method/route/status labels", async () => {
    const metrics = new AppMetrics();
    metrics.observeHttp("GET", "/:code", 302, 0.002);
    const body = await metrics.render();
    expect(body).toContain('method="GET"');
    expect(body).toContain('route="/:code"');
    expect(body).toContain('status_code="302"');
  });

  it("publishes queue depth at scrape time", async () => {
    const metrics = new AppMetrics();
    metrics.setQueueDepth(7);
    expect(await metrics.render()).toMatch(/queue_depth 7/);
  });
});
