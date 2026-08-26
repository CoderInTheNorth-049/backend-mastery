import request from "supertest";
import { describe, expect, it } from "vitest";
import { Topics } from "../src/contracts/events";
import type { InventoryReleasedEvent } from "../src/contracts/events";
import { buildTestApp, waitFor } from "./helpers";

describe("payment-failure compensation", () => {
  it("restores inventory to its original quantities after a chaos decline", async () => {
    const app = await buildTestApp();
    const before = app.inventory.snapshot();
    // Stand-in for an observer context (e.g. notifications) proving the
    // release fact actually flowed - stock levels alone could coincide.
    const releases: string[] = [];
    app.bus.subscribe(
      Topics.InventoryReleased,
      (event: InventoryReleasedEvent) => {
        releases.push(event.orderId);
      },
      "test.inventoryReleasedSpy",
    );

    const created = await request(app.nest.getHttpServer())
      .post("/orders")
      .send({
        userId: "user-4",
        items: [{ sku: "SKU-1", qty: 3 }, { sku: "SKU-2", qty: 1 }],
        failPayment: true,
      });
    const orderId = created.body.orderId as string;

    await app.drain();
    await waitFor(() => app.orders.find(orderId)?.status === "CANCELLED_PAYMENT");

    // Compensation verified numerically: every reserved unit is back.
    expect(app.inventory.snapshot()).toEqual(before);
    expect(app.inventory.holds()).toHaveLength(0);
    expect(releases).toEqual([orderId]);

    const view = app.views.find(orderId);
    expect(view?.status).toBe("CANCELLED_PAYMENT");

    await app.stop();
  });
});
