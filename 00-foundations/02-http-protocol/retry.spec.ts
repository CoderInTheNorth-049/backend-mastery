import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./src/retry";

const server = setupServer();
const fastDelay = async () => {};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

const URL_ = "https://api.example.test/flaky";

describe("fetchWithRetry — happy paths", () => {
  it("does not retry a 2xx response", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return HttpResponse.json({ ok: true });
      }),
    );

    const onRetry = vi.fn();
    const res = await fetchWithRetry(URL_, { delayFn: fastDelay, onRetry });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toBe(1);
    expect(onRetry).not.toHaveBeenCalled();
  });
});

describe("fetchWithRetry — status-based retries", () => {
  it("retries 5xx with exponential backoff until success", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return HttpResponse.json({}, { status: calls < 3 ? 500 : 200 });
      }),
    );

    const onRetry = vi.fn();
    const res = await fetchWithRetry(URL_, {
      backoffBaseMs: 50,
      delayFn: fastDelay,
      onRetry,
    });

    expect(res.status).toBe(200);
    expect(calls).toBe(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][0]).toMatchObject({ attempt: 1, delayMs: 50, status: 500 });
    expect(onRetry.mock.calls[1][0]).toMatchObject({ attempt: 2, delayMs: 100, status: 500 });
  });

  it("gives up after exhausting retries and returns the last response", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return HttpResponse.json({}, { status: 503 });
      }),
    );

    const res = await fetchWithRetry(URL_, { retries: 2, delayFn: fastDelay });

    expect(calls).toBe(3);
    expect(res.status).toBe(503);
  });

  it("never retries non-retryable statuses (4xx by default)", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return HttpResponse.json({}, { status: 404 });
      }),
    );

    const onRetry = vi.fn();
    const res = await fetchWithRetry(URL_, { delayFn: fastDelay, onRetry });

    expect(calls).toBe(1);
    expect(res.status).toBe(404);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("honors a custom retryOnStatus policy", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return HttpResponse.json({}, { status: 400 });
      }),
    );

    const res = await fetchWithRetry(URL_, {
      retryOnStatus: (status) => status === 400,
      delayFn: fastDelay,
    });

    expect(calls).toBe(3); // default retries=2 → 3 attempts
    expect(res.status).toBe(400);
  });

  it("respects the Retry-After header over backoff math", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return new HttpResponse(null, {
          status: calls < 2 ? 429 : 200,
          headers: { "Retry-After": "7" },
        });
      }),
    );

    const onRetry = vi.fn();
    await fetchWithRetry(URL_, {
      backoffBaseMs: 999,
      delayFn: fastDelay,
      onRetry,
    });

    expect(onRetry.mock.calls[0][0].delayMs).toBe(7000);
  }, 10_000);
});

describe("fetchWithRetry — network errors", () => {
  it("retries network failures and reports the error via onRetry", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return calls < 3 ? HttpResponse.error() : HttpResponse.json({});
      }),
    );

    const onRetry = vi.fn();
    const res = await fetchWithRetry(URL_, { delayFn: fastDelay, onRetry });

    expect(res.ok).toBe(true);
    expect(calls).toBe(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][0].error).toBeDefined();
  });

  it("rethrows the last error when retries are exhausted", async () => {
    server.use(http.get(URL_, () => HttpResponse.error()));

    await expect(
      fetchWithRetry(URL_, { retries: 1, delayFn: fastDelay }),
    ).rejects.toThrow();
  });

  it("aborts slow attempts per timeoutMs and keeps retrying", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 80));
        return HttpResponse.json({});
      }),
    );

    await expect(
      fetchWithRetry(URL_, { retries: 1, timeoutMs: 20, delayFn: fastDelay }),
    ).rejects.toThrow();

    expect(calls).toBe(2);
  }, 10_000);

  it("stops immediately when shouldRetryError returns false", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return HttpResponse.error();
      }),
    );

    await expect(
      fetchWithRetry(URL_, {
        shouldRetryError: () => false,
        delayFn: fastDelay,
      }),
    ).rejects.toThrow();

    expect(calls).toBe(1);
  });
});
