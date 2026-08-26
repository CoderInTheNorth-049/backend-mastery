import { Global, Module } from "@nestjs/common";
import type { DynamicModule, Provider } from "@nestjs/common";
import type { Logger } from "pino";
import { TOKENS } from "./tokens";
import type { EventBusPort } from "./event-bus.port";
import type { OutboxStorePort } from "./outbox";
import type { OutboxRelay } from "./relay";

// Shared infrastructure only. Bounded contexts may import THIS module's tokens
// but never each other - the architecture spec test enforces it.
export interface InfrastructureOptions {
  logger: Logger;
  bus: EventBusPort;
  outbox: OutboxStorePort;
  relay: OutboxRelay;
  stockSeed: Record<string, number>;
  prices: Record<string, number>;
  paymentLimitCents: number;
}

@Global()
@Module({})
export class InfrastructureModule {
  static with(options: InfrastructureOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: TOKENS.Logger, useValue: options.logger },
      { provide: TOKENS.Bus, useValue: options.bus },
      { provide: TOKENS.Outbox, useValue: options.outbox },
      { provide: TOKENS.Relay, useValue: options.relay },
      { provide: TOKENS.StockSeed, useValue: options.stockSeed },
      { provide: TOKENS.Prices, useValue: options.prices },
      { provide: TOKENS.PaymentLimitCents, useValue: options.paymentLimitCents },
    ];
    return {
      module: InfrastructureModule,
      global: true,
      providers,
      exports: providers,
    };
  }
}
