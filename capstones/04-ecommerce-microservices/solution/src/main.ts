import "reflect-metadata";
import { buildApp } from "./app";

async function main(): Promise<void> {
  const app = await buildApp();
  await app.nest.listen(app.port);
  app.logger.info({ port: app.port }, "capstone-4 solution listening");

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
