// ── YOUR defenses — same jobs, no vulnerabilities ────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export type AccessDecision = "allow" | "deny";

/**
 * A03 defense: parameterized search.
 * SQL text contains a $1 PLACEHOLDER; the user's input travels in values[0]
 * wrapped as a LIKE pattern ("%q%").
 */
export function parameterizedSearch(q: string): { text: string; values: unknown[] } {
  throw new Error("TODO: implement parameterizedSearch");
}

/**
 * A01 defense: deny-by-default object authorization.
 * allow ONLY when the requester matches the resource owner; missing
 * requester (null/undefined) is always deny.
 */
export function ownsOrDeny(
  requesterId: number | null | undefined,
  resourceOwnerId: number,
): AccessDecision {
  throw new Error("TODO: implement ownsOrDeny");
}

/**
 * A03/XSS defense: contextual HTML-entity encoding for text content.
 * Must escape ALL five: & < > " ' (ampersand FIRST).
 */
export function escapeHtml(input: string): string {
  throw new Error("TODO: implement escapeHtml");
}

/** Safe render: user content passes through escapeHtml before interpolation. */
export function renderNoteSafe(userInput: string): string {
  throw new Error("TODO: implement renderNoteSafe");
}
