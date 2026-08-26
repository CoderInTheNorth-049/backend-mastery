import { describe, expect, it, vi } from "vitest";
import { MemEventBus } from "./mem-event-bus";

describe("MemEventBus", () => {
  it("awaits handlers sequentially in subscription order", async () => {
    const bus = new MemEventBus();
    const order: string[] = [];
    bus.subscribe("t", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("slow-first");
    }, "slow");
    bus.subscribe("t", () => {
      order.push("fast-second");
    }, "fast");

    await bus.publish({ eventId: "e-1", topic: "t" });
    expect(order).toEqual(["slow-first", "fast-second"]);
  });

  it("isolates a failing handler so peers still receive the event", async () => {
    const onError = vi.fn();
    const bus = new MemEventBus(onError);
    let survivorRan = false;
    bus.subscribe("t", () => {
      throw new Error("poisoned consumer");
    }, "poisoned");
    bus.subscribe("t", () => {
      survivorRan = true;
    }, "survivor");

    await bus.publish({ eventId: "e-1", topic: "t" });

    expect(survivorRan).toBe(true);
    expect(onError).toHaveBeenCalledTimes(1);
    const log = bus.deliveryLog();
    expect(log.map((record) => [record.handler, record.result])).toEqual([
      ["poisoned", "error"],
      ["survivor", "ok"],
    ]);
  });
});
