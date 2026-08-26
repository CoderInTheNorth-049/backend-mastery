import { Inject, Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import type { Logger } from "pino";
import {
  CANCEL_STATUS_BY_REASON,
  Topics,
} from "../../contracts/events";
import type {
  OrderCancelledEvent,
  OrderConfirmedEvent,
  OrderCreatedEvent,
  OrderStatus,
} from "../../contracts/events";
import type { EventBusPort } from "../../lib/event-bus.port";
import { InboxDedupe } from "../../lib/inbox";
import { TOKENS } from "../../lib/tokens";
import type { OrderView } from "./order-view.store";
import { OrderViewStore } from "./order-view.store";

// Eventually-consistent projection built ONLY from this context's own
// order.* facts (including the normalized order.cancelled outcome), so the
// read model survives a future split without touching inventory/payments.
@Injectable()
export class OrderProjector implements OnApplicationBootstrap {
  private readonly inbox = new InboxDedupe();

  constructor(
    @Inject(TOKENS.Bus) private readonly bus: EventBusPort,
    private readonly views: OrderViewStore,
    @Inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      Topics.OrderCreated,
      this.inbox.wrap((event: OrderCreatedEvent) => {
        this.views.upsert({
          orderId: event.orderId,
          status: "PENDING",
          totalCents: event.totalCents,
          items: event.items,
          updatedAt: new Date().toISOString(),
        });
      }),
      "orders.projector.onOrderCreated",
    );
    this.bus.subscribe(
      Topics.OrderConfirmed,
      this.inbox.wrap((event: OrderConfirmedEvent) => {
        this.applyStatus(event.orderId, "CONFIRMED");
      }),
      "orders.projector.onOrderConfirmed",
    );
    this.bus.subscribe(
      Topics.OrderCancelled,
      this.inbox.wrap((event: OrderCancelledEvent) => {
        this.applyStatus(event.orderId, CANCEL_STATUS_BY_REASON[event.reason]);
      }),
      "orders.projector.onOrderCancelled",
    );
  }

  private applyStatus(orderId: string, status: OrderStatus): void {
    const previous = this.views.find(orderId);
    // Tolerate out-of-order arrival: synthesize a stub if order.created has
    // not landed yet; the eventual consistency gap is the teaching point.
    const view: OrderView = {
      orderId,
      status,
      totalCents: previous?.totalCents ?? 0,
      items: previous?.items ?? [],
      updatedAt: new Date().toISOString(),
    };
    this.views.upsert(view);
    this.logger.debug({ orderId, status }, "projected");
  }
}
