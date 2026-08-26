export interface DomainEvent {
  eventId: string;
  topic: string;
}

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => void | Promise<void>;

export type DeliveryResult = "ok" | "error";

export interface DeliveryRecord {
  topic: string;
  eventId: string;
  handler: string;
  result: DeliveryResult;
}

// Port only. The in-memory adapter below is the test double; the split-path
// production adapter is Redis Streams or Kafka with the same two verbs.
export interface EventBusPort {
  subscribe<E extends DomainEvent>(topic: string, handler: EventHandler<E>, name?: string): void;
  publish(event: DomainEvent): Promise<void>;
  deliveryLog(): readonly DeliveryRecord[];
}
