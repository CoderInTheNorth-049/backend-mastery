export interface Cursor {
  ts: string;
  id: string;
}

/** Minimal shape any paginated row must expose. */
export interface KeyedLike {
  id: string;
  ts: string;
}

export interface PageInput {
  limit: number;
  cursor?: string | null;
}

export interface PageResult<K extends KeyedLike> {
  page: K[];
  nextCursor: string | null;
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { ts?: unknown }).ts === "string" &&
      typeof (parsed as { id?: unknown }).id === "string"
    ) {
      return { ts: (parsed as { ts: string }).ts, id: (parsed as { id: string }).id };
    }
    return null;
  } catch {
    // Unparseable cursors are client noise, not server errors: paginate empty.
    return null;
  }
}

const epochMs = (ts: string): number => {
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? 0 : ms;
};

// One total order over messages: ts numerically, id lexicographically on
// ties, descending throughout. Without the id tie-break two messages written
// in the same millisecond can appear on two pages or none.
export function compareKeyDesc(a: KeyedLike, b: KeyedLike): number {
  const delta = epochMs(b.ts) - epochMs(a.ts);
  if (delta !== 0) return delta;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

/**
 * Keyset pagination over an in-memory list (any order; sorted defensively).
 * The cursor positions by VALUE, not by reference, so pagination survives
 * the cursor row being deleted between requests.
 */
export function paginate<K extends KeyedLike>(messages: readonly K[], input: PageInput): PageResult<K> {
  if (!Number.isInteger(input.limit) || input.limit < 1) {
    return { page: [], nextCursor: null };
  }
  const sorted = [...messages].sort(compareKeyDesc);

  let start = 0;
  const cursor = decodeCursor(input.cursor);
  if (cursor) {
    // "> 0": strictly AFTER the cursor in desc order == strictly older.
    // "< 0" here would rewind to the newest row and replay the same page.
    start = sorted.findIndex((m) => compareKeyDesc(m, cursor) > 0);
    if (start === -1) return { page: [], nextCursor: null };
  }

  const page = sorted.slice(start, start + input.limit);
  const hasMore = start + input.limit < sorted.length;
  const last = page[page.length - 1];
  return {
    page,
    nextCursor: hasMore && last ? encodeCursor({ ts: last.ts, id: last.id }) : null,
  };
}
