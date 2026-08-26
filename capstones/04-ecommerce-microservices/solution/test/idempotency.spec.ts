import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { Topics } from "../src/contracts/events";
import type { InventoryReservedEvent } from "../src/contracts/events";
import { buildTestApp, waitFor } from "./helpers";

describe("idempotent cooperation", () => {
  it("processes a redelivered order.created exactly once end to end", async () => {
    const app = await buildTestApp();
    const created = await request(app.nest.getHttpServer())
      .post("/orders")
      .send({ userId: "user-6", items: [{ sku: "SKU-1", qty: 2 }] });
    const orderId = created.body.orderId as string;

    // Simulate broker redelivery of the SAME envelope (same eventId), twice,
    // then let the relay deliver it a third time.
    const row = app.outbox.pending()[0];
    expect(row).toBeDefined();
    const replay = { eventId: row.eventId, topic: row.topic, ...row.payload };
    await app.bus.publish(replay);
    await app.bus.publish(replay);
    await app.drain();

    await waitFor(() => app.orders.find(orderId)?.status === "CONFIRMED");

    // InboxDedupe proof: one reservation (8 left), one confirmation fact.
    expect(app.inventory.snapshot()["SKU-1"]).toBe(8);
    const confirmedDeliveries = app.bus
      .deliveryLog()
      .filter((record) => record.topic === Topics.OrderConfirmed && record.result === "ok");
    expect(confirmedDeliveries).toHaveLength(1);

    await app.stop();
  });

  it("payments never charges the same orderId twice, even across different eventIds", async () => {
    const app = await buildTestApp();
    // Different eventIds defeat inbox dedupe; only the payments-side guard
    // (orderId as idempotency key) can stop the double charge.
    const first: InventoryReservedEvent = {
      eventId: randomUUID(),
      topic: Topics.InventoryReserved,
      orderId: "ord-dup",
      totalCents: 1000,
    };
    const second: InventoryReservedEvent = { ...first, eventId: randomUUID() };
    await app.bus.publish(first);
    await app.bus.publish(second);

    // bus.publish awaits its handlers sequentially, so both deliveries have
    // fully settled here - no polling needed.
    const charges = app.bus
      .deliveryLog()
      .filter((record) => record.topic === Topics.PaymentCharged && record.result === "ok");
    expect(charges).toHaveLength(1);

    await app.stop();
  });
});
