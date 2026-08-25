import { describe, expect, it } from "vitest";
import { DatabaseHarness } from "./src/harness";
import {
  selectAvailableProvider,
  type DatabaseProvider,
} from "./src/providers";

const SCHEMA = `
  CREATE TABLE notes (
    id serial primary key,
    body text not null
  );
`;

const provider: DatabaseProvider | undefined = await selectAvailableProvider().catch(
  () => undefined,
);

describe("DatabaseHarness — real provider integration", () => {
  it.skipIf(!provider)("full lifecycle against real PostgreSQL", async () => {
    const harness = new DatabaseHarness(provider!, { schemaSql: SCHEMA, tables: ["notes"] });

    await harness.start();

    await harness.query(`INSERT INTO notes (body) VALUES ($1), ($2)`, ["first", "second"]);
    const seeded = await harness.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM notes`);
    expect(seeded.rows[0].count).toBe("2");

    // reset wipes data but keeps schema usable
    await harness.reset();
    const after = await harness.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM notes`);
    expect(after.rows[0].count).toBe("0");
    await harness.query(`INSERT INTO notes (body) VALUES ('post-reset')`);

    // concurrent resets are safe
    await Promise.all([harness.reset(), harness.reset()]);

    await harness.stop();
  }, 120_000);

  it.skipIf(!provider)("restart cycle provisions a fresh database", async () => {
    const harness = new DatabaseHarness(provider!, { schemaSql: SCHEMA, tables: ["notes"] });

    await harness.start();
    await harness.query(`INSERT INTO notes (body) VALUES ('stale')`);
    await harness.stop();

    await harness.start(); // new runtime — old data must be gone
    const rows = await harness.query<{ id: number }>(`SELECT * FROM notes`);
    expect(rows.rows).toEqual([]);
    await harness.stop();
  }, 120_000);
});
