import { Writable } from "node:stream";
import pino, { type Logger } from "pino";

export interface LoggerOptions {
  level?: string;
  service?: string;
  redactPaths?: string[];
  base?: Record<string, unknown>;
}

/**
 * Production-shaped logger:
 *  - JSON lines into the provided destination (tests capture; prod pipes)
 *  - path-based redaction BEFORE serialization, censor "[Redacted]"
 *  - base bindings: service name + caller extras on EVERY line
 */
export function createLogger(
  options: LoggerOptions,
  destination?: NodeJS.WritableStream,
): Logger {
  return pino(
    {
      level: options.level ?? "info",
      ...(options.redactPaths && options.redactPaths.length > 0
        ? { redact: { paths: options.redactPaths, censor: "[Redacted]" } }
        : {}),
      base: {
        ...(options.service !== undefined ? { service: options.service } : {}),
        ...options.base,
      },
    },
    destination,
  );
}

/** Bind a request id once; every child line carries it. */
export function withRequest(logger: Logger, requestId: string): Logger {
  return logger.child({ requestId });
}

// Re-export for learners composing pipelines:
export { Writable };
