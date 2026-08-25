// ── Part 2: fetch with production retry semantics ────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export interface RetryInfo {
  attempt: number; // the attempt number that just failed (1-based)
  delayMs: number;
  status?: number;
  error?: unknown;
}

export interface RetryOptions {
  retries?: number;
  backoffBaseMs?: number;
  timeoutMs?: number;
  retryOnStatus?: (status: number) => boolean;
  shouldRetryError?: (error: unknown) => boolean;
  delayFn?: (ms: number, attempt: number) => Promise<void>;
  onRetry?: (info: RetryInfo) => void;
}

const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_BASE_MS = 100;

function defaultRetryOnStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: RetryOptions = {},
): Promise<Response> {
  // TODO: implement
  throw new Error("TODO: implement fetchWithRetry");
}
