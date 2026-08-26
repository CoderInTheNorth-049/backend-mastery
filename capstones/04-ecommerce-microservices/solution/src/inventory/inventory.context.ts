import { Inject, Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import type { Logger } from "pino";
import { randomUUID } from "node:crypto";
import { Topics } from "../contracts/events";
import type {
  InventoryReleaseCmd,
  OrderCreatedEvent,
} from "../contracts/events";
import type { EventBusPort } from "../lib/event-bus.port";
import { InboxDedupe } from "../lib/inbox";
import type { OrderItem } from "../lib/money";
import { TOKENS } from "../lib/tokens";

// Inventory bounded context. It sees ONLY order.created facts and
// inventory.release.cmd commands; it has no idea orders or payments exist.
@Injectable()
export class InventoryContext implements OnApplicationBootstrap {
  private readonly stock: Map<string, number>;
  // orderId -> held lines. In production these are TTL holds swept by a timer;
  // the release command path here is the compensation counterpart.
  private readonly reservations = new Map<string, OrderItem[]>();
  private readonly inbox = new InboxDedupe();

  constructor(
    @Inject(TOKENS.Bus) private readonly bus: EventBusPort,
    @Inject(TOKENS.Logger) private readonly logger: Logger,
    @Inject(TOKENS.StockSeed) stockSeed: Record<string, number>,
  ) {
    this.stock = new Map(Object.entries(stockSeed));
  }

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      Topics.OrderCreated,
      this.inbox.wrap(async (event: OrderCreatedEvent) => this.reserve(event)),
      "inventory.onOrderCreated",
    );
    this.bus.subscribe(
      Topics.InventoryReleaseCmd,
      this.inbox.wrap(async (event: InventoryReleaseCmd) => this.release(event)),
      "inventory.onReleaseCmd",
    );
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.stock);
  }

  holds(): string[] {
    return [...this.reservations.keys()];
  }

  private async reserve(event: OrderCreatedEvent): Promise<void> {
    // Evaluate every line BEFORE touching stock - a partial decrement would be
    // unrecoverable without a compensating write.
    const shortage = event.items.find(
      (item) => (this.stock.get(item.sku) ?? 0) < item.qty,
    );
    if (shortage !== undefined) {
      await this.emit(Topics.InventoryReservationFailed, {
        orderId: event.orderId,
        reason: "insufficient_stock",
      });
      return;
    }
    for (const item of event.items) {
      this.stock.set(item.sku, (this.stock.get(item.sku) ?? 0) - item.qty);
    }
    this.reservations.set(event.orderId, event.items);
    await this.emit(Topics.InventoryReserved, {
      orderId: event.orderId,
      totalCents: event.totalCents,
      ...(event.failPayment === true ? { failPayment: true } : {}),
    });
  }

  private async release(event: InventoryReleaseCmd): Promise<void> {
    const held = this.reservations.get(event.orderId);
    if (!held) {
      // Unknown hold: idempotent no-op rather than phantom restock.
      return;
    }
    for (const item of held) {
      this.stock.set(item.sku, (this.stock.get(item.sku) ?? 0) + item.qty);
    }
    this.reservations.delete(event.orderId);
    await this.emit(Topics.InventoryReleased, {
      orderId: event.orderId,
    });
  }

  // In the split deployment inventory runs its own outbox+relay pair; here the
  // fact goes straight onto the bus because nothing durable depends on it.
  private emit(topic: string, payload: Record<string, unknown>): Promise<void> {
    this.logger.debug({ topic }, "inventory emitted");
    return this.bus.publish({ ...payload, eventId: randomUUID(), topic });
  }
}
