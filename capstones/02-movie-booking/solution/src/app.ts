import "reflect-metadata";
import type { DynamicModule, INestApplication, OnApplicationShutdown, Provider } from "@nestjs/common";
import { Inject, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pino from "pino";
import { loadConfig } from "./config";
import { BookingService } from "./domain/booking-service";
import { HoldService } from "./domain/hold-service";
import { SweepService } from "./domain/sweep-service";
import type { BookingStore, Clock, PaymentGateway } from "./domain/types";
import { SystemClock } from "./infra/clocks";
import { MemoryBookingStore } from "./infra/memory-booking-store";
import { PgBookingStore } from "./infra/pg-booking-store";
import { MemPaymentGateway } from "./infra/payment-gateway";
import { HealthController } from "./http/health.controller";
import { HoldsController } from "./http/holds.controller";
import { MoviesController } from "./http/movies.controller";
import { PinoLoggerService } from "./http/pino-logger.service";
import { ProblemJsonFilter } from "./http/problem-json.filter";
import { requestIdMiddleware } from "./http/request-id.middleware";
import { ShowingsController } from "./http/showings.controller";
import { TOKENS } from "./http/tokens";

export interface AppOptions {
  clock?: Clock;
  store?: BookingStore;
  paymentGateway?: PaymentGateway;
  holdTtlMs?: number;
  sweepIntervalMs?: number;
  logLevel?: string;
  /** Tests set this false and drive SweepService manually against the fake clock. */
  autoStartSweep?: boolean;
}

interface ResolvedOptions {
  clock: Clock;
  store: BookingStore;
  paymentGateway: PaymentGateway;
  holdTtlMs: number;
  sweepIntervalMs: number;
  logLevel: string;
  autoStartSweep: boolean;
}

function resolveOptions(options: AppOptions): ResolvedOptions {
  const env = loadConfig();
  const clock = options.clock ?? new SystemClock();
  return {
    clock,
    // Adapter switch: DATABASE_URL opts into real Postgres; otherwise memory.
    store: options.store ?? (env.databaseUrl ? PgBookingStore.fromUrl(env.databaseUrl, clock) : new MemoryBookingStore(clock)),
    paymentGateway: options.paymentGateway ?? new MemPaymentGateway(),
    holdTtlMs: options.holdTtlMs ?? env.holdTtlMs,
    sweepIntervalMs: options.sweepIntervalMs ?? env.sweepIntervalMs,
    logLevel: options.logLevel ?? env.logLevel,
    autoStartSweep: options.autoStartSweep ?? true,
  };
}

class StoreShutdownHook implements OnApplicationShutdown {
  constructor(
    @Inject(TOKENS.BookingStore) private readonly store: BookingStore,
    private readonly sweep: SweepService,
  ) {}

  onApplicationShutdown(): Promise<void> {
    this.sweep.stop();
    return this.store.close();
  }
}

@Module({})
class AppModule {
  static register(resolved: ResolvedOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: TOKENS.Clock, useValue: resolved.clock },
      { provide: TOKENS.BookingStore, useValue: resolved.store },
      { provide: TOKENS.PaymentGateway, useValue: resolved.paymentGateway },
      { provide: TOKENS.HoldTtlMs, useValue: resolved.holdTtlMs },
      {
        provide: HoldService,
        useFactory: (store: BookingStore, clock: Clock, ttl: number) => new HoldService(store, clock, ttl),
        inject: [TOKENS.BookingStore, TOKENS.Clock, TOKENS.HoldTtlMs],
      },
      {
        provide: BookingService,
        useFactory: (store: BookingStore, clock: Clock, gateway: PaymentGateway) =>
          new BookingService(store, clock, gateway),
        inject: [TOKENS.BookingStore, TOKENS.Clock, TOKENS.PaymentGateway],
      },
      {
        provide: SweepService,
        useFactory: (store: BookingStore) => new SweepService(store),
        inject: [TOKENS.BookingStore],
      },
      StoreShutdownHook,
    ];
    return {
      module: AppModule,
      controllers: [MoviesController, ShowingsController, HoldsController, HealthController],
      providers,
    };
  }
}

/**
 * Shared factory for production (main.ts) and tests (supertest against
 * app.getHttpServer()). Inits the HTTP stack without binding a port so tests
 * never fight over one.
 */
export async function buildApp(options: AppOptions = {}): Promise<INestApplication> {
  const resolved = resolveOptions(options);
  const logger = pino({ level: resolved.logLevel });

  const app = await NestFactory.create(AppModule.register(resolved), { logger: false });
  app.use(requestIdMiddleware);
  app.useLogger(new PinoLoggerService(logger));
  app.useGlobalFilters(new ProblemJsonFilter(logger));
  app.enableShutdownHooks();
  await app.init();

  if (resolved.autoStartSweep) {
    app.get(SweepService).startAutoSweep(resolved.clock, resolved.sweepIntervalMs);
  }
  return app;
}
