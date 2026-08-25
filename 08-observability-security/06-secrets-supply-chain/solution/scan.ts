export type SecretKind =
  | "aws-access-key"
  | "github-token"
  | "slack-token"
  | "private-key-header"
  | "generic-api-key";

export interface Finding {
  line: number;
  kind: SecretKind;
  masked: string;
}

interface PatternDef {
  kind: SecretKind;
  regex: RegExp;
}

// Order matters only for readability; each line is checked against all
// families so multi-secret lines surface fully.
const PATTERNS: PatternDef[] = [
  { kind: "aws-access-key", regex: /\b(AKIA[0-9A-Z]{16})\b/ },
  { kind: "github-token", regex: /\b(gh[pousr]_[A-Za-z0-9]{36})\b/ },
  { kind: "slack-token", regex: /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/ },
  {
    kind: "private-key-header",
    // No capture group: we mask the whole header via match[0].
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
];

// Searched anywhere in the added line — covers config-style AND code-style
// assignments (`password = "…"`, `const apiKey = "…"`).
const GENERIC_ASSIGNMENT =
  /\b(api[_-]?key|secret|password|token)\b\s*[=:]\s*["']([^"'\s]{8,})["']/i;

function mask(value: string): string {
  return value.slice(0, 4) + "***";
}

export function scanDiff(diffText: string): Finding[] {
  const findings: Finding[] = [];
  const lines = diffText.split(/\r?\n/);

  lines.forEach((line, index) => {
    // Added lines only; the +++ file header is not an addition.
    if (!line.startsWith("+") || line.startsWith("+++")) return;

    const content = line.slice(1);
    const lineNumber = index + 1;

    let matchedSpecific = false;

    for (const { kind, regex } of PATTERNS) {
      const match = regex.exec(content);
      if (match) {
        matchedSpecific = true;
        findings.push({
          line: lineNumber,
          kind,
          masked: mask(match[1] ?? match[0]), // patterns without groups use whole match
        });
      }
    }

    const generic = GENERIC_ASSIGNMENT.exec(content);
    if (generic && !matchedSpecific) {
      findings.push({
        line: lineNumber,
        kind: "generic-api-key",
        masked: mask(generic[2]),
      });
    }
  });

  return findings;
}
