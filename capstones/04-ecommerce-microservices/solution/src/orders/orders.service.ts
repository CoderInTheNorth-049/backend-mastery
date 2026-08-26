import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Topics } from "../contracts/events";
import type { CreateOrderCommand } from "./orders.controller";
import type { Order } from "./orders.store";
import { OrdersStore } from "./orders.store";
import { sumItems } from "../lib/money";
import { unprocessable } from "../lib/problem-json";
import { MemUnitOfWork } from "./unit-of-work";
import { TOKENS } from "../lib/tokens";

@Injectable()
export class OrdersService {
  constructor(
    private readonly unitOfWork: MemUnitOfWork,
    private readonly orders: OrdersStore,
    @Inject(TOKENS.Prices) private readonly prices: Record<string, number>,
  ) {}

  create(command: CreateOrderCommand): { orderId: string; status: Order["status"] } {
    let totalCents: number;
    try {
      totalCents = sumItems(command.items, this.prices);
    } catch (error) {
      throw unprocessable((error as Error).message);
    }

    const orderId = randomUUID();
    const now = new Date().toISOString();
    const order: Order = {
      orderId,
      userId: command.userId,
      status: "PENDING",
      items: command.items.map((item) => ({ ...item })),
      totalCents,
      createdAt: now,
      updatedAt: now,
    };
    this.unitOfWork.commit(order, [
      {
        topic: Topics.OrderCreated,
        payload: {
          orderId,
          userId: command.userId,
          items: order.items,
          totalCents,
          ...(command.failPayment === true ? { failPayment: true } : {}),
        },
      },
    ]);
    return { orderId, status: order.status };
  }

  find(orderId: string): Order | undefined {
    return this.orders.find(orderId);
  }
}
