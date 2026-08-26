import { describe, expect, it } from "vitest";
import { MemEventBus } from "./mem-event-bus";
import { MemOutboxStore } from "./outbox";
import { OutboxRelay } from "./relay";

describe("OutboxRelay.tick", () => {
  it("publishes each pending row exactly once, then marks it published", async () => {
    const seen: string[] = [];
    const bus = new MemEventBus();
    bus.subscribe("order.created", (event) => {
      seen.push(event.eventId);
    }, "spy");
    const store = new MemOutboxStore();
    const first = store.append("order.created", { v: 1 });
    const second = store.append("order.created", { v: 2 });

    const relay = new OutboxRelay(store, bus);
    await expect(relay.tick()).resolves.toBe(2);

    expect(seen).toEqual([first.eventId, second.eventId]);
    expect(store.pending()).toHaveLength(0);
    // Second tick finds nothing pending - no republication.
    await expect(relay.tick()).resolves.toBe(0);
    expect(seen).toHaveLength(2);
  });

  it("keeps draining rows appended by handlers mid-tick (multi-hop sagas)", async () => {
    const bus = new MemEventBus();
    const store = new MemOutboxStore();
    bus.subscribe("step.one", (event) => {
      const payload = event as typeof event & { next: boolean };
      if (!payload.next) store.append("step.one", { next: true });
    }, "chain");
    store.append("step.one", {});
    await expect(new OutboxRelay(store, bus).tick()).resolves.toBe(2);
    expect(store.pending()).toHaveLength(0);
  });
});
