import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp, waitFor } from "./helpers";

describe("HTTP contracts", () => {
  it("returns PENDING immediately and lags the read model until projection", async () => {
    const app = await buildTestApp(); // background relay disabled
    const server = app.nest.getHttpServer();

    const created = await request(server)
      .post("/orders")
      .send({ userId: "user-7", items: [{ sku: "SKU-1", qty: 1 }] });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: "PENDING" });
    expect(typeof created.body.orderId).toBe("string");
    const orderId = created.body.orderId as string;

    // Write model is already durable-ish; progression is async via the bus.
    const writeModel = await request(server).get(`/orders/${orderId}`);
    expect(writeModel.status).toBe(200);
    expect(writeModel.body.status).toBe("PENDING");

    // Read model lags - nothing has pumped the pipeline yet.
    const laggingView = await request(server).get(`/orders/view/${orderId}`);
    expect(laggingView.status).toBe(404);

    await app.drain();
    await waitFor(() => app.views.find(orderId)?.status === "CONFIRMED");
    expect((await request(server).get(`/orders/view/${orderId}`)).body.status).toBe("CONFIRMED");

    await app.stop();
  });

  it("answers failures with application/problem+json and echoes x-request-id", async () => {
    const app = await buildTestApp();
    const server = app.nest.getHttpServer();

    const invalid = await request(server)
      .post("/orders")
      .set("x-request-id", "trace-42")
      .send({ userId: "", items: "nope" });
    expect(invalid.status).toBe(400);
    expect(invalid.headers["content-type"]).toContain("application/problem+json");
    expect(invalid.body.title).toBe("Bad Request");
    expect(invalid.body.requestId).toBe("trace-42");
    expect(invalid.headers["x-request-id"]).toBe("trace-42");

    const missing = await request(server).get("/orders/does-not-exist");
    expect(missing.status).toBe(404);
    expect(missing.headers["content-type"]).toContain("application/problem+json");

    // A minted id comes back when the caller sends none.
    const minted = await request(server).get("/healthz");
    expect(minted.headers["x-request-id"]).toBeDefined();

    await app.stop();
  });

  it("serves health, readiness, inventory levels, and the drain endpoint", async () => {
    const app = await buildTestApp();
    const server = app.nest.getHttpServer();

    expect((await request(server).get("/healthz")).status).toBe(200);
    expect((await request(server).get("/readyz")).status).toBe(200);

    const inventory = await request(server).get("/inventory");
    expect(inventory.status).toBe(200);
    expect(inventory.body.stock).toEqual({ "SKU-1": 10, "SKU-2": 5 });

    await request(server)
      .post("/orders")
      .send({ userId: "user-8", items: [{ sku: "SKU-1", qty: 1 }] });
    const drained = await request(server).post("/__admin/drain");
    expect(drained.status).toBe(201);
    expect(drained.body.published).toBeGreaterThan(0);
    expect(drained.body.pending).toBe(0);

    await app.stop();
  });
});
