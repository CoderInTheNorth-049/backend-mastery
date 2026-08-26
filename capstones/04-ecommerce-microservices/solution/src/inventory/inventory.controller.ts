import { Controller, Get } from "@nestjs/common";
import { InventoryContext } from "./inventory.context";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryContext) {}

  @Get()
  levels(): { stock: Record<string, number>; heldOrders: string[] } {
    return { stock: this.inventory.snapshot(), heldOrders: this.inventory.holds() };
  }
}
