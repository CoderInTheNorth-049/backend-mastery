import { Body, Controller, Delete, HttpCode, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { BookingService } from "../domain/booking-service";
import { HoldService } from "../domain/hold-service";

@Controller("holds")
export class HoldsController {
  constructor(
    private readonly holds: HoldService,
    private readonly bookings: BookingService,
  ) {}

  @Delete(":id")
  @HttpCode(204)
  async release(@Param("id") id: string): Promise<void> {
    await this.holds.release(id);
  }

  @Post(":id/confirm")
  async confirm(
    @Param("id") id: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BookingDto> {
    const payload = (body ?? {}) as { idempotencyKey?: unknown; card?: { number?: unknown } };
    const result = await this.bookings.confirm(id, payload.idempotencyKey, payload.card?.number);
    if (result.kind === "created") {
      res.status(201);
      res.setHeader("Location", `/bookings/${result.booking.bookingId}`);
    } else {
      // Replay of an already-successful confirm: same booking, but 200 so
      // clients can distinguish "made" from "already made".
      res.status(200);
    }
    return toBookingDto(result.booking);
  }
}

export interface HoldCreatedDto {
  holdId: string;
  showingId: string;
  seatRefs: string[];
  userId: string;
  expiresAt: string;
}

export interface BookingDto {
  bookingId: string;
  holdId: string;
  seatRefs: string[];
  totalCents: number;
  idempotencyKey: string;
  state: "CONFIRMED" | "PAYMENT_FAILED";
}

function toBookingDto(b: { bookingId: string; holdId: string; seatRefs: string[]; totalCents: number; idempotencyKey: string; state: "CONFIRMED" | "PAYMENT_FAILED" }): BookingDto {
  return {
    bookingId: b.bookingId,
    holdId: b.holdId,
    seatRefs: b.seatRefs,
    totalCents: b.totalCents,
    idempotencyKey: b.idempotencyKey,
    state: b.state,
  };
}
