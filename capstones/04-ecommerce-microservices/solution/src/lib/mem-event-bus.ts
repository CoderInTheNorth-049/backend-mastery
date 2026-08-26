import type { DeliveryRecord, DomainEvent, EventBusPort, EventHandler } from "./event-bus.port";

interface Subscription {
  name: string;
  handler: EventHandler<DomainEvent>;
}

export class MemEventBus implements EventBusPort {
  private readonly subscriptions = new Map<string, Subscription[]>();
  private readonly log: DeliveryRecord[] = [];

  constructor(private readonly onError?: (error: unknown, record: DeliveryRecord) => void) {}

  subscribe<E extends DomainEvent>(topic: string, handler: EventHandler<E>, name?: string): void {
    const subscription: Subscription = {
      name: name ?? (handler.name || "anonymous"),
      handler: handler as EventHandler<DomainEvent>,
    };
    const existing = this.subscriptions.get(topic) ?? [];
    existing.push(subscription);
    this.subscriptions.set(topic, existing);
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const subscription of [...(this.subscriptions.get(event.topic) ?? [])]) {
      const record: DeliveryRecord = {
        topic: event.topic,
        eventId: event.eventId,
        handler: subscription.name,
        result: "ok",
      };
      try {
        await subscription.handler(event);
      } catch (error) {
        // Per-handler isolation: one poisoned consumer must never starve its peers.
        record.result = "error";
        this.onError?.(error, record);
      } finally {
        this.log.push(record);
      }
    }
  }

  deliveryLog(): readonly DeliveryRecord[] {
    return this.log;
  }
}
