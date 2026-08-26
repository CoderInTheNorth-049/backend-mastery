import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, type Socket as ClientSocket } from "socket.io-client";
import { buildApp, type AppHandle } from "../src/app";
import { signToken } from "../src/domain/hmac-token";

// Real gateway, real socket.io server and clients, ephemeral port: this is
// the two-browser demo, scripted.
const ROOM = "room-e2e";

let handle: AppHandle;
let url: string;
const clients: ClientSocket[] = [];

beforeAll(async () => {
  handle = await buildApp({ sweeper: false });
  await new Promise<void>((resolve, reject) => {
    handle.httpServer.once("error", reject);
    handle.httpServer.listen(0, () => resolve());
  });
  const address = handle.httpServer.address();
  if (address === null || typeof address === "string") throw new Error("expected a tcp address");
  url = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  for (const client of clients.splice(0)) client.close();
  await handle.app.close();
});

function tokenFor(userId: string): string {
  return signToken({ sub: userId, exp: Math.floor(Date.now() / 1000) + 600 }, "dev-secret");
}

function connectClient(userId: string): ClientSocket {
  const client = connect(url, {
    auth: { token: tokenFor(userId) },
    transports: ["websocket"],
    reconnection: false,
  });
  clients.push(client);
  return client;
}

function nextEvent<T = unknown>(client: ClientSocket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const on = (payload: T): void => {
      clearTimeout(timer);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      client.off(event, on);
      reject(new Error(`timeout waiting for "${event}"`));
    }, timeoutMs);
    client.on(event, on);
  });
}

function emitAck<T = { ok: boolean }>(
  client: ClientSocket,
  event: string,
  payload: unknown,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ack for "${event}"`)), timeoutMs);
    client.emit(event, payload, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

describe("chat gateway (e2e)", () => {
  it("rejects an invalid handshake token with UNAUTHORIZED then disconnects", async () => {
    const intruder = connect(url, {
      auth: { token: "forged" },
      transports: ["websocket"],
      reconnection: false,
    });
    clients.push(intruder);

    const [err] = await Promise.all([
      nextEvent<{ code: string }>(intruder, "error"),
      nextEvent(intruder, "disconnect"),
    ]);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("delivers messages between joined peers with id/ts, and broadcasts presence", async () => {
    const alice = connectClient("alice");
    const bob = connectClient("bob");

    // Presence frames arrive before the join ack that triggered them
    // (same-socket ordering), so collecting through both acks is race-free.
    const presenceFeeds: string[][] = [];
    bob.on("presence", (payload: { online: string[] }) => presenceFeeds.push(payload.online));

    await emitAck(bob, "join", { roomId: ROOM });
    await emitAck(alice, "join", { roomId: ROOM });
    expect(presenceFeeds.at(-1)).toEqual(["alice", "bob"]);

    const inbound = nextEvent<{ id: string; roomId: string; userId: string; text: string; ts: string }>(
      bob,
      "message",
    );
    const ack = await emitAck<{ ok: boolean; id?: string }>(alice, "message", {
      roomId: ROOM,
      text: "hello world",
    });
    expect(ack.ok).toBe(true);

    const received = await inbound;
    expect(received).toMatchObject({ roomId: ROOM, userId: "alice", text: "hello world" });
    expect(received.id).toEqual(ack.id);
    expect(Number.isNaN(Date.parse(received.ts))).toBe(false);
  });

  it("rate limits the sixth rapid message with RATE_LIMITED", async () => {
    const carol = connectClient("carol"); // fresh user => fresh bucket
    await emitAck(carol, "join", { roomId: ROOM });

    const errors: string[] = [];
    carol.on("error", (payload: { code: string }) => errors.push(payload.code));

    const results: Array<{ ok: boolean }> = [];
    for (let i = 0; i < 6; i++) {
      results.push(await emitAck(carol, "message", { roomId: ROOM, text: `m${i}` }));
    }

    expect(results.slice(0, 5).map((r) => r.ok)).toEqual([true, true, true, true, true]);
    expect(results[5].ok).toBe(false);
    expect(errors).toContain("RATE_LIMITED");
  });

  it("rejects malformed messages without burning a rate-limit token", async () => {
    const dave = connectClient("dave");
    await emitAck(dave, "join", { roomId: ROOM });

    const errors: string[] = [];
    dave.on("error", (payload: { code: string }) => errors.push(payload.code));

    await emitAck(dave, "message", { roomId: ROOM, text: "   " }); // empty after trim
    expect(errors).toContain("VALIDATION");

    // Bucket untouched by the rejected message: the full burst still fits.
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      results.push((await emitAck(dave, "message", { roomId: ROOM, text: `ok ${i}` })).ok);
    }
    expect(results).toEqual([true, true, true, true, true]);
  });
});

describe("server module sanity", () => {
  it("exposes the http server socket.io attached to", () => {
    expect(handle.httpServer.listening).toBe(true);
    expect(url).toMatch(/127\.0\.0\.1:\d+/);
  });
});
