import type { DomainEvent } from "../lib/event-bus.port";
import type { OrderItem } from "../lib/money";

// This file is the shared event schema. In a real split it becomes a
// versioned npm package (or schema registry) consumed by every service -
// it is the ONLY thing contexts are allowed to have in common besides lib/.

export const Topics = {
  OrderCreated: "order.created",
  InventoryReserved: "inventory.reserved",
  InventoryReservationFailed: "inventory.reservation_failed",
  PaymentCharged: "payment.charged",
  PaymentFailed: "payment.failed",
  OrderConfirmed: "order.confirmed",
  OrderCancelled: "order.cancelled",
  InventoryReleased: "inventory.released",
  InventoryReleaseCmd: "inventory.release.cmd",
} as const;

export type CancelReason = "insufficient_stock" | "payment_failed";

export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED_STOCK" | "CANCELLED_PAYMENT";

export function isTerminalStatus(status: OrderStatus): boolean {
  return status !== "PENDING";
}

export const CANCEL_STATUS_BY_REASON: Record<CancelReason, OrderStatus> = {
  insufficient_stock: "CANCELLED_STOCK",
  payment_failed: "CANCELLED_PAYMENT",
};

export interface OrderCreatedEvent extends DomainEvent {
  topic: "order.created";
  orderId: string;
  userId: string;
  items: OrderItem[];
  totalCents: number;
  // Chaos hook for drills: rides along the chain so payments can simulate a decline.
  failPayment?: boolean;
}

export interface InventoryReservedEvent extends DomainEvent {
  topic: "inventory.reserved";
  orderId: string;
  totalCents: number;
  failPayment?: boolean;
}

export interface InventoryReservationFailedEvent extends DomainEvent {
  topic: "inventory.reservation_failed";
  orderId: string;
  reason: "insufficient_stock";
}

export interface PaymentChargedEvent extends DomainEvent {
  topic: "payment.charged";
  orderId: string;
  amountCents: number;
}

export interface PaymentFailedEvent extends DomainEvent {
  topic: "payment.failed";
  orderId: string;
  reason: "chaos_fail_payment" | "amount_exceeds_limit";
}

export interface OrderConfirmedEvent extends DomainEvent {
  topic: "order.confirmed";
  orderId: string;
}

export interface OrderCancelledEvent extends DomainEvent {
  topic: "order.cancelled";
  orderId: string;
  reason: CancelReason;
}

export interface InventoryReleasedEvent extends DomainEvent {
  topic: "inventory.released";
  orderId: string;
}

// Command topic: imperative, targeted at inventory, distinct from facts.
export interface InventoryReleaseCmd extends DomainEvent {
  topic: "inventory.release.cmd";
  orderId: string;
}

export type CommerceEvent =
  | OrderCreatedEvent
  | InventoryReservedEvent
  | InventoryReservationFailedEvent
  | PaymentChargedEvent
  | PaymentFailedEvent
  | OrderConfirmedEvent
  | OrderCancelledEvent
  | InventoryReleasedEvent
  | InventoryReleaseCmd;
