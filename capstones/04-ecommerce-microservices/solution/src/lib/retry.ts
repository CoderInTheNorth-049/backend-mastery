export interface DeadLetter {
  error: unknown;
  attempts: number;
}

export interface RetryPolicyOptions {
  maxAttempts?: number;
  backoffMs?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultBackoffMs = (attempt: number): number => 25 * 2 ** (attempt - 1);
const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class RetryPolicy {
  readonly maxAttempts: number;
  readonly deadLetters: DeadLetter[] = [];
  private readonly backoffMs: (attempt: number) => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: RetryPolicyOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.backoffMs = options.backoffMs ?? defaultBackoffMs;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async attempt<T>(fn: () => T | Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) {
          await this.sleep(this.backoffMs(attempt));
        }
      }
    }
    this.deadLetters.push({ error: lastError, attempts: this.maxAttempts });
    throw lastError;
  }
}
