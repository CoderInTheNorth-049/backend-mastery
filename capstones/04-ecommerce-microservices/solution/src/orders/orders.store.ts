import { Injectable } from "@nestjs/common";
import type { OrderStatus } from "../contracts/events";
import type { OrderItem } from "../lib/money";

export interface Order {
  orderId: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class OrdersStore {
  private readonly byId = new Map<string, Order>();

  save(order: Order): void {
    this.byId.set(order.orderId, order);
  }

  find(orderId: string): Order | undefined {
    return this.byId.get(orderId);
  }
}
