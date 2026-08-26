export async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5000,
  everyMs = 20,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, everyMs));
  }
}
