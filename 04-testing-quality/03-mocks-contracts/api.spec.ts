import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiError, PaymentsApiClient } from "./src/api-client";

const server = setupServer();
const BASE = "https://payments.provider.test";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

const VALID_INPUT = {
  amount_cents: 1999,
  currency: "usd",
  customer: { id: 7, email: "ada@x.io" },
  source: "tok_visa",
};

const CHARGE_BODY = {
  id: "ch_123",
  status: "succeeded",
  amount_cents: 1999,
  currency: "usd",
  customer: { id: 7, email: "ada@x.io" },
};

describe("PaymentsApiClient — happy paths", () => {
  it("creates a charge with JSON body and auth header", async () => {
    let seenAuth: string | undefined;
    server.use(
      http.post(`${BASE}/v1/charges`, async ({ request }) => {
        seenAuth = request.headers.get("x-api-key") ?? undefined;
        const body = (await request.json()) as typeof VALID_INPUT;
        expect(body).toEqual(VALID_INPUT);
        return HttpResponse.json(CHARGE_BODY, { status: 201 });
      }),
    );

    const client = new PaymentsApiClient(BASE, { apiKey: "sk_test" });
    await expect(client.createCharge(VALID_INPUT)).resolves.toEqual(CHARGE_BODY);
    expect(seenAuth).toBe("sk_test");
  });

  it("omits x-api-key when not configured", async () => {
    server.use(
      http.post(`${BASE}/v1/charges`, ({ request }) => {
        expect(request.headers.has("x-api-key")).toBe(false);
        return HttpResponse.json(CHARGE_BODY, { status: 201 });
      }),
    );

    const client = new PaymentsApiClient(BASE);
    await client.createCharge(VALID_INPUT);
  });

  it("fetches a single charge", async () => {
    server.use(
      http.get(`${BASE}/v1/charges/ch_99`, () => HttpResponse.json({ ...CHARGE_BODY, id: "ch_99" })),
    );

    const client = new PaymentsApiClient(BASE);
    await expect(client.getCharge("ch_99")).resolves.toMatchObject({ id: "ch_99" });
  });

  it("rejects unexpected 2xx statuses", async () => {
    server.use(
      http.post(`${BASE}/v1/charges`, () => HttpResponse.json(CHARGE_BODY, { status: 200 })),
    );

    const client = new PaymentsApiClient(BASE);
    await expect(client.createCharge(VALID_INPUT)).rejects.toMatchObject({
      code: "server",
    });
  });
});

describe("PaymentsApiClient — error taxonomy", () => {
  it.each([
    [400, { error: { message: "bad source" } }, "validation"],
    [422, { error: { message: "amount too small" } }, "validation"],
  ])("maps HTTP %i to a validation error carrying the provider message", async (status, body, code) => {
    server.use(http.post(`${BASE}/v1/charges`, () => HttpResponse.json(body, { status: status as number })));

    const client = new PaymentsApiClient(BASE);
    const error = await client.createCharge(VALID_INPUT).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
    expect(error.message).toContain((body as { error: { message: string } }).error.message);
  });

  it("maps 404 to not-found", async () => {
    server.use(
      http.get(`${BASE}/v1/charges/ch_missing`, () =>
        HttpResponse.json({ error: { message: "nope" } }, { status: 404 }),
      ),
    );

    const client = new PaymentsApiClient(BASE);
    await expect(client.getCharge("ch_missing")).rejects.toMatchObject({
      code: "not-found",
      status: 404,
    });
  });

  it("maps 5xx to server errors", async () => {
    server.use(
      http.post(`${BASE}/v1/charges`, () => HttpResponse.json({}, { status: 503 })),
    );

    const client = new PaymentsApiClient(BASE);
    await expect(client.createCharge(VALID_INPUT)).rejects.toMatchObject({
      code: "server",
      status: 503,
    });
  });

  it("normalizes timeout aborts into ApiError('timeout')", async () => {
    server.use(
      http.post(
        `${BASE}/v1/charges`,
        () => new Promise(() => {}), // hangs forever; the client must give up
      ),
    );

    const client = new PaymentsApiClient(BASE, { timeoutMs: 60 });
    const error = await client.createCharge(VALID_INPUT).catch((e) => e);

    expect(error.code).toBe("timeout");
    expect(error.message).toMatch(/timed out/i);
  }, 5_000);

  it("maps network failures to ApiError('network')", async () => {
    server.use(http.post(`${BASE}/v1/charges`, () => HttpResponse.error()));

    const client = new PaymentsApiClient(BASE);
    await expect(client.createCharge(VALID_INPUT)).rejects.toMatchObject({
      code: "network",
    });
  });

  it("flags malformed JSON bodies as malformed server responses", async () => {
    server.use(
      http.get(`${BASE}/v1/charges/ch_html`, () => {
        return new HttpResponse("<html>oops</html>", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const client = new PaymentsApiClient(BASE);
    const error = await client.getCharge("ch_html").catch((e) => e);

    expect(error.code).toBe("server");
    expect(error.message).toMatch(/malformed/i);
  });
});
