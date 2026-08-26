import { Injectable } from "@nestjs/common";
import type { OrderStatus } from "../../contracts/events";
import type { OrderItem } from "../../lib/money";

export interface OrderView {
  orderId: string;
  status: OrderStatus;
  totalCents: number;
  items: OrderItem[];
  updatedAt: string;
}

// Denormalized read model - the table the UI queries. Writes come only from
// the projector; nothing in the write path ever touches it.
@Injectable()
export class OrderViewStore {
  private readonly byId = new Map<string, OrderView>();

  upsert(view: OrderView): void {
    this.byId.set(view.orderId, view);
  }

  find(orderId: string): OrderView | undefined {
    return this.byId.get(orderId);
  }
}
