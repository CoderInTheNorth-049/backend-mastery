export type AccessDecision = "allow" | "deny";

/**
 * A03 defense: parameterized search.
 * SQL text contains a $1 PLACEHOLDER; the user's input travels in values[0]
 * wrapped as a LIKE pattern ("%q%").
 */
export function parameterizedSearch(q: string): { text: string; values: unknown[] } {
  return {
    text: `SELECT * FROM users WHERE name LIKE $1`,
    values: [`%${q}%`],
  };
}

/**
 * A01 defense: deny-by-default object authorization.
 */
export function ownsOrDeny(
  requesterId: number | null | undefined,
  resourceOwnerId: number,
): AccessDecision {
  if (requesterId === null || requesterId === undefined) return "deny";
  return requesterId === resourceOwnerId ? "allow" : "deny";
}

const HTML_ESCAPES: Array<[string, string]> = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
];

/** Ampersand FIRST so later escapes aren't double-encoded. */
export function escapeHtml(input: string): string {
  let out = input;
  for (const [char, entity] of HTML_ESCAPES) {
    out = out.split(char).join(entity);
  }
  return out;
}

/** Safe render: user content passes through escapeHtml before interpolation. */
export function renderNoteSafe(userInput: string): string {
  return `<div class="note">${escapeHtml(userInput)}</div>`;
}
