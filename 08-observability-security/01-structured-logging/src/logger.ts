// ── Logger factory: redaction, correlation, level policy ─────────────────
// Implement per ../assignment.md. Do NOT rename exports.

import type { Logger } from "pino";

export interface LoggerOptions {
  level?: string;                       // default "info"
  service?: string;                     // bound as `service` on every line
  redactPaths?: string[];               // pino redact paths, censor "[Redacted]"
  base?: Record<string, unknown>;       // extra base bindings (env, version…)
}

export function createLogger(options: LoggerOptions, destination?: NodeJS.WritableStream): Logger {
  throw new Error("TODO: implement createLogger");
}

/** Child logger carrying the requestId on every subsequent line. */
export function withRequest(logger: Logger, requestId: string): Logger {
  throw new Error("TODO: implement withRequest");
}
