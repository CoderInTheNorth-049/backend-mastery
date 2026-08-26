import { BadRequestException, Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { MESSAGE_STORE } from "../ports/message-store";
import type { MessagePage, MessageStore } from "../ports/message-store";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

@Controller("rooms")
export class HistoryController {
  constructor(@Inject(MESSAGE_STORE) private readonly store: MessageStore) {}

  /**
   * Reconnect/resume path: clients replay missed messages by walking
   * nextCursor, newest first. Bad limit values are 400s via problem+json;
   * an unreadable cursor just means "start from the top".
   */
  @Get(":roomId/messages")
  history(
    @Param("roomId") roomId: string,
    @Query("limit") rawLimit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<MessagePage> {
    const limit =
      rawLimit === undefined || rawLimit === "" ? DEFAULT_PAGE_SIZE : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new BadRequestException(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
    }
    return this.store.page(roomId, limit, cursor ?? null);
  }
}
