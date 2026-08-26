import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pino from "pino";
import type { Logger } from "pino";
import { AppModule } from "./app.module";
import type { EventBusPort } from "./lib/event-bus.port";
import { MemEventBus } from "./lib/mem-event-bus";
import { MemOutboxStore } from "./lib/outbox";
import type { OutboxStorePort } from "./lib/outbox";
import { OutboxRelay } from "./lib/relay";
import { requestIdMiddleware } from "./lib/request-id";
import { InventoryContext } from "./inventory/inventory.context";
import { OrderViewStore } from "./orders/cqrs/order-view.store";
import { OrdersStore } from "./orders/orders.store";

export const DEFAULT_STOCK_SEED: Record<string, number> = { "SKU-1": 10, "SKU-2": 5 };
export const DEFAULT_PRICES_CENTS: Record<string, number> = {
  "SKU-1": 1500,
  "SKU-2": 24000,
};
const DEFAULT_PAYMENT_LIMIT_CENTS = 50000;
const DEFAULT_AUTO_RELAY_MS = 100;

export interface AppOptions {
  port?: number;
  stockSeed?: Record<string, number>;
  prices?: Record<string, number>;
  paymentLimitCents?: number;
  // Background relay cadence. `null` disables it (tests pump via drain());
  // undefined falls back to AUTO_RELAY_MS / 100ms.
  autoRelayMs?: number | null;
  logLevel?: string;
}

export interface BuiltApp {
  port: number;
  nest: INestApplication;
  bus: MemEventBus;
  outbox: OutboxStorePort & MemOutboxStore;
  relay: OutboxRelay;
  orders: OrdersStore;
  views: OrderViewStore;
  inventory: InventoryContext;
  logger: Logger;
  drain(): Promise<{ published: number; pending: number }>;
  stop(): Promise<void>;
}

function parseJsonEnv(name: string, fallback: Record<string, number>): Record<string, number> {
  const raw = process.env[name];
  if (!raw) return fallback;
  return JSON.parse(raw) as Record<string, number>;
}

function resolveAutoRelayMs(option: AppOptions["autoRelayMs"]): number | null {
  if (option !== undefined) return option;
  const raw = process.env.AUTO_RELAY_MS;
  if (raw === undefined) return DEFAULT_AUTO_RELAY_MS;
  if (raw === "0" || raw === "null") return null;
  return Number(raw);
}

// Single composition root for main.ts AND the test suite - tests boot exactly
// what production boots, minus the socket.
export async function buildApp(options: AppOptions = {}): Promise<BuiltApp> {
  const port = options.port ?? Number(process.env.PORT ?? 3004);
  const logger = pino({ level: options.logLevel ?? process.env.LOG_LEVEL ?? "info" });
  const bus = new MemEventBus((error, record) =>
    logger.error({ err: error, delivery: record }, "event handler failed"),
  );
  const outbox = new MemOutboxStore();
  const relay = new OutboxRelay(outbox, bus);
  const stockSeed = options.stockSeed ?? parseJsonEnv("STOCK_SEED", DEFAULT_STOCK_SEED);
  const prices = options.prices ?? parseJsonEnv("PRICES", DEFAULT_PRICES_CENTS);
  const paymentLimitCents =
    options.paymentLimitCents ?? Number(process.env.PAYMENT_LIMIT_CENTS ?? DEFAULT_PAYMENT_LIMIT_CENTS);

  const nest = await NestFactory.create(
    AppModule.forRoot({ logger, bus, outbox, relay, stockSeed, prices, paymentLimitCents }),
    { logger: false },
  );
  nest.use(requestIdMiddleware);

  let relayTimer: NodeJS.Timeout | undefined;
  const autoRelayMs = resolveAutoRelayMs(options.autoRelayMs);
  if (autoRelayMs !== null) {
    relayTimer = setInterval(() => {
      void relay.tick().catch((error: unknown) => logger.error({ err: error }, "relay tick failed"));
    }, autoRelayMs);
    relayTimer.unref();
  }

  await nest.init();

  const drain = async (): Promise<{ published: number; pending: number }> => {
    const published = await relay.tick();
    return { published, pending: outbox.pending().length };
  };
  const stop = async (): Promise<void> => {
    if (relayTimer !== undefined) clearInterval(relayTimer);
    await nest.close();
  };

  return {
    port,
    nest,
    bus,
    outbox,
    relay,
    orders: nest.get(OrdersStore),
    views: nest.get(OrderViewStore),
    inventory: nest.get(InventoryContext),
    logger,
    drain,
    stop,
  };
}
