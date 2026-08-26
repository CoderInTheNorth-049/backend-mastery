import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request, { type Response } from "supertest";
import { buildApp, type AppHandle } from "../src/app";
import { verifyToken } from "../src/domain/hmac-token";
import type { ChatMessage } from "../src/ports/message-store";

let handle: AppHandle;

// Deterministic history: msg-000 oldest ... msg-011 newest.
const SEED: ChatMessage[] = Array.from({ length: 12 }, (_, i) => ({
  id: randomUUID(),
  roomId: "hist",
  userId: `user-${i}`,
  text: `msg-${String(i).padStart(3, "0")}`,
  ts: new Date(Date.parse("2026-01-01T00:00:00.000Z") + i * 1000).toISOString(),
}));

beforeAll(async () => {
  handle = await buildApp({ sweeper: false });
  await new Promise<void>((resolve, reject) => {
    handle.httpServer.once("error", reject);
    handle.httpServer.listen(0, resolve);
  });
  for (const message of SEED) await handle.messageStore.append(message);
});

afterAll(async () => {
  await handle.app.close();
});

describe("REST api (e2e)", () => {
  it("mints verifiable tokens at POST /auth/token", async () => {
    const res = await request(handle.httpServer)
      .post("/auth/token")
      .send({ userId: "dana" })
      .expect(200)
      .expect("Content-Type", /json/);

    const payload = verifyToken(res.body.token as string, "dev-secret");
    expect(payload?.sub).toBe("dana");
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("answers liveness and readiness probes", async () => {
    await request(handle.httpServer).get("/healthz").expect(200, { status: "ok" });
    await request(handle.httpServer).get("/readyz").expect(200, { status: "ready", store: "memory" });
  });

  it("paginates room history newest-first across pages > limit", async () => {
    const collected: ChatMessage[] = [];
    let cursor: string | null = null;
    let pages = 0;

    do {
      // Explicit annotation: the query spread below otherwise forms an
      // inference cycle (cursor <- res <- cursor) under strict mode.
      const res: Response = await request(handle.httpServer)
        .get("/rooms/hist/messages")
        .query({ limit: 5, ...(cursor ? { cursor } : {}) })
        .expect(200);
      expect(res.body.messages.length).toBeLessThanOrEqual(5);
      collected.push(...res.body.messages);
      cursor = res.body.nextCursor;
      pages += 1;
      expect(pages).toBeLessThan(10); // loop guard, not the assertion
    } while (cursor);

    // Concatenated pages reconstruct the full feed in stable (ts,id) desc order.
    expect(collected.map((m) => m.text)).toEqual([...SEED].reverse().map((m) => m.text));
    // The final page says so explicitly.
    expect(cursor).toBeNull();
  });

  it("returns problem+json for bad input, with a request id echoed back", async () => {
    const res = await request(handle.httpServer)
      .get("/rooms/hist/messages?limit=abc")
      .expect(400);

    expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
    expect(res.headers["x-request-id"]).toBeTruthy();
    expect(res.body).toMatchObject({ type: "about:blank", title: "Bad Request", status: 400 });
  });

  it("404s unknown routes in problem+json too", async () => {
    const res = await request(handle.httpServer).get("/nope").expect(404);
    expect(res.body.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/^application\/problem\+json/);
  });
});
