/* eslint-disable require-yield -- stub throws; real implementations yield */
// ── SSE serialization + parsing + completion deltas ──────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export interface SseEvent {
  event?: string; // absent ⇒ "message"
  data: string;
  id?: string;
}

/** Serialize ONE event to wire format (ends with blank line). */
export function sseFrame(event: SseEvent): string {
  throw new Error("TODO: implement sseFrame");
}

/**
 * Parse an async iterable of STRING CHUNKS into clean SSE events.
 * Chunks may split frames anywhere — buffer until the blank-line terminator.
 */
export async function* parseSseStream(chunks: AsyncIterable<string>): AsyncGenerator<SseEvent> {
  throw new Error("TODO: implement parseSseStream");
}

/**
 * Map OpenAI-style completion chunks to content deltas:
 *   {choices:[{delta:{content:"..."}}]} → "..."
 * Stops cleanly at a data payload of "[DONE]".
 */
export async function* extractDeltas(chunks: AsyncIterable<string>): AsyncGenerator<string> {
  throw new Error("TODO: implement extractDeltas");
}
