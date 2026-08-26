import request from "supertest";
import { describe, expect, it } from "vitest";
import { Topics } from "../src/contracts/events";
import type { PaymentFailedEvent } from "../src/contracts/events";
import { buildTestApp, waitFor } from "./helpers";

describe("payment limit guard", () => {
  it("declines amounts above the limit, cancels the order, releases stock", async () => {
    const app = await buildTestApp(); // default limit 50000 cents
    const reasons: PaymentFailedEvent["reason"][] = [];
    app.bus.subscribe(
      Topics.PaymentFailed,
      (event: PaymentFailedEvent) => {
        reasons.push(event.reason);
      },
      "test.paymentFailedSpy",
    );

    // 3 x 24000 = 72000 > 50000.
    const created = await request(app.nest.getHttpServer())
      .post("/orders")
      .send({ userId: "user-5", items: [{ sku: "SKU-2", qty: 3 }] });
    const orderId = created.body.orderId as string;

    await app.drain();
    await waitFor(() => app.orders.find(orderId)?.status === "CANCELLED_PAYMENT");

    expect(reasons).toEqual(["amount_exceeds_limit"]);
    expect(app.inventory.snapshot()["SKU-2"]).toBe(5); // compensation ran here too

    await app.stop();
  });
});
