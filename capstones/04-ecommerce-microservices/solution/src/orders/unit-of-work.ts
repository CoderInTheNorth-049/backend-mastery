import { Inject, Injectable } from "@nestjs/common";
import type { OutboxRow, OutboxStorePort } from "../lib/outbox";
import { TOKENS } from "../lib/tokens";
import { OrdersStore } from "./orders.store";
import type { Order } from "./orders.store";

export interface OutboxAppend {
  topic: string;
  payload: Record<string, unknown>;
}

// Stands in for the real boundary:
//   BEGIN; INSERT INTO orders ...; INSERT INTO outbox ...; COMMIT;
// State change and event are one atomic unit - the whole point of the
// transactional outbox. Nothing here ever writes the order without its event.
@Injectable()
export class MemUnitOfWork {
  constructor(
    private readonly orders: OrdersStore,
    @Inject(TOKENS.Outbox) private readonly outbox: OutboxStorePort,
  ) {}

  commit(order: Order, events: OutboxAppend[]): OutboxRow[] {
    this.orders.save(order);
    return events.map((event) => this.outbox.append(event.topic, event.payload));
  }

  // Reads inside the SAME bounded context are allowed (orders reading orders);
  // cross-context reads would have to travel as events instead.
  findOrder(orderId: string): Order | undefined {
    return this.orders.find(orderId);
  }
}
