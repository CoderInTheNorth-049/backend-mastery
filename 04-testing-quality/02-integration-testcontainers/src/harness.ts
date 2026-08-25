import type { DatabaseProvider } from "./providers";

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
 * reset(): one TRUNCATE statement over `tables`; safe to call concurrently.
 * stop():  idempotent — closes the pool, then the provider.
 */
export class DatabaseHarness {
  constructor(
    private readonly provider: DatabaseProvider,
    private readonly options: HarnessOptions,
  ) {}

  async start(): Promise<void> {
    throw new Error("TODO: implement start");
  }

  async reset(): Promise<void> {
    throw new Error("TODO: implement reset");
  }

  async query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    throw new Error("TODO: implement query");
  }

  async stop(): Promise<void> {
    throw new Error("TODO: implement stop");
  }
}
