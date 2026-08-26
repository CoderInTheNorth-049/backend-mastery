import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { OrderItem } from "../lib/money";
import { badRequest, notFound } from "../lib/problem-json";
import { OrderViewStore } from "./cqrs/order-view.store";
import { OrdersService } from "./orders.service";

export interface CreateOrderCommand {
  userId: string;
  items: OrderItem[];
  failPayment?: boolean;
}

interface RawCreateOrderBody {
  userId?: unknown;
  items?: unknown;
  failPayment?: unknown;
}

function parseCreateOrder(body: unknown): CreateOrderCommand {
  if (typeof body !== "object" || body === null) {
    throw badRequest("body must be a JSON object");
  }
  const raw = body as RawCreateOrderBody;
  if (typeof raw.userId !== "string" || raw.userId.length === 0) {
    throw badRequest("userId must be a non-empty string");
  }
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw badRequest("items must be a non-empty array of {sku, qty}");
  }
  const items: OrderItem[] = raw.items.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw badRequest(`items[${index}] must be an object`);
    }
    const item = entry as { sku?: unknown; qty?: unknown };
    if (typeof item.sku !== "string" || item.sku.length === 0) {
      throw badRequest(`items[${index}].sku must be a non-empty string`);
    }
    if (typeof item.qty !== "number" || !Number.isInteger(item.qty) || item.qty <= 0) {
      throw badRequest(`items[${index}].qty must be a positive integer`);
    }
    return { sku: item.sku, qty: item.qty };
  });
  if (raw.failPayment !== undefined && typeof raw.failPayment !== "boolean") {
    throw badRequest("failPayment must be a boolean");
  }
  return {
    userId: raw.userId,
    items,
    ...(raw.failPayment === true ? { failPayment: true } : {}),
  };
}

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly views: OrderViewStore,
  ) {}

  // Returns the write-model snapshot synchronously. Progression to CONFIRMED
  // happens asynchronously via the bus - callers must poll, not wait.
  @Post()
  create(@Body() body: unknown): { orderId: string; status: string } {
    return this.ordersService.create(parseCreateOrder(body));
  }

  @Get("view/:id")
  view(@Param("id") orderId: string) {
    const view = this.views.find(orderId);
    if (!view) {
      throw notFound(`no order view for ${orderId}`);
    }
    return view;
  }

  @Get(":id")
  find(@Param("id") orderId: string) {
    const order = this.ordersService.find(orderId);
    if (!order) {
      throw notFound(`no order ${orderId}`);
    }
    return order;
  }
}
