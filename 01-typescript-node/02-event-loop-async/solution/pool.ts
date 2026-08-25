export interface Pool {
  /** Execute tasks with at most `limit` running concurrently. Results in input order. */
  run<T>(tasks: Array<() => Promise<T>>): Promise<T[]>;
  /** Number of currently in-flight tasks (0 when idle). */
  active(): number;
}

export function createPool(limit: number): Pool {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}`);
  }

  let inFlight = 0;

  return {
    active: () => inFlight,

    async run<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
      const results = new Array<T | undefined>(tasks.length);
      let nextIndex = 0;
      let failed = false;

      const worker = async (): Promise<void> => {
        while (!failed && nextIndex < tasks.length) {
          const index = nextIndex++;
          inFlight++;
          try {
            results[index] = await tasks[index]();
          } catch (error) {
            failed = true; // queued tasks must never start
            throw error;
          } finally {
            inFlight--;
          }
        }
      };

      // Exactly min(limit, n) workers = the concurrency cap.
      const workerCount = Math.min(limit, tasks.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      return results as T[];
    },
  };
}

export function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  return createPool(limit).run(items.map((item) => () => fn(item)));
}
