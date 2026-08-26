import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import type { DynamicModule, Provider } from "@nestjs/common";
import type { Logger } from "pino";
import { AdminController } from "./admin.controller";
import { HealthController } from "./health.controller";
import { InfrastructureModule } from "./lib/infrastructure.module";
import type { EventBusPort } from "./lib/event-bus.port";
import type { OutboxStorePort } from "./lib/outbox";
import { ProblemJsonFilter } from "./lib/problem-json";
import type { OutboxRelay } from "./lib/relay";
import { InventoryModule } from "./inventory/inventory.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";

export interface AppDependencies {
  logger: Logger;
  bus: EventBusPort;
  outbox: OutboxStorePort;
  relay: OutboxRelay;
  stockSeed: Record<string, number>;
  prices: Record<string, number>;
  paymentLimitCents: number;
}

@Module({})
export class AppModule {
  static forRoot(dependencies: AppDependencies): DynamicModule {
    const globalFilter: Provider = {
      provide: APP_FILTER,
      useValue: new ProblemJsonFilter(dependencies.logger),
    };
    return {
      module: AppModule,
      imports: [
        InfrastructureModule.with(dependencies),
        // Contexts are wired side by side; they never import one another.
        OrdersModule,
        InventoryModule,
        PaymentsModule,
      ],
      controllers: [HealthController, AdminController],
      providers: [globalFilter],
    };
  }
}
