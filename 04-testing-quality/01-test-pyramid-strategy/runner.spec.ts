import { describe, expect, it } from "vitest";
import { runTests, type RunSummary } from "./src/runner";

async function run(
  register: Parameters<typeof runTests>[0],
): Promise<RunSummary> {
  return runTests(register);
}

describe("micro test-runner", () => {
  it("counts passes and failures with error messages captured", async () => {
    const mathIsSane = 1 + 1 === 2;
    const summary = await run((t) => {
      t.it("passing math", () => {
        if (!mathIsSane) throw new Error("math broke");
      });
      t.it("failing on purpose", () => {
        throw new Error("expected explosion");
      });
    });

    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    const failed = summary.results.find((r) => r.status === "fail");
    expect(failed?.error).toBe("expected explosion");
    expect(failed?.suite).toEqual([]);
  });

  it("runs tests sequentially in registration order", async () => {
    const order: string[] = [];

    const summary = await run((t) => {
      t.it("first", () => void order.push("first"));
      t.it("second", () => {
        order.push("second");
        throw new Error("second fails");
      });
      t.it("third", () => void order.push("third")); // still runs!
    });

    expect(order).toEqual(["first", "second", "third"]);
    expect(summary.failed).toBe(1); // failure didn't halt the suite
  });

  it("records nested describe paths outermost-first", async () => {
    const summary = await run((t) => {
      t.describe("outer", () => {
        t.describe("inner", () => {
          t.it("deep test", () => {});
        });
        t.it("shallow test", () => {});
      });
      t.it("root test", () => {});
    });

    expect(summary.results.map((r) => [r.name, r.suite])).toEqual([
      ["deep test", ["outer", "inner"]],
      ["shallow test", ["outer"]],
      ["root test", []],
    ]);
  });

  it("chains beforeEach root→leaf for nested tests only where relevant", async () => {
    const calls: string[] = [];

    await run((t) => {
      t.beforeEach(() => void calls.push("root-before"));

      t.describe("outer", () => {
        t.beforeEach(() => void calls.push("outer-before"));

        t.it("nested", () => void calls.push("nested-test"));

        t.describe("inner", () => {
          t.beforeEach(() => void calls.push("inner-before"));
          t.it("deep", () => void calls.push("deep-test"));
        });
      });

      t.it("root-level", () => void calls.push("root-test"));
    });

    expect(calls).toEqual([
      "root-before", "outer-before", "nested-test",
      "root-before", "outer-before", "inner-before", "deep-test",
      "root-before", "root-test",
    ]);
  });

  it("runs afterEach leaf→root, even after failing bodies", async () => {
    const calls: string[] = [];

    const summary = await run((t) => {
      t.afterEach(() => void calls.push("root-after"));
      t.describe("outer", () => {
        t.afterEach(() => void calls.push("outer-after"));
        t.it("fails then unwinds", () => {
          throw new Error("body boom");
        });
      });
    });

    expect(calls).toEqual(["outer-after", "root-after"]); // reverse nesting
    expect(summary.failed).toBe(1);
    expect(summary.results[0].error).toBe("body boom"); // body error wins
  });

  it("awaits async tests and hooks", async () => {
    const timeline: string[] = [];
    let resolved = false;

    const summary = await run((t) => {
      t.beforeEach(async () => {
        await new Promise((r) => setTimeout(r, 5));
        timeline.push("hook-done");
      });
      t.it("async body", async () => {
        await new Promise<void>((r) =>
          setTimeout(() => {
            resolved = true;
            timeline.push("body-done");
            r();
          }, 5),
        );
      });
    });

    expect(resolved).toBe(true);
    expect(timeline).toEqual(["hook-done", "body-done"]);
    expect(summary.passed).toBe(1);
  });

  it("failures in afterEach fail the test when the body passed", async () => {
    const summary = await run((t) => {
      t.afterEach(() => {
        throw new Error("teardown exploded");
      });
      t.it("healthy body", () => {});
    });

    expect(summary.failed).toBe(1);
    expect(summary.results[0].error).toBe("teardown exploded");
  });

  it("handles empty registrations and empty describes gracefully", async () => {
    const summary = await run((t) => {
      t.describe("empty box", () => {
        t.describe("still empty", () => {});
      });
    });

    expect(summary).toEqual({ results: [], total: 0, passed: 0, failed: 0 });
  });
});
