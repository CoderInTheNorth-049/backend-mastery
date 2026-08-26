import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp, waitFor } from "./helpers";

describe("order view projector", () => {
  it("eventually reflects CONFIRMED and both CANCELLED_* outcomes", async () => {
    const app = await buildTestApp();
    const server = app.nest.getHttpServer();

    const confirmedOrder = await request(server)
      .post("/orders")
      .send({ userId: "u-a", items: [{ sku: "SKU-1", qty: 1 }] });
    const stockOutOrder = await request(server)
      .post("/orders")
      .send({ userId: "u-b", items: [{ sku: "SKU-1", qty: 99 }] });
    const declinedOrder = await request(server)
      .post("/orders")
      .send({ userId: "u-c", items: [{ sku: "SKU-2", qty: 1 }], failPayment: true });

    await app.drain();
    await waitFor(() => {
      const statuses = [confirmedOrder, stockOutOrder, declinedOrder].map(
        (response) => app.views.find(response.body.orderId)?.status,
      );
      return statuses.every((status) => status !== undefined && status !== "PENDING");
    });

    const confirmed = app.views.find(confirmedOrder.body.orderId);
    expect(confirmed?.status).toBe("CONFIRMED");
    expect(confirmed?.totalCents).toBe(1500);
    expect(confirmed?.items).toEqual([{ sku: "SKU-1", qty: 1 }]);
    expect(app.views.find(stockOutOrder.body.orderId)?.status).toBe("CANCELLED_STOCK");
    expect(app.views.find(declinedOrder.body.orderId)?.status).toBe("CANCELLED_PAYMENT");

    await app.stop();
  });
});
