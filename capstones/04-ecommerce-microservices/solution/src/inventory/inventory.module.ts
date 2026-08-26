import { Module } from "@nestjs/common";
import { InventoryContext } from "./inventory.context";
import { InventoryController } from "./inventory.controller";

@Module({
  controllers: [InventoryController],
  providers: [InventoryContext],
  exports: [InventoryContext],
})
export class InventoryModule {}
