import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DATABASE_URL, HAS_DB } from "../test-support/env";
import { idxEventsQuery, idxSlowSuccesses } from "./src/indexes";

const Q1 = `SELECT id, path, ms FROM "PageEvent"
            WHERE status = 'error' AND path = '/api/orders'
            ORDER BY "createdAt" DESC LIMIT 20`;

const Q2 = `SELECT id, path, ms FROM "PageEvent"
            WHERE status = 'success' AND ms >= 1500
            ORDER BY ms DESC LIMIT 10`;

interface PlanNode {
  "Node Type": string;
  "Index Name"?: string;
  Plans?: PlanNode[];
}

function collect(node: PlanNode, visit: (n: PlanNode) => void): void {
  visit(node);
  for (const child of node.Plans ?? []) collect(child, visit);
}

describe.skipIf(!HAS_DB)("index designs — judged by the planner", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    await pool.query("DROP INDEX IF EXISTS idx_events_status_path_time");
    await pool.query("DROP INDEX IF EXISTS idx_events_slow_success");
  });

  afterAll(async () => {
    await pool.query("DROP INDEX IF EXISTS idx_events_status_path_time");
    await pool.query("DROP INDEX IF EXISTS idx_events_slow_success");
    await pool.end();
  });

  async function explain(sql: string): Promise<PlanNode> {
    const res = await pool.query(`EXPLAIN (FORMAT JSON) ${sql}`);
    const wrapped = (res.rows[0] as { "QUERY PLAN": Array<{ Plan: PlanNode }> })["QUERY PLAN"];
    return wrapped[0].Plan;
  }

  async function apply(ddl: string, label: string): Promise<void> {
    expect(
      ddl.replace(/--[^\n]*/g, "").trim().length,
      `${label} is still empty — implement it in src/indexes.ts`,
    ).toBeGreaterThan(0);
    await pool.query(ddl);
  }

  it("Q1 uses the composite index and no full scan", async () => {
    await apply(idxEventsQuery, "idxEventsQuery");

    const plan = await explain(Q1);
    let indexName: string | undefined;
    let sawSeqScan = false;

    collect(plan, (node) => {
      if (node["Index Name"]) indexName = node["Index Name"];
      if (node["Node Type"] === "Seq Scan") sawSeqScan = true;
    });

    expect(indexName).toBe("idx_events_status_path_time");
    expect(sawSeqScan).toBe(false);
  });

  it("Q2 uses the partial index and no full scan", async () => {
    await apply(idxSlowSuccesses, "idxSlowSuccesses");

    const plan = await explain(Q2);
    let indexName: string | undefined;
    let sawSeqScan = false;

    collect(plan, (node) => {
      if (node["Index Name"]) indexName = node["Index Name"];
      if (node["Node Type"] === "Seq Scan") sawSeqScan = true;
    });

    expect(indexName).toBe("idx_events_slow_success");
    expect(sawSeqScan).toBe(false);
  });

  it("indexes are real objects with sensible sizes", async () => {
    for (const name of ["idx_events_status_path_time", "idx_events_slow_success"]) {
      const res = await pool.query("SELECT pg_relation_size($1::regclass) AS bytes", [name]);
      expect(Number(res.rows[0].bytes)).toBeGreaterThan(8_192); // > 1 page
    }
  });
});
