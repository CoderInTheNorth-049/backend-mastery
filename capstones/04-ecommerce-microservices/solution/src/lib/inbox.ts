import type { DomainEvent, EventHandler } from "./event-bus.port";

// Consumer-side idempotency gate. In production `seen` is an inbox table whose
// insert shares the transaction with the handler's side effects; a Set stands
// in for the single-deployable.
export class InboxDedupe {
  private readonly seen = new Set<string>();

  constructor(private readonly onDuplicate?: (eventId: string) => void) {}

  wrap<E extends DomainEvent>(handler: EventHandler<E>): EventHandler<E> {
    return async (event: E) => {
      if (this.seen.has(event.eventId)) {
        this.onDuplicate?.(event.eventId);
        return;
      }
      // Claim before processing: a redelivery mid-flight skips instead of
      // double-spending; the durable equivalent is INSERT ... ON CONFLICT DO NOTHING.
      this.seen.add(event.eventId);
      await handler(event);
    };
  }

  hasSeen(eventId: string): boolean {
    return this.seen.has(eventId);
  }
}
