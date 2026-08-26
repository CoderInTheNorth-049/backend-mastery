import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import type { BookingStore } from "../domain/types";
import { TOKENS } from "./tokens";

@Controller()
export class HealthController {
  constructor(@Inject(TOKENS.BookingStore) private readonly store: BookingStore) {}

  @Get("healthz")
  healthz() {
    return { status: "ok" };
  }

  @Get("readyz")
  async readyz(@Res({ passthrough: true }) res: Response) {
    const ready = await this.store.isReady();
    if (!ready) {
      res.status(503);
      return { status: "down", store: "unreachable" };
    }
    return { status: "ok", store: storeLabel(this.store) };
  }
}

function storeLabel(store: object): string {
  const name = store.constructor.name;
  return name.startsWith("Memory") ? "memory" : name.startsWith("Pg") ? "postgres" : name;
}
