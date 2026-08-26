import request from "supertest";
import { describe, expect, it } from "vitest";
import { Topics } from "../src/contracts/events";
import { buildTestApp, waitFor } from "./helpers";

describe("happy-path saga", () => {
  it("confirms the order, projects the view, and decrements stock exactly once", async () => {
    const app = await buildTestApp();
    const created = await request(app.nest.getHttpServer())
      .post("/orders")
      .send({ userId: "user-1", items: [{ sku: "SKU-1", qty: 2 }, { sku: "SKU-2", qty: 1 }] });
    expect(created.status).toBe(201);
    const { orderId } = created.body as { orderId: string };

    const drained = await app.drain();
    expect(drained.pending).toBe(0);
    await waitFor(() => app.orders.find(orderId)?.status === "CONFIRMED");

    // 10-2 and 5-1: reservation applied once despite multi-hop delivery.
    expect(app.inventory.snapshot()).toEqual({ "SKU-1": 8, "SKU-2": 4 });
    expect(app.inventory.holds()).toEqual([orderId]);

    const view = app.views.find(orderId);
    expect(view?.status).toBe("CONFIRMED");
    expect(view?.totalCents).toBe(2 * 1500 + 24000);

    const confirmedDeliveries = app.bus
      .deliveryLog()
      .filter((record) => record.topic === Topics.OrderConfirmed);
    expect(confirmedDeliveries).toHaveLength(1);

    await app.stop();
  });

  it("converges with no drain call when the background relay is live", async () => {
    const app = await buildTestApp({ autoRelayMs: 5 });
    const created = await request(app.nest.getHttpServer())
      .post("/orders")
      .send({ userId: "user-2", items: [{ sku: "SKU-1", qty: 1 }] });
    const orderId = created.body.orderId as string;

    await waitFor(() => app.orders.find(orderId)?.status === "CONFIRMED", 5000);
    expect(app.inventory.snapshot()["SKU-1"]).toBe(9);

    await app.stop();
  });
});
