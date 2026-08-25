import { beforeEach, describe, expect, it } from "vitest";
import { Registry } from "prom-client";
import {
  createHttpMetrics,
  observeRequest,
  renderMetrics,
  type HttpMetrics,
} from "./src/metrics";

describe("createHttpMetrics", () => {
  it("registers counter, histogram and gauge on the provided registry", async () => {
    const registry = new Registry();
    createHttpMetrics(registry);

    const names = (await registry.getMetricsAsJSON()).map((m) => m.name);
    expect(names).toContain("http_requests_total");
    expect(names).toContain("http_request_duration_seconds");
    expect(names).toContain("http_requests_inflight");
  });
});

describe("observeRequest + renderMetrics", () => {
  let metrics: HttpMetrics;
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
    metrics = createHttpMetrics(registry);
  });

  it("counts requests per label set", async () => {
    observeRequest(metrics, { method: "GET", route: "/users/:id", status: 200 }, 0.01);
    observeRequest(metrics, { method: "GET", route: "/users/:id", status: 200 }, 0.02);
    observeRequest(metrics, { method: "POST", route: "/users", status: 201 }, 0.05);

    const text = await renderMetrics(registry);
    expect(text).toContain('http_requests_total{method="GET",route="/users/:id",status="200"} 2');
    expect(text).toContain('http_requests_total{method="POST",route="/users",status="201"} 1');
  });

  it("exposes HELP/TYPE headers in Prometheus text format", async () => {
    observeRequest(metrics, { method: "GET", route: "/x", status: 200 }, 0.01);
    const text = await renderMetrics(registry);

    expect(text).toMatch(/# HELP http_requests_total /);
    expect(text).toMatch(/# TYPE http_requests_total counter/);
    expect(text).toMatch(/# TYPE http_request_duration_seconds histogram/);
    expect(text).toMatch(/# TYPE http_requests_inflight gauge/);
  });

  it("histogram records duration samples (buckets + sum/count)", async () => {
    observeRequest(metrics, { method: "GET", route: "/x", status: 200 }, 0.12);
    observeRequest(metrics, { method: "GET", route: "/x", status: 200 }, 0.14);

    const text = await renderMetrics(registry);
    expect(text).toMatch(/http_request_duration_seconds_count\{[^}]*\} 2/);
    expect(text).toMatch(/http_request_duration_seconds_sum\{[^}]*\} 0\.26/);
    expect(text).toMatch(/_bucket\{le="0\.25"/); // a bucket boundary exists
  });

  it("in-flight gauge inc/dec tracks live traffic", async () => {
    // simulate one request starting (gauge up) but not finished
    metrics.inflight.inc();

    // another finishes
    observeRequest(metrics, { method: "GET", route: "/y", status: 500 }, 0.3);

    const midText = await renderMetrics(registry);
    expect(midText).toContain("http_requests_inflight 1");

    metrics.inflight.dec();
    const endText = await renderMetrics(registry);
    expect(endText).toContain("http_requests_inflight 0");
  });

  it("renders valid exposition format even with zero observations", async () => {
    const text = await renderMetrics(registry);
    expect(text).toMatch(/# HELP http_requests_total/);
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("NaN");
  });
});
