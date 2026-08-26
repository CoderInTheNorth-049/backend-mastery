import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp, waitFor } from "./helpers";

describe("insufficient-stock saga", () => {
  it("cancels with CANCELLED_STOCK and never lets payments see the order", async () => {
    const app = await buildTestApp();
    const created = await request(app.nest.getHttpServer())
      .post("/orders")
      .send({ userId: "user-3", items: [{ sku: "SKU-1", qty: 99 }] });
    const orderId = created.body.orderId as string;

    await app.drain();
    await waitFor(() => app.orders.find(orderId)?.status === "CANCELLED_STOCK");

    // Stock untouched, hold not recorded.
    expect(app.inventory.snapshot()).toEqual({ "SKU-1": 10, "SKU-2": 5 });
    expect(app.inventory.holds()).toHaveLength(0);

    // Zero payments deliveries anywhere in this flow - proven via DeliveryLog.
    const paymentsDeliveries = app.bus
      .deliveryLog()
      .filter((record) => record.handler.startsWith("payments."));
    expect(paymentsDeliveries).toHaveLength(0);

    const view = app.views.find(orderId);
    expect(view?.status).toBe("CANCELLED_STOCK");

    await app.stop();
  });
});
