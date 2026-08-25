// ── Mermaid flowchart validator (subset) ─────────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export interface ValidationIssue {
  line: number; // 1-based; 0 = file-level problem
  message: string;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationIssue[] };

export function validateMermaid(source: string): ValidationResult {
  throw new Error("TODO: implement validateMermaid");
}
