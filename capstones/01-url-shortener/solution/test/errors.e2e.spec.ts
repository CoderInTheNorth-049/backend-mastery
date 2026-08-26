import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, countingLinkStore } from "./helpers";
import type { BuiltApp } from "../src/app";

let app: BuiltApp;

beforeEach(async () => {
  app = await buildTestApp();
});

afterEach(async () => {
  await app.stop();
});

describe("error envelopes and edge paths (e2e)", () => {
  it("invalid url -> 400 problem+json", async () => {
    const res = await request(app.nest.getHttpServer())
      .post("/links")
      .send({ url: "ftp://example.com/file" });

    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body).toMatchObject({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: expect.stringMatching(/http or https/),
    });
  });

  it("unknown code -> 404 problem+json, then the negative cache shields the store", async () => {
    const links = countingLinkStore();
    await app.stop();
    app = await buildTestApp({ linkStore: links });
    const server = app.nest.getHttpServer();

    const first = await request(server).get("/ghost").redirects(0);
    expect(first.status).toBe(404);
    expect(first.headers["content-type"]).toContain("application/problem+json");
    expect(first.body).toMatchObject({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      requestId: expect.any(String),
    });

    // Second identical lookup must be answered by the negative entry:
    // exactly ONE store probe across both requests.
    await request(server).get("/ghost").redirects(0);
    expect(links.findByCodeCalls()).toBe(1);
  });

  it("disabled link -> PATCH commits, cache invalidated, GET returns 404 with detail", async () => {
    const server = app.nest.getHttpServer();
    const { body } = await request(server)
      .post("/links")
      .send({ url: "https://example.com/doomed" });

    await request(server).get(`/${body.code}`).redirects(0); // warm the cache

    const patched = await request(server)
      .patch(`/links/${body.code}`)
      .send({ disabled: true });
    expect(patched.status).toBe(200);
    expect(patched.body).toEqual({ code: body.code, disabled: true });

    const gone = await request(server).get(`/${body.code}`).redirects(0);
    expect(gone.status).toBe(404);
    expect((gone.body as { detail: string }).detail).toMatch(/disabled/);
  });

  it("expired link -> 410 Gone (clock injected by test)", async () => {
    let now = 5_000_000;
    await app.stop();
    app = await buildTestApp({ clock: { now: (): number => now } });
    const server = app.nest.getHttpServer();

    const { body } = await request(server)
      .post("/links")
      .send({ url: "https://example.com/flash", expiresAt: now - 1_000 });
    expect(body.code).toBeTruthy();

    const res = await request(server).get(`/${body.code}`).redirects(0);
    expect(res.status).toBe(410);
    expect((res.body as { title: string }).title).toBe("Gone");
  });

  it("PATCH with unsupported payload -> 400 problem+json", async () => {
    const server = app.nest.getHttpServer();
    const { body } = await request(server)
      .post("/links")
      .send({ url: "https://example.com/x" });

    const res = await request(server).patch(`/links/${body.code}`).send({ disabled: false });
    expect(res.status).toBe(400);
    expect((res.body as { title: string }).title).toBe("Bad Request");
  });
});
