import { Inject, Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import type { Logger } from "pino";
import {
  CANCEL_STATUS_BY_REASON,
  Topics,
  isTerminalStatus,
} from "../contracts/events";
import type {
  InventoryReservationFailedEvent,
  PaymentChargedEvent,
  PaymentFailedEvent,
} from "../contracts/events";
import { InboxDedupe } from "../lib/inbox";
import type { EventBusPort } from "../lib/event-bus.port";
import { RetryPolicy } from "../lib/retry";
import { TOKENS } from "../lib/tokens";
import type { Order } from "./orders.store";
import { MemUnitOfWork } from "./unit-of-work";

// Choreography coordinator: reacts to facts, emits facts, never calls
// inventory or payments directly. Handlers are wrapped in InboxDedupe (skip
// already-seen eventIds) and RetryPolicy (transient faults retry, then dead-letter).
@Injectable()
export class SagaOrchestrator implements OnApplicationBootstrap {
  private readonly inbox = new InboxDedupe();

  constructor(
    @Inject(TOKENS.Bus) private readonly bus: EventBusPort,
    private readonly unitOfWork: MemUnitOfWork,
    private readonly retry: RetryPolicy,
    @Inject(TOKENS.Logger) private readonly logger: Logger,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      Topics.PaymentCharged,
      this.inbox.wrap((event: PaymentChargedEvent) =>
        this.retry.attempt(() => this.confirm(event)),
      ),
      "orders.saga.onPaymentCharged",
    );
    this.bus.subscribe(
      Topics.InventoryReservationFailed,
      this.inbox.wrap((event: InventoryReservationFailedEvent) =>
        this.retry.attempt(() => this.cancelFromFailure(event)),
      ),
      "orders.saga.onReservationFailed",
    );
    this.bus.subscribe(
      Topics.PaymentFailed,
      this.inbox.wrap((event: PaymentFailedEvent) =>
        this.retry.attempt(() => this.compensateAndCancel(event)),
      ),
      "orders.saga.onPaymentFailed",
    );
  }

  private confirm(event: PaymentChargedEvent): void {
    const order = this.orders(event.orderId);
    if (!order || isTerminalStatus(order.status)) return;
    this.unitOfWork.commit(this.withStatus(order, "CONFIRMED"), [
      { topic: Topics.OrderConfirmed, payload: { orderId: order.orderId } },
    ]);
  }

  private cancelFromFailure(event: InventoryReservationFailedEvent): void {
    const order = this.orders(event.orderId);
    if (!order || isTerminalStatus(order.status)) return;
    // Payment was never attempted on this path; nothing to compensate.
    this.unitOfWork.commit(
      this.withStatus(order, CANCEL_STATUS_BY_REASON[event.reason]),
      [
        {
          topic: Topics.OrderCancelled,
          payload: { orderId: order.orderId, reason: event.reason },
        },
      ],
    );
  }

  private compensateAndCancel(event: PaymentFailedEvent): void {
    const order = this.orders(event.orderId);
    if (!order || isTerminalStatus(order.status)) return;
    // Both facts leave in the same simulated transaction: cancel + release cmd.
    // In the split deployment the release command rides its own outbox row.
    this.unitOfWork.commit(this.withStatus(order, "CANCELLED_PAYMENT"), [
      {
        topic: Topics.OrderCancelled,
        payload: { orderId: order.orderId, reason: "payment_failed" },
      },
      { topic: Topics.InventoryReleaseCmd, payload: { orderId: event.orderId } },
    ]);
    this.logger.info({ orderId: event.orderId }, "payment failed - stock release requested");
  }

  private orders(orderId: string): Order | undefined {
    return this.unitOfWork.findOrder(orderId);
  }

  private withStatus(order: Order, status: Order["status"]): Order {
    return { ...order, status, updatedAt: new Date().toISOString() };
  }
}
