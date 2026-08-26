export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  text: string;
  /** ISO-8601 UTC instant. */
  ts: string;
}

export interface MessagePage {
  messages: ChatMessage[];
  nextCursor: string | null;
}

/**
 * Persistence port. The realtime layer depends on THIS, never on pg or the
 * array-backed fake — swap via env (DATABASE_URL) without touching the
 * gateway. append() resolving is the durability signal: fan-out happens
 * only after it (the write-behind queue of the build guide would slot in
 * behind this same port).
 */
export const MESSAGE_STORE = Symbol("MESSAGE_STORE");

export interface MessageStore {
  append(message: ChatMessage): Promise<ChatMessage>;
  page(roomId: string, limit: number, cursor?: string | null): Promise<MessagePage>;
}
