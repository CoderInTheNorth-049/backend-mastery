/**
 * Resolves REAL PostgreSQL + Redis backends for phase 03+ tests.
 *
 * Resolution order (first available wins):
 *   1. TEST_DATABASE_URL / TEST_REDIS_URL env vars  — you run services yourself
 *   2. Docker via Testcontainers                    — the standard path (CI included)
 *   3. Embedded binaries                            — zero-setup fallback (no root needed)
 *
 * Only vitest.global-setup.ts runs this; worker processes read the resulting
 * .test-backends.json through ./env.ts instead.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(import.meta.url), "..", "..", "..");

export interface Backends {
  databaseUrl?: string;
  redisUrl?: string;
  /** true when WE created this database (throwaway); false for operator-provided */
  ephemeral: boolean;
  stop(): Promise<void>;
}

// ── Docker detection ─────────────────────────────────────────────────────

let dockerUsable: boolean | null = null;

export function hasDocker(): boolean {
  if (dockerUsable !== null) return dockerUsable;
  const socket =
    process.env.DOCKER_HOST ??
    (existsSync("/var/run/docker.sock") ? "/var/run/docker.sock" : "");
  if (!socket && !process.env.DOCKER_HOST) {
    dockerUsable = false;
    return false;
  }
  try {
    execFileSync("docker", ["version", "--format", "ok"], { timeout: 10_000, stdio: "pipe" });
    dockerUsable = true;
  } catch {
    dockerUsable = false;
  }
  return dockerUsable;
}

// ── Embedded fallback plumbing ───────────────────────────────────────────

/**
 * The @embedded-postgres binaries ship shared libs without the exact soname
 * symlinks the dynamic loader wants (libpq.so.5 etc.). Create them and point
 * LD_LIBRARY_PATH at the directory before anything spawns initdb/postgres.
 */
function prepareEmbeddedLibs(): void {
  const candidates = [
    join(repoRoot, "node_modules", "@embedded-postgres", "linux-x64", "native", "lib"),
  ];
  const pnpmRoot = join(repoRoot, "node_modules", ".pnpm");
  if (existsSync(pnpmRoot)) {
    for (const entry of readdirSync(pnpmRoot)) {
      if (entry.startsWith("@embedded-postgres+linux-x64")) {
        candidates.push(
          join(pnpmRoot, entry, "node_modules", "@embedded-postgres", "linux-x64", "native", "lib"),
        );
      }
    }
  }

  const libDir = candidates.find(existsSync);
  if (!libDir) throw new Error("embedded-postgres native libs not found");

  for (const file of readdirSync(libDir)) {
    // libpq.so.5.18 -> also expose as libpq.so.5
    const match = /^(.+\.so)\.\d+$/.exec(file);
    if (match) {
      const linkPath = join(libDir, match[1]);
      if (!existsSync(linkPath)) symlinkSync(file, linkPath);
    }
  }

  const sep = process.platform === "win32" ? ";" : ":";
  process.env.LD_LIBRARY_PATH = [libDir, process.env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(sep);
}

async function startEmbedded(): Promise<Backends> {
  const pg = await startEmbeddedPostgres();

  const { RedisMemoryServer } = await import("redis-memory-server");
  const redis = new RedisMemoryServer({
    instance: { port: 56_379, ip: "127.0.0.1" },
  });
  const redisHost = await redis.getHost();
  const redisPort = await redis.getPort();

  return {
    databaseUrl: pg.connectionString,
    redisUrl: `redis://${redisHost}:${redisPort}`,
    ephemeral: true,
    async stop() {
      await redis.stop();
      await pg.stop();
    },
  };
}

/**
 * Standalone PostgreSQL-only starter — reused by phase 04's provider
 * implementations so learners compose instead of copy-pasting binaries.
 */
export async function startStandalonePostgres(): Promise<{
  connectionString: string;
  stop(): Promise<void>;
}> {
  if (hasDocker()) {
    try {
      const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
      const container = await new PostgreSqlContainer("postgres:16-alpine").start();
      return {
        connectionString: container.getConnectionUri(),
        stop: async () => {
          await container.stop();
        },
      };
    } catch {
      /* fall through to embedded */
    }
  }
  const embedded = await startEmbeddedPostgres();
  return {
    connectionString: embedded.connectionString,
    stop: async () => {
      await embedded.stop();
    },
  };
}

/** Embedded PostgreSQL only (no Redis) — used by phase-04 providers. */
export async function startEmbeddedPostgres(): Promise<{
  connectionString: string;
  stop(): Promise<void>;
}> {
  prepareEmbeddedLibs();

  const [{ default: EmbeddedPostgres }, net] = await Promise.all([
    import("embedded-postgres"),
    import("node:net"),
  ]);

  async function freePort(preferred: number): Promise<number> {
    for (let port = preferred; port < preferred + 20; port++) {
      const free = await new Promise<boolean>((resolve) => {
        const probe = net.createServer();
        probe.once("error", () => resolve(false));
        probe.once("listening", () => probe.close(() => resolve(true)));
        probe.listen(port, "127.0.0.1");
      });
      if (free) return port;
    }
    throw new Error(`no free port near ${preferred}`);
  }

  const pgPort = await freePort(55_432);
  // Unique per-launch dir: multiple embedded instances may coexist
  // (global harness + learner harnesses in phase 04).
  const dataDir = join(
    repoRoot,
    "node_modules",
    ".cache",
    `embedded-pg-${process.pid}-${Date.now().toString(36)}`,
  );
  rmSync(dataDir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: pgPort,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("practice");

  return {
    connectionString: `postgres://postgres:postgres@127.0.0.1:${pgPort}/practice`,
    stop: async () => {
      await pg.stop();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

// ── Public entry ─────────────────────────────────────────────────────────

export async function startBackends(): Promise<Backends> {
  // 1. Explicit env — respect operator-provided services verbatim.
  if (process.env.TEST_DATABASE_URL || process.env.TEST_REDIS_URL) {
    return {
      databaseUrl: process.env.TEST_DATABASE_URL,
      redisUrl: process.env.TEST_REDIS_URL,
      ephemeral: false,
      async stop() {},
    };
  }

  // 2. Docker (testcontainers) — matches CI and the documented default.
  if (hasDocker()) {
    try {
      const [{ PostgreSqlContainer }, { RedisContainer }] = await Promise.all([
        import("@testcontainers/postgresql"),
        import("@testcontainers/redis"),
      ]);
      const pg = await new PostgreSqlContainer("postgres:16-alpine").start();
      const redis = await new RedisContainer("redis:7-alpine").withExposedPorts(6379).start();
      return {
        databaseUrl: pg.getConnectionUri(),
        redisUrl: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
        ephemeral: true,
        async stop() {
          await redis.stop();
          await pg.stop();
        },
      };
    } catch (error) {
      console.warn("[backends] docker path failed, falling back to embedded:", error);
    }
  }

  // 3. Embedded — always available on this repo's supported platforms.
  return startEmbedded();
}
