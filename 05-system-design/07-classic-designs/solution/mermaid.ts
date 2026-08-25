export interface ValidationIssue {
  line: number;
  message: string;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationIssue[] };

const HEADERS = new Set(["graph TD", "graph LR", "flowchart TD", "flowchart LR"]);
const ID = "[A-Za-z0-9_]+";
const LABELLED = `${ID}(\\[[^\\[\\]]+\\])?`; // node id, optionally with [label]
const ARROWS = ["-->", "-.->", "---"];
const EDGE_RE = new RegExp(
  `^${LABELLED}\\s*(${ARROWS.join("|")})\\s*(?:\\|([^|]*)\\|\\s*)?${LABELLED}$`,
);
const NODE_RE = new RegExp(`^${ID}\\s*\\[([^\\[\\]]+)\\]$`);
const BARE_NODE_RE = new RegExp(`^${ID}$`);

export function validateMermaid(source: string): ValidationResult {
  if (source.trim().length === 0) {
    return { ok: false, errors: [{ line: 0, message: "empty diagram" }] };
  }

  const errors: ValidationIssue[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  let headerSeen = false;

  lines.forEach((rawLine, index) => {
    const lineNo = index + 1;
    const line = rawLine.trim();
    if (line.length === 0) return;

    if (line.startsWith("%%")) return; // comment

    if (HEADERS.has(line)) {
      if (headerSeen) {
        errors.push({ line: lineNo, message: `line ${lineNo}: duplicate diagram header` });
      } else if (index !== lines.findIndex((l) => l.trim().length > 0)) {
        // Header must be the first non-blank line.
        const firstContent = lines.findIndex(
          (l) => l.trim().length > 0 && !l.trim().startsWith("%%"),
        );
        if (index !== firstContent) {
          errors.push({ line: lineNo, message: `line ${lineNo}: header must come first` });
        }
      }
      headerSeen = true;
      return;
    }

    if (!headerSeen) {
      errors.push({ line: lineNo, message: `line ${lineNo}: missing diagram header before content` });
      return;
    }

    if (EDGE_RE.test(line) || NODE_RE.test(line) || BARE_NODE_RE.test(line)) return;

    if (line.includes("[") || line.includes("]")) {
      const opens = (line.match(/\[/g) ?? []).length;
      const closes = (line.match(/\]/g) ?? []).length;
      if (opens !== closes) {
        errors.push({ line: lineNo, message: `line ${lineNo}: unbalanced label brackets` });
        return;
      }
      errors.push({ line: lineNo, message: `line ${lineNo}: malformed node or edge` });
      return;
    }

    errors.push({ line: lineNo, message: `line ${lineNo}: unrecognized statement` });
  });

  if (!headerSeen && errors.length === 0) {
    errors.push({ line: 0, message: "missing diagram header" });
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
