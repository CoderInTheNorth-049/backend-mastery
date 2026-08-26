import pino from "pino";
import type { LoggerService } from "@nestjs/common";

/**
 * Bridges pino structured logging into Nest's LoggerService so framework
 * logs and app logs share one JSON pipeline.
 */
export class PinoLoggerService implements LoggerService {
  constructor(private readonly pino: pino.Logger) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("info", message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams);
  }

  debug?(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  verbose?(message: unknown, ...optionalParams: unknown[]): void {
    this.write("trace", message, optionalParams);
  }

  private write(level: "trace" | "debug" | "info" | "warn" | "error", message: unknown, params: unknown[]): void {
    if (params.length === 0) {
      this.pino[level](String(message));
      return;
    }
    this.pino[level]({ context: String(params.at(-1)) }, String(message), ...params.slice(0, -1));
  }
}
