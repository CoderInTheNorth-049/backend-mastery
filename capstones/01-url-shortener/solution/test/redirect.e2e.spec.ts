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

describe("M1/M3/M4 redirect flow (e2e)", () => {
  it("create -> 302 redirect (Location + Cache-Control) -> flush -> stats >= 1", async () => {
    const server = app.nest.getHttpServer();

    const created = await request(server).post("/links").send({ url: "https://example.com/page" });
    expect(created.status).toBe(201);
    const { code } = created.body as { code: string; url: string };

    // .redirects(0): we want to inspect the 302 itself, not follow it.
    const redirected = await request(server).get(`/${code}`).redirects(0);
    expect(redirected.status).toBe(302);
    expect(redirected.headers.location).toBe("https://example.com/page");
    expect(redirected.headers["cache-control"]).toBe("public, max-age=300");

    // The click rides the queue until the worker flushes - never a sync write
    // on the hot path.
    expect(await app.flush()).toBe(1);

    const stats = await request(server).get(`/links/${code}/stats`);
    expect(stats.status).toBe(200);
    const counts = stats.body as { total: number; last24h: number };
    expect(counts.total).toBeGreaterThanOrEqual(1);
    expect(counts.last24h).toBeGreaterThanOrEqual(1);
  });

  it("repeat redirects are absorbed by the cache - clicks are not double-counted", async () => {
    const server = app.nest.getHttpServer();
    const { body } = await request(server)
      .post("/links")
      .send({ url: "https://example.com/hot" });

    await request(server).get(`/${body.code}`).redirects(0); // miss: enqueue
    await request(server).get(`/${body.code}`).redirects(0); // hit: no enqueue
    expect(await app.flush()).toBe(1);

    const stats = await request(server).get(`/links/${body.code}/stats`);
    expect((stats.body as { total: number }).total).toBe(1);
  });
});
