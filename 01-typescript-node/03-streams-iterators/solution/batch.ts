export async function* batch<T>(
  source: AsyncIterable<T>,
  size: number,
): AsyncGenerator<T[], void, undefined> {
  // RangeError check happens lazily on first iteration.
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`size must be a positive integer, got ${size}`);
  }

  let current: T[] = [];
  for await (const item of source) {
    current.push(item);
    if (current.length === size) {
      yield current;
      current = [];
    }
  }

  if (current.length > 0) yield current;
}
