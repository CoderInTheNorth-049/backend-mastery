import { paginate } from "../domain/cursor";
import type { ChatMessage, MessagePage, MessageStore } from "../ports/message-store";

/**
 * Default store: zero dependencies, dies with the process. Sorted on write
 * so page() can hand the whole room list to the domain paginator; fine for
 * dev/demo, O(n log n) per append is exactly why the pg adapter exists.
 */
export class InMemoryMessageStore implements MessageStore {
  private readonly byRoom = new Map<string, ChatMessage[]>();

  async append(message: ChatMessage): Promise<ChatMessage> {
    const list = this.byRoom.get(message.roomId) ?? [];
    list.push(message);
    list.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
    this.byRoom.set(message.roomId, list);
    return message;
  }

  async page(roomId: string, limit: number, cursor?: string | null): Promise<MessagePage> {
    const messages = this.byRoom.get(roomId) ?? [];
    const result = paginate(messages, { limit, cursor });
    return { messages: result.page, nextCursor: result.nextCursor };
  }
}
