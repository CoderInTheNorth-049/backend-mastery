import pino from "pino";

// One pino instance per process; modules derive child loggers with a module
// tag so lines stay greppable.
export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
