import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { HoldService } from "../domain/hold-service";
import { NotFoundError } from "../domain/errors";
import type { BookingStore, SeatStatus } from "../domain/types";
import type { HoldCreatedDto } from "./holds.controller";
import { TOKENS } from "./tokens";

@Controller("showings")
export class ShowingsController {
  constructor(
    @Inject(TOKENS.BookingStore) private readonly store: BookingStore,
    private readonly holds: HoldService,
  ) {}

  @Get(":id/seats")
  async seats(@Param("id") id: string) {
    const rows = await this.store.tx(async (txv) => {
      const showing = await txv.getShowing(id);
      if (!showing) {
        throw new NotFoundError("SHOWING_NOT_FOUND", `No showing with id ${id}.`);
      }
      // Read path needs no lock; the adapter's lazy-expiry semantics keep the
      // map honest even before a sweep runs.
      const states = await txv.seatStates(id);
      return showing.seatRefs.map((ref) => ({ seatRef: ref, status: states.get(ref) ?? "available" }));
    });
    return rows satisfies SeatRow[];
  }

  @Post(":id/holds")
  @HttpCode(201)
  async hold(@Param("id") id: string, @Body() body: unknown): Promise<HoldCreatedDto> {
    const payload = (body ?? {}) as { userId?: unknown; seatRefs?: unknown };
    const hold = await this.holds.create(id, payload.seatRefs, payload.userId);
    return {
      holdId: hold.holdId,
      showingId: hold.showingId,
      seatRefs: hold.seatRefs,
      userId: hold.userId,
      expiresAt: hold.expiresAt.toISOString(),
    };
  }
}

export interface SeatRow {
  seatRef: string;
  status: SeatStatus;
}
