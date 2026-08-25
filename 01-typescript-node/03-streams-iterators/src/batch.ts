/* eslint-disable require-yield -- stub throws; the real implementation yields */
export async function* batch<T>(
  source: AsyncIterable<T>,
  size: number,
): AsyncGenerator<T[], void, undefined> {
  throw new Error("TODO: implement batch");
}
