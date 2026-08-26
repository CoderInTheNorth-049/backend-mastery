import "reflect-metadata";
import { buildApp } from "./app";
import { ConfigService } from "./config/config.service";
import { logger } from "./logger";

async function bootstrap(): Promise<void> {
  const { app, httpServer } = await buildApp();
  const config = app.get(ConfigService);

  await new Promise<void>((resolve) => {
    httpServer.once("listening", resolve);
    httpServer.listen(config.port);
  });
  logger.info({ port: config.port, store: config.storeKind }, "realtime chat hub listening");

  let closing = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, "graceful shutdown started");
    try {
      await app.close(); // stops HTTP + ws listeners, closes pg pool via hooks
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void bootstrap();
