import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import type { GlobalSetupContext } from "vitest/node";
import { startBackends } from "./03-databases/test-support/backend";

const STATE_FILE = ".test-backends.json";

/**
 * Provisions REAL PostgreSQL + Redis for database-phase tests.
 *
 * Skips provisioning entirely when the selected specs cannot touch a
 * database (e.g. `pnpm test:topic 00-foundations/...`) so unit loops stay
 * instant. Full runs and any 03-* filter get backends.
 */
const BACKEND_PHASES = ["03-", "06-", "10-"]; // phases whose tests need live PG/Redis

function runNeedsDatabases(): boolean {
  const VERBS = new Set(["run", "watch", "dev", "--"]);
  const args = process.argv.slice(2);

  // Only arguments that look like file/folder filters count as filters
  // ("run", flags like --coverage, etc. must not suppress provisioning).
  const pathFilters = args.filter((a) => !a.startsWith("-") && !VERBS.has(a) && (a.includes("/") || /^\d{2}-/.test(a)));

  if (pathFilters.length === 0) return true;
  return pathFilters.some((f) => BACKEND_PHASES.some((p) => f.startsWith(p)));
}

export default async function globalSetup(_ctx?: GlobalSetupContext): Promise<(() => Promise<void>) | void> {
  if (!runNeedsDatabases()) return;

  const backends = await startBackends();
  const teardown = async (): Promise<void> => {
    await backends.stop().catch(() => {});
    rmSync(STATE_FILE, { force: true });
  };

  try {
    if (!backends.databaseUrl) {
      writeFileSync(STATE_FILE, JSON.stringify({ databaseUrl: "", redisUrl: "" }));
      console.warn("[global-setup] no PostgreSQL backend available — DB specs will SKIP");
      return teardown;
    }

    process.env.DATABASE_URL = backends.databaseUrl;

    // Schema comes from Prisma models; push instead of migrate for speed
    // (migrate history is a topic 02 reading exercise, not a test need).
    //
    // Prisma 7 blocks `db push` when it detects an AI agent driving the CLI.
    // The harness only sets Prisma's consent variable for databases WE just
    // created (throwaway, seeded with fixture data) — operator-provided
    // TEST_DATABASE_URL targets never get it.
    const consent = backends.ephemeral
      ? {
          PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
            "Provisioning this repo's own disposable test database (embedded/testcontainers) with fixture data for automated tests.",
        }
      : {};

    execFileSync("npx", ["prisma", "db", "push", "--accept-data-loss"], {
      stdio: "pipe",
      env: { ...process.env, ...consent },
    });

    const client = new Client({ connectionString: backends.databaseUrl });
    await client.connect();
    try {
      await client.query(readFileSync("03-databases/test-support/seed.sql", "utf8"));
    } finally {
      await client.end();
    }

    writeFileSync(
      STATE_FILE,
      JSON.stringify({
        databaseUrl: backends.databaseUrl,
        redisUrl: backends.redisUrl ?? "",
      }),
    );

    console.log("[global-setup] databases ready ✔");
    return teardown;
  } catch (error) {
    await teardown();
    throw error;
  }
}
