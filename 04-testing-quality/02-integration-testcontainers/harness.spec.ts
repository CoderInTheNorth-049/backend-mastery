import { describe, expect, it } from "vitest";
import { DatabaseHarness, type DatabaseProvider, type QueryExecutor } from "./src/harness";

const SCHEMA = "CREATE TABLE notes (id serial primary key, body text);";

function fakeProvider() {
  const counts = { starts: 0, stops: 0 };
  const provider: DatabaseProvider = {
    name: "env",
    isAvailable: async () => true,
    start: async () => {
      counts.starts++;
      return {
        connectionString: "postgres://fake",
        stop: async () => {
          counts.stops++;
        },
      };
    },
  };
  return { provider, counts };
}

interface RecordedQuery {
  text: string;
  params?: unknown[];
}

function recordingPool(log: RecordedQuery[], rows: unknown[] = []): QueryExecutor {
  return {
    query: async (text: string, params?: unknown[]) => {
      log.push({ text, params });
      return { rows, rowCount: rows.length };
    },
  };
}

describe("DatabaseHarness — lifecycle discipline (unit)", () => {
  it("double start() starts the provider once and applies schema once", async () => {
    const { provider, counts } = fakeProvider();
    const log: RecordedQuery[] = [];
    const harness = new DatabaseHarness(provider, {
      schemaSql: SCHEMA,
      tables: ["notes"],
      poolFactory: () => recordingPool(log),
    });

    await harness.start();
    await harness.start();

    expect(counts.starts).toBe(1);
    expect(log.filter((q) => q.text.includes("CREATE TABLE"))).toHaveLength(1);
  });

  it("coalesces concurrent first starts onto one startup", async () => {
    const { provider, counts } = fakeProvider();
    const harness = new DatabaseHarness(provider, {
      schemaSql: SCHEMA,
      tables: ["notes"],
      poolFactory: () => recordingPool([]),
    });

    await Promise.all([harness.start(), harness.start(), harness.start()]);
    expect(counts.starts).toBe(1);
  });

  it("reset() emits one TRUNCATE covering all tables with identity reset", async () => {
    const { provider } = fakeProvider();
    const log: RecordedQuery[] = [];
    const harness = new DatabaseHarness(provider, {
      schemaSql: SCHEMA,
      tables: ["notes", "tags"],
      poolFactory: () => recordingPool(log),
    });

    await harness.start();
    await harness.reset();

    const truncate = log.find((q) => q.text.startsWith("TRUNCATE"));
    expect(truncate?.text).toContain('"notes"');
    expect(truncate?.text).toContain('"tags"');
    expect(truncate?.text).toContain("RESTART IDENTITY CASCADE");
  });

  it("concurrent resets all execute safely", async () => {
    const { provider } = fakeProvider();
    const log: RecordedQuery[] = [];
    const harness = new DatabaseHarness(provider, {
      schemaSql: SCHEMA,
      tables: ["notes"],
      poolFactory: () => recordingPool(log),
    });

    await harness.start();
    await Promise.all(Array.from({ length: 5 }, () => harness.reset()));

    expect(log.filter((q) => q.text.startsWith("TRUNCATE"))).toHaveLength(5);
  });

  it("reset/query before start throw a not-started error", async () => {
    const { provider } = fakeProvider();
    const harness = new DatabaseHarness(provider, {
      schemaSql: SCHEMA,
      tables: ["notes"],
      poolFactory: () => recordingPool([]),
    });

    await expect(harness.reset()).rejects.toThrow(/not started/i);
    await expect(harness.query("SELECT 1")).rejects.toThrow(/not started/i);
  });

  it("query after stop throws a stopped error; double stop is a no-op", async () => {
    const { provider, counts } = fakeProvider();
    const harness = new DatabaseHarness(provider, {
      schemaSql: SCHEMA,
      tables: ["notes"],
      poolFactory: () => recordingPool([]),
    });

    await harness.start();
    await harness.stop();

    await expect(harness.query("SELECT 1")).rejects.toThrow(/stopped/i);

    await harness.stop(); // second call: silent no-op
    expect(counts.stops).toBe(1);
  });

  it("restart works after a full stop", async () => {
    const { provider, counts } = fakeProvider();
    let generation = 0;
    const log: RecordedQuery[] = [];
    const harness = new DatabaseHarness(provider, {
      schemaSql: SCHEMA,
      tables: ["notes"],
      poolFactory: () => {
        generation++;
        return recordingPool(log, [{ generation }]);
      },
    });

    await harness.start();
    await harness.stop();
    await harness.start();

    const res = await harness.query<{ generation: number }>("SELECT * FROM notes");
    expect(res.rows).toEqual([{ generation: 2 }]); // fresh pool for round two
    expect(counts.starts).toBe(2);
    expect(counts.stops).toBe(1);
  });

  it("delegates queries with params through the executor untouched", async () => {
    const { provider } = fakeProvider();
    const calls: RecordedQuery[] = [];
    const harness = new DatabaseHarness(provider, {
      schemaSql: SCHEMA,
      tables: ["notes"],
      poolFactory: () => recordingPool(calls, [{ id: 7 }]),
    });
    await harness.start();

    const out = await harness.query<{ id: number }>(
      "SELECT * FROM notes WHERE body = $1",
      ["hello"],
    );

    expect(out.rows).toEqual([{ id: 7 }]);
    expect(calls[calls.length - 1]).toEqual({
      text: "SELECT * FROM notes WHERE body = $1",
      params: ["hello"],
    });
  });
});
