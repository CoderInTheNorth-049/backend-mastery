// ── Part 2: concurrency-limited task pool ────────────────────────────────
export interface Pool {
  /** Execute tasks with at most `limit` running concurrently. Results in input order. */
  run<T>(tasks: Array<() => Promise<T>>): Promise<T[]>;
  /** Number of currently in-flight tasks (0 when idle). */
  active(): number;
}

export function createPool(limit: number): Pool {
  throw new Error("TODO: implement createPool");
}

export function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  throw new Error("TODO: implement mapLimit");
}
