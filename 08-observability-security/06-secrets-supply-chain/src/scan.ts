// ── Mini-gitleaks: scan diffs for added secrets ──────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export type SecretKind =
  | "aws-access-key"
  | "github-token"
  | "slack-token"
  | "private-key-header"
  | "generic-api-key";

export interface Finding {
  line: number;      // 1-based position in the diff text
  kind: SecretKind;
  masked: string;    // first 4 chars of the match + "***"
}

/**
 * Scan a unified-diff TEXT for secrets on ADDED lines.
 *  - only lines starting with "+" (a literal "+++" header does NOT count)
 *  - each pattern family detected independently
 *  - generic api_key/secret/password assignment pattern as catch-all
 *  - findings masked: first 4 chars of the matched secret + "***"
 */
export function scanDiff(diffText: string): Finding[] {
  throw new Error("TODO: implement scanDiff");
}
