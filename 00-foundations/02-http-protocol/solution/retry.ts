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

async function attemptFetch(url: string, timeoutMs?: number): Promise<Response> {
  if (timeoutMs === undefined) return fetch(url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer); // never leak timers between attempts
  }
}

/** A 429's numeric Retry-After (seconds) overrides exponential backoff. */
function retryAfterMs(response: Response): number | undefined {
  if (response.status !== 429) return undefined;
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

export async function fetchWithRetry(
  url: string,
  options: RetryOptions = {},
): Promise<Response> {
  const {
    retries = DEFAULT_RETRIES,
    backoffBaseMs = DEFAULT_BACKOFF_BASE_MS,
    timeoutMs,
    retryOnStatus = defaultRetryOnStatus,
    shouldRetryError = () => true,
    delayFn = defaultDelay,
    onRetry,
  } = options;

  for (let attempt = 1; ; attempt++) {
    let response: Response | undefined;
    let error: unknown;

    try {
      response = await attemptFetch(url, timeoutMs);
    } catch (e) {
      error = e;
    }

    const failedResponse = response !== undefined && retryOnStatus(response.status);
    if (response && !failedResponse) return response;
    if (!response && !shouldRetryError(error)) throw error;

    if (attempt > retries) {
      // Exhausted: hand back whatever we have, or rethrow.
      if (response) return response;
      throw error;
    }

    const delayMs =
      response !== undefined
        ? (retryAfterMs(response) ?? backoffBaseMs * 2 ** (attempt - 1))
        : backoffBaseMs * 2 ** (attempt - 1);

    onRetry?.(
      response !== undefined
        ? { attempt, delayMs, status: response.status }
        : { attempt, delayMs, error },
    );

    await delayFn(delayMs, attempt);
  }
}
