export interface SseEvent {
  event?: string;
  data: string;
  id?: string;
}

/** Serialize ONE event to wire format. */
export function sseFrame(event: SseEvent): string {
  let out = "";
  if (event.id !== undefined) out += `id: ${event.id}\n`;
  if (event.event !== undefined) out += `event: ${event.event}\n`;
  for (const dataLine of event.data.split("\n")) {
    out += `data: ${dataLine}\n`;
  }
  return out + "\n"; // blank line dispatches the event
}

/**
 * Chunk-boundary-safe SSE parser.
 * Buffers until a blank line, then decodes fields:
 *   data lines join with "\n"; ":" comments ignored; CRLF normalized.
 */
export async function* parseSseStream(chunks: AsyncIterable<string>): AsyncGenerator<SseEvent> {
  let buffer = "";

  for await (const chunk of chunks) {
    buffer += chunk.replace(/\r\n/g, "\n");

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const event = decodeFrame(raw);
      if (event) yield event;

      boundary = buffer.indexOf("\n\n");
    }
  }

  // A trailing frame without its terminating blank line still dispatches
  // at end-of-stream — real servers close right after [DONE].
  if (buffer.trim().length > 0) {
    const event = decodeFrame(buffer);
    if (event) yield event;
  }
}

function decodeFrame(raw: string): SseEvent | null {
  const data: string[] = [];
  let event: string | undefined;
  let id: string | undefined;

  for (const line of raw.split("\n")) {
    if (line.startsWith(":")) continue; // comment / keep-alive

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1); // single optional space

    if (field === "data") data.push(value);
    else if (field === "event") event = value;
    else if (field === "id") id = value;
    // retry: intentionally unsupported in this subset
  }

  if (data.length === 0) return null; // comment-only or empty frame
  return { data: data.join("\n"), ...(event !== undefined ? { event } : {}), ...(id !== undefined ? { id } : {}) };
}

interface CompletionChunk {
  choices?: Array<{ delta?: { content?: string } }>;
}

/**
 * OpenAI-style delta extractor: yields content strings and stops after
 * the "[DONE]" sentinel.
 */
export async function* extractDeltas(chunks: AsyncIterable<string>): AsyncGenerator<string> {
  for await (const sse of parseSseStream(chunks)) {
    if (sse.data === "[DONE]") return;

    let parsed: CompletionChunk;
    try {
      parsed = JSON.parse(sse.data) as CompletionChunk;
    } catch {
      continue; // not JSON (keep-alive etc.) — skip silently
    }

    const delta = parsed.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) {
      yield delta;
    }
  }
}
