import { describe, expect, it, vi } from "vitest";
import {
  createSingleFlight,
  CachedUserRepo,
  userCacheKey,
  type CacheClient,
  type User,
  type UserSource,
} from "./src/cache";

const USER: User = { id: "u1", name: "Ada", email: "ada@x.io", version: 1 };

/** Recording fake — asserts call patterns without any server. */
function fakeCache() {
  const store = new Map<string, string>();
  const calls = { sets: [] as Array<{ key: string; value: string; ttl?: number }>, dels: [] as string[] };
  const client: CacheClient = {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value, ttl) {
      calls.sets.push({ key, value, ttl });
      store.set(key, value);
    },
    async del(key) {
      calls.dels.push(key);
      store.delete(key);
    },
  };
  return { client, store, calls };
}

function fakeSource(existing: Map<string, User>) {
  const fetch = vi.fn(async (id: string) => existing.get(id) ?? null);
  const save = vi.fn(async (user: User) => {
    existing.set(user.id, user);
  });
  return { source: { fetch, save } satisfies UserSource, fetch, save };
}

describe("CachedUserRepo", () => {
  it("miss → source → cache set with TTL passthrough", async () => {
    const { client, calls } = fakeCache();
    const users = new Map([[USER.id, USER]]);
    const { source, fetch } = fakeSource(users);
    const repo = new CachedUserRepo(source, client, 120);

    await expect(repo.get("u1")).resolves.toEqual(USER);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(calls.sets).toEqual([
      { key: "user:u1", value: JSON.stringify(USER), ttl: 120 },
    ]);
  });

  it("second read hits the cache; source stays cold", async () => {
    const { client } = fakeCache();
    const { source, fetch } = fakeSource(new Map([[USER.id, USER]]));
    const repo = new CachedUserRepo(source, client);

    await repo.get("u1");
    await repo.get("u1");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(repo.stats()).toEqual({ hits: 1, misses: 1 });
  });

  it("caches NOT-FOUND results so missing ids stop hitting the source", async () => {
    const { client, store } = fakeCache();
    const { source, fetch } = fakeSource(new Map());
    const repo = new CachedUserRepo(source, client);

    await expect(repo.get("ghost")).resolves.toBeNull();
    await expect(repo.get("ghost")).resolves.toBeNull();

    expect(fetch).toHaveBeenCalledTimes(1); // penetration blocked
    expect(store.get("user:ghost")).toBe("null"); // JSON.stringify(null)
    expect(repo.stats()).toEqual({ hits: 1, misses: 1 });
  });

  it("update saves first, invalidates second", async () => {
    const { client, calls } = fakeCache();
    const users = new Map([[USER.id, USER]]);
    const { source, save } = fakeSource(users);
    const repo = new CachedUserRepo(source, client);

    await repo.get(USER.id); // populate
    const updated: User = { ...USER, name: "Ada L.", version: 2 };
    await repo.update(updated);

    expect(save).toHaveBeenCalledWith(updated);
    expect(calls.dels).toEqual([userCacheKey(USER.id)]);

    // Next read is a miss and observes the NEW state.
    await repo.get(USER.id);
    expect(repo.stats().misses).toBe(2);
  });

  it("invalidate clears without touching the source", async () => {
    const { client, calls } = fakeCache();
    const { source } = fakeSource(new Map([[USER.id, USER]]));
    const repo = new CachedUserRepo(source, client);

    await repo.get(USER.id);
    await repo.invalidate(USER.id);

    expect(calls.dels).toEqual(["user:u1"]);
    expect(await client.get("user:u1")).toBeNull();
  });
});

describe("createSingleFlight", () => {
  it("dedupes concurrent same-key loads into one invocation", async () => {
    const flight = createSingleFlight();
    const loader = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { ok: true };
    });

    const all = await Promise.all(
      Array.from({ length: 10 }, () => flight.run("hot-key", loader)),
    );

    expect(loader).toHaveBeenCalledTimes(1);
    for (const result of all) expect(result).toEqual({ ok: true });
    expect(flight.size()).toBe(0);
  });

  it("different keys never block each other", async () => {
    const flight = createSingleFlight();
    const slow = flight.run("a", () => new Promise<string>((r) => setTimeout(() => r("A"), 30)));
    const fast = flight.run("b", async () => "B");

    await expect(fast).resolves.toBe("B"); // doesn't wait behind 'a'
    await expect(slow).resolves.toBe("A");
    expect(flight.size()).toBe(0);
  });

  it("rejecting loaders clear the key; next run retries fresh", async () => {
    const flight = createSingleFlight();
    let attempts = 0;

    const failing = () =>
      flight.run("flaky", async () => {
        attempts++;
        if (attempts === 1) throw new Error("cold start failed");
        return "recovered";
      });

    await expect(failing()).rejects.toThrow("cold start failed");
    expect(flight.size()).toBe(0);

    await expect(failing()).resolves.toBe("recovered");
    expect(attempts).toBe(2);
  });

  it("waiters share rejections too (one failure broadcast)", async () => {
    const flight = createSingleFlight();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        flight.run("doomed", async () => {
          throw new Error("shared doom");
        }),
      ),
    );

    expect(results.every((r) => r.status === "rejected")).toBe(true);
  });
});
