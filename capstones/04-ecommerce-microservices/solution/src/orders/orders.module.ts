import { Module } from "@nestjs/common";
import type { Provider } from "@nestjs/common";
import { OrderProjector } from "./cqrs/projector";
import { OrderViewStore } from "./cqrs/order-view.store";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersStore } from "./orders.store";
import { RetryPolicy } from "../lib/retry";
import { SagaOrchestrator } from "./saga-orchestrator";
import { MemUnitOfWork } from "./unit-of-work";

// Bounded context root. Imports NOTHING from ../inventory or ../payments -
// cooperation happens exclusively over the EventBus port.
const providers: Provider[] = [
  OrdersStore,
  MemUnitOfWork,
  OrdersService,
  RetryPolicy,
  SagaOrchestrator,
  OrderViewStore,
  OrderProjector,
];

@Module({
  controllers: [OrdersController],
  providers,
  exports: providers,
})
export class OrdersModule {}
