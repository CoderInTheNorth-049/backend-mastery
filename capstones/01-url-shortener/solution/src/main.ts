import "reflect-metadata";
import { buildApp } from "./app";

async function main(): Promise<void> {
  const app = await buildApp();
  await app.nest.listen(app.port);
  app.logger.info({ port: app.port }, "capstone-1 solution listening");

  // Graceful shutdown: stop taking traffic, flush buffered clicks, close
  // adapters. (Nest's enableShutdownHooks would double-handle signals with
  // these explicit handlers, so the wiring stays here.)
  const shutdown = async (signal: string): Promise<void> => {
    app.logger.info({ signal }, "shutting down");
    await app.stop();
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

void main().catch((error: unknown) => {
  process.stderr.write(`fatal: ${String(error)}\n`);
  process.exit(1);
});
