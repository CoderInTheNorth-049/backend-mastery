// Type-only: resolves back into ../src/providers (answer-key redirector
// passes it through since solution/providers.ts doesn't exist).
import type { DatabaseProvider } from "../src/providers";

export type { DatabaseProvider };

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number | null;
}

export interface QueryExecutor {
  query(text: string, params?: unknown[]): Promise<QueryResult>;
}

export interface HarnessOptions {
  schemaSql: string;
  /** Tables truncated by reset(), in order. */
  tables: string[];
  /** Injectable for unit tests; defaults to a real pg Pool. */
  poolFactory?: (connectionString: string) => QueryExecutor;
}

/**
 * Suite-scoped database lifecycle manager.
 *
 * start(): idempotent — provider starts once, schema applies once.
 *          Concurrent first-calls coalesce onto one startup sequence.
 *          A stopped harness may be started again (fresh runtime).
 * reset(): one TRUNCATE statement over `tables`; safe concurrently
 *          (TRUNCATE is transactional in Postgres).
 * stop():  idempotent — closes the pool, then the provider.
 */
export class DatabaseHarness {
  private runtime?: { connectionString: string; stop(): Promise<void> };
  private executor?: QueryExecutor;
  private started = false;
  private stopped = false;
  private startPromise?: Promise<void>;

  constructor(
    private readonly provider: DatabaseProvider,
    private readonly options: HarnessOptions,
  ) {}

  async start(): Promise<void> {
    if (this.started) return;

    this.startPromise ??= (async () => {
      const runtime = await this.provider.start();
      const { Pool } = await import("pg");
      // Local binding survives `await` without losing the non-null type
      // (narrowing on `this.x` does not persist across awaits).
      const executor: QueryExecutor =
        this.options.poolFactory?.(runtime.connectionString) ??
        new Pool({ connectionString: runtime.connectionString });
      await executor.query(this.options.schemaSql);

      this.runtime = runtime;
      this.executor = executor;
    })();

    try {
      await this.startPromise;
      this.stopped = false;
      this.started = true;
    } catch (error) {
      this.startPromise = undefined; // allow retrying a failed start
      throw error;
    }
  }

  async reset(): Promise<void> {
    if (this.stopped) throw new Error("harness stopped");
    if (!this.started || !this.executor) {
      throw new Error("harness not started — call start() first");
    }
    const tables = this.options.tables.map((t) => `"${t}"`).join(", ");
    await this.executor.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  }

  async query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (this.stopped) throw new Error("harness stopped");
    if (!this.started || !this.executor) {
      throw new Error("harness not started — call start() first");
    }
    return this.executor.query(text, params) as Promise<QueryResult<T>>;
  }

  async stop(): Promise<void> {
    // Idempotent: a second stop is a no-op. Stopping mid-start waits for the
    // startup to finish allocating so we can tear everything down cleanly.
    if (!this.started && !this.startPromise) {
      this.stopped = true;
      return;
    }

    this.stopped = true;
    this.started = false;

    try {
      await this.startPromise;
    } catch {
      /* failed start — nothing extra to release */
    }
    this.startPromise = undefined;

    const closable = this.executor as { end?: () => Promise<void> } | undefined;
    if (closable && typeof closable.end === "function") {
      await closable.end();
    }
    this.executor = undefined;

    await this.runtime?.stop();
    this.runtime = undefined;
  }
}
