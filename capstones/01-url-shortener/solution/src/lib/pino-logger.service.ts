import type { LoggerService } from "@nestjs/common";
import type { Logger } from "pino";

function toMessage(message: unknown): string {
  return typeof message === "string" ? message : JSON.stringify(message);
}

/** Bridges pino into Nest's logging so framework logs land in structured JSON too. */
export class PinoLoggerService implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, toMessage(message));
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, toMessage(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, toMessage(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, toMessage(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, toMessage(message));
  }
}
