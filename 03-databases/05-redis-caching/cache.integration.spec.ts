import Redis from "ioredis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HAS_REDIS, REDIS_URL } from "../test-support/env";
import { CachedUserRepo, type User } from "./src/cache";
import { RedisCacheClient } from "./src/redis-cache-client";

const USER = { id: "u9", name: "Grace", email: "grace@x.io", version: 3 };

describe.skipIf(!HAS_REDIS)("CachedUserRepo against real Redis", () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis(REDIS_URL);
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    redis.disconnect();
  });

  function makeRepo(
    sourceOverrides: {
      fetch?: (id: string) => Promise<User | null>;
      save?: (user: User) => Promise<void>;
    } = {},
  ) {
    const source = {
      fetch: sourceOverrides.fetch ?? (async (_id: string) => null),
      save: sourceOverrides.save ?? (async () => {}),
    };
    return new CachedUserRepo(source, new RedisCacheClient(redis), 120);
  }

  it("stores real entries with TTL semantics", async () => {
    const repo = makeRepo({ fetch: async (id) => (id === USER.id ? USER : null) });

    await repo.get(USER.id);

    const raw = await redis.get(`user:${USER.id}`);
    expect(JSON.parse(raw!)).toEqual(USER);
    expect(await redis.ttl(`user:${USER.id}`)).toBeGreaterThan(0);
  });

  it("shares cache state across independent repo instances", async () => {
    let fetches = 0;
    const repoA = makeRepo({
      fetch: async () => {
        fetches++;
        return USER;
      },
    });
    const repoB = makeRepo();

    await repoA.get(USER.id); // miss → populate
    const fromB = await repoB.get(USER.id); // must hit A's entry

    expect(fromB).toEqual(USER);
    expect(fetches).toBe(1);
    expect(repoB.stats().hits).toBe(1);
  });

  it("negative entries live in real Redis too", async () => {
    const repo = makeRepo();
    await expect(repo.get("nobody")).resolves.toBeNull();

    expect(await redis.get("user:nobody")).toBe("null");
  });
});

describe.skipIf(!HAS_REDIS)("RedisCacheClient adapter basics", () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis(REDIS_URL);
  });

  afterAll(async () => {
    redis.disconnect();
  });

  it("set without TTL persists; del removes", async () => {
    const client = new RedisCacheClient(redis);

    await client.set("probe:key", "v1");
    expect(await client.get("probe:key")).toBe("v1");
    expect(await redis.ttl("probe:key")).toBe(-1); // no expiry

    await client.del("probe:key");
    expect(await client.get("probe:key")).toBeNull();
  });

  it("set with TTL expires", async () => {
    const client = new RedisCacheClient(redis);

    await client.set("probe:tty", "gone-soon", 1);
    expect(await redis.ttl("probe:tty")).toBeGreaterThan(0);

    await new Promise((r) => setTimeout(r, 1100));
    expect(await client.get("probe:tty")).toBeNull();
  }, 5_000);
});
