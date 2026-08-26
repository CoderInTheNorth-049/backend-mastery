/**
 * Base62 short-code encoding.
 *
 * Alphabet is digit-first so numeric-looking codes sort naturally and the
 * sequence component reads incrementally (0, 1, ..., 9, A, B, ...).
 */
export const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = BigInt(BASE62_ALPHABET.length);

export function encode(value: bigint | number): string {
  let n = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
  if (n < 0n) throw new RangeError("base62 encode requires a non-negative integer");
  if (n === 0n) return BASE62_ALPHABET[0];
  let out = "";
  while (n > 0n) {
    out = BASE62_ALPHABET[Number(n % BASE)] + out;
    n /= BASE;
  }
  return out;
}

export function decode(text: string): bigint {
  let acc = 0n;
  for (const char of text) {
    const digit = BASE62_ALPHABET.indexOf(char);
    if (digit < 0) throw new Error(`invalid base62 character: ${JSON.stringify(char)}`);
    acc = acc * BASE + BigInt(digit);
  }
  return acc;
}

export interface CodeFactory {
  next(): string;
}

export interface CodeFactoryOptions {
  /** Random source, injectable so tests get deterministic sequences. */
  rand?: () => number;
  /** Number of random characters appended after the sequence component. */
  suffixLength?: number;
}

/**
 * Counter+random hybrid (the build-guide M1 strategy):
 * - the counter gives a deterministic, monotonically growing sequence component
 *   (human-auditable, zero coordination within one process);
 * - the random suffix makes codes unpredictable and lets many instances run
 *   side by side without stepping on each other for any realistic horizon.
 *
 * With a fixed `rand` the suffix is constant, so consecutive codes differ only
 * by their encoded sequence component - handy for tests.
 */
export function createCodeFactory(options: CodeFactoryOptions = {}): CodeFactory {
  const rand = options.rand ?? Math.random;
  const suffixLength = options.suffixLength ?? 6;
  let counter = 0;
  return {
    next(): string {
      let suffix = "";
      for (let i = 0; i < suffixLength; i++) {
        suffix += BASE62_ALPHABET[Math.floor(rand() * BASE62_ALPHABET.length)];
      }
      return `${encode(counter++)}${suffix}`;
    },
  };
}

export const MAX_CODE_ATTEMPTS = 5;

/**
 * Collision policy (documented per M1): probe up to MAX_CODE_ATTEMPTS freshly
 * generated candidates against the store, then give up loudly. The random
 * suffix makes 5 consecutive collisions astronomically unlikely; hitting the
 * limit indicates a bug (e.g. a mocked rand), not bad luck.
 */
export async function nextUniqueCode(
  factory: CodeFactory,
  exists: (code: string) => Promise<boolean>,
  maxAttempts: number = MAX_CODE_ATTEMPTS,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = factory.next();
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error(`could not allocate a unique short code after ${maxAttempts} attempts`);
}
