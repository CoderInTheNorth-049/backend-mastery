import { afterAll, describe, expect, it, vi } from "vitest";
import type { ResilientQueue } from "./src/worker-kit";
import { createResilientQueue } from "./src/worker-kit";
import { HAS_REDIS, REDIS_URL } from "../../03-databases/test-support/env";

let suffix = 0;
const uniqueName = () => `tasks-${Date.now()}-${++suffix}`;

// All queues created here are tracked for guaranteed shutdown.
const open: ResilientQueue[] = [];
afterAll(async () => {
  await Promise.all(open.map((q) => q.close().catch(() => {})));
});

describe.skipIf(!HAS_REDIS)("resilient queue against real Redis", () => {
  it("completes a happy-path job and reports stats", async () => {
    const rq = await createResilientQueue({
      redisUrl: REDIS_URL,
      queueName: uniqueName(),
      processor: async (job) => ({ echoed: job.data }),
    });
    open.push(rq);

    const { id } = await rq.addJob("greet", { hello: "world" });
    expect(id).toBeTypeOf("string");

    await vi.waitFor(async () => {
      const s = await rq.stats();
      expect(s.completed).toBe(1);
    });

    expect(await rq.deadLetters()).toEqual([]);
  });

  it("retries flaky jobs until success within the attempt budget", async () => {
    let calls = 0;
    const rq = await createResilientQueue({
      redisUrl: REDIS_URL,
      queueName: uniqueName(),
      policy: { attempts: 3, backoffMs: 10 },
      processor: async () => {
        calls++;
        if (calls < 3) throw new Error(`flaky #${calls}`);
        return "third time lucky";
      },
    });
    open.push(rq);

    await rq.addJob("flaky");

    await vi.waitFor(async () => {
      const s = await rq.stats();
      expect(s.completed).toBe(1);
    }, { timeout: 5_000 });

    expect(calls).toBe(3); // attempts semantics: TOTAL executions
    expect(await rq.deadLetters()).toEqual([]);
  });

  it("exhausts retries then mirrors the corpse into the DLQ", async () => {
    let calls = 0;
    const rq = await createResilientQueue({
      redisUrl: REDIS_URL,
      queueName: uniqueName(),
      policy: { attempts: 3, backoffMs: 10 },
      processor: async () => {
        calls++;
        throw new Error("doomed payload");
      },
    });
    open.push(rq);

    await rq.addJob("poison", { orderId: 42 });

    await vi.waitFor(
      async () => {
        const dead = await rq.deadLetters();
        expect(dead).toHaveLength(1);
      },
      { timeout: 5_000 },
    );

    // exactly maxAttempts executions — no infinite retry
    expect(calls).toBe(3);

    const dead = (await rq.deadLetters())[0];
    expect(dead.name).toBe("poison");
    expect(dead.data).toEqual({ orderId: 42 });
    expect(dead.failedReason).toContain("doomed payload");
  });

  it("holds delayed jobs before promoting them", async () => {
    const rq = await createResilientQueue({
      redisUrl: REDIS_URL,
      queueName: uniqueName(),
      processor: async () => "done",
    });
    open.push(rq);

    await rq.addJob("later", {}, { delayMs: 120 });

    const early = await rq.stats();
    expect(early.delayed).toBe(1);
    expect(early.completed).toBe(0);

    await vi.waitFor(async () => {
      const s = await rq.stats();
      expect(s.delayed).toBe(0);
      expect(s.completed).toBe(1);
    }, { timeout: 5_000 });
  });

  it("processes FIFO under concurrency=1", async () => {
    const seen: number[] = [];
    const rq = await createResilientQueue({
      redisUrl: REDIS_URL,
      queueName: uniqueName(),
      processor: async (job) => {
        seen.push((job.data as { seq: number }).seq);
        return null;
      },
    });
    open.push(rq);

    for (const seq of [1, 2, 3]) {
      await rq.addJob("ordered", { seq });
    }

    await vi.waitFor(async () => {
      const s = await rq.stats();
      expect(s.completed).toBe(3);
    }, { timeout: 5_000 });

    expect(seen).toEqual([1, 2, 3]);
  });

  it("close() is idempotent", async () => {
    const rq = await createResilientQueue({
      redisUrl: REDIS_URL,
      queueName: uniqueName(),
      processor: async () => null,
    });

    await rq.close();
    await expect(rq.close()).resolves.toBeUndefined();
  });
});
