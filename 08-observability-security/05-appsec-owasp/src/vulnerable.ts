// ── PROVIDED: deliberately vulnerable reference implementations ──────────
// ⚠️  DO NOT FIX THIS FILE. It exists so the spec can prove the attacks
// work — your job is building defenses in src/defenses.ts beside it.

export interface SqlExecutor {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

/** FLAW (A03): user input concatenated straight into SQL text. */
export function searchQueryVulnerable(q: string): { text: string } {
  return {
    text: `SELECT * FROM users WHERE name LIKE '%${q}%'`,
  };
}

/** FLAW (A01): object fetched by id — requester is never consulted. */
export function getProfileInsecure<T>(
  store: Map<number, T>,
  _requesterId: number,
  requestedId: number,
): T | null {
  return store.get(requestedId) ?? null;
}

/** FLAW (A03/XSS): user content interpolated into HTML unescaped. */
export function renderNoteUnsafe(userHtml: string): string {
  return `<div class="note">${userHtml}</div>`;
}
