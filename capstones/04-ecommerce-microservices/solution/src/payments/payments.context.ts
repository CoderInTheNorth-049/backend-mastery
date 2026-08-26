import { Inject, Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import type { Logger } from "pino";
import { randomUUID } from "node:crypto";
import { Topics } from "../contracts/events";
import type {
  InventoryReservedEvent,
  PaymentChargedEvent,
  PaymentFailedEvent,
} from "../contracts/events";
import type { EventBusPort } from "../lib/event-bus.port";
import { InboxDedupe } from "../lib/inbox";
import { TOKENS } from "../lib/tokens";

// Payments bounded context. Subscribes only to inventory.reserved; emits
// payment facts; knows nothing about orders or inventory internals.
@Injectable()
export class PaymentsContext implements OnApplicationBootstrap {
  // Intent idempotency: orderId doubles as the idempotency key. InboxDedupe
  // already drops same-eventId replays, but a DIFFERENT eventId carrying the
  // same orderId (relay retry, upstream bug) must also never double-charge.
  private readonly attemptedOrderIds = new Set<string>();
  private readonly inbox = new InboxDedupe();

  constructor(
    @Inject(TOKENS.Bus) private readonly bus: EventBusPort,
    @Inject(TOKENS.Logger) private readonly logger: Logger,
    @Inject(TOKENS.PaymentLimitCents) private readonly limitCents: number,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      Topics.InventoryReserved,
      this.inbox.wrap(async (event: InventoryReservedEvent) => this.charge(event)),
      "payments.onInventoryReserved",
    );
  }

  private async charge(event: InventoryReservedEvent): Promise<void> {
    if (this.attemptedOrderIds.has(event.orderId)) {
      this.logger.warn({ orderId: event.orderId }, "duplicate payment intent suppressed");
      return;
    }
    this.attemptedOrderIds.add(event.orderId);

    if (event.failPayment === true) {
      await this.fail(event.orderId, "chaos_fail_payment");
      return;
    }
    if (event.totalCents > this.limitCents) {
      await this.fail(event.orderId, "amount_exceeds_limit");
      return;
    }
    await this.emit(Topics.PaymentCharged, {
      orderId: event.orderId,
      amountCents: event.totalCents,
    });
  }

  private fail(orderId: string, reason: PaymentFailedEvent["reason"]): Promise<void> {
    this.logger.info({ orderId, reason }, "payment failed");
    return this.emit(Topics.PaymentFailed, { orderId, reason });
  }

  // Split-path note: these facts would flow through payments' own outbox.
  private emit(topic: string, payload: Record<string, unknown>): Promise<void> {
    return this.bus.publish({ ...payload, eventId: randomUUID(), topic });
  }
}
