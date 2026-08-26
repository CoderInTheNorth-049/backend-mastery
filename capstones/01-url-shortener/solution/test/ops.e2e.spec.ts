import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers";
import type { BuiltApp } from "../src/app";

let app: BuiltApp;

beforeEach(async () => {
  app = await buildTestApp();
});

afterEach(async () => {
  await app.stop();
});

describe("operational endpoints (e2e)", () => {
  it("GET /healthz is always 200; GET /readyz pings the store", async () => {
    const server = app.nest.getHttpServer();

    const health = await request(server).get("/healthz");
    expect(health.status).toBe(200);

    const ready = await request(server).get("/readyz");
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: "ready" });
  });

  it("echoes caller-supplied X-Request-Id and mints one otherwise", async () => {
    const server = app.nest.getHttpServer();

    const echoed = await request(server).get("/healthz").set("x-request-id", "trace-me-123");
    expect(echoed.headers["x-request-id"]).toBe("trace-me-123");

    const minted = await request(server).get("/healthz");
    // Must parse as a UUID if none was supplied.
    expect(minted.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("GET /metrics exposes hit-ratio, queue depth and http duration after traffic", async () => {
    const server = app.nest.getHttpServer();
    const { body } = await request(server)
      .post("/links")
      .send({ url: "https://example.com/metrics-bait" });

    await request(server).get(`/${body.code}`).redirects(0); // miss
    await request(server).get(`/${body.code}`).redirects(0); // hit -> ratio 1/2

    const res = await request(server).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toMatch(/cache_hit_ratio 0\.5/);
    expect(res.text).toContain("queue_depth 1"); // one buffered click, flush off
    expect(res.text).toContain("http_request_duration_seconds_count");
    expect(res.text).toContain('route="/links"');
  });

  it("serves OpenAPI docs at /docs", async () => {
    const docs = await request(app.nest.getHttpServer()).get("/docs/");
    expect(docs.status).toBe(200);
    expect(docs.headers["content-type"]).toContain("text/html");
  });
});
