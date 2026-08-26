import http from "node:http";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "./app.module";
import type { AppOptions } from "./config/config.service";
import { requestIdMiddleware } from "./http/request-id.middleware";
import { ProblemJsonFilter } from "./http/problem-json.filter";
import type { MessageStore } from "./ports/message-store";
import { MESSAGE_STORE } from "./ports/message-store";

export interface BuildOptions extends AppOptions {}

/** What tests and main.ts both get: an initialized app plus its raw server. */
export interface AppHandle {
  app: INestApplication<NestExpressApplication>;
  httpServer: http.Server;
  messageStore: MessageStore;
}

/**
 * Single composition root shared by main.ts and the test suite, so tests
 * exercise exactly what ships. init() (not listen()) lets callers choose
 * their own port — ephemeral in tests, PORT in production.
 */
export async function buildApp(options: BuildOptions = {}): Promise<AppHandle> {
  const app = await NestFactory.create(AppModule.register(options), new ExpressAdapter(), {
    logger: false, // pino owns logging; Nest's bootstrap chatter is noise
  });

  app.use(requestIdMiddleware);
  app.useGlobalFilters(new ProblemJsonFilter());
  app.enableShutdownHooks();

  await app.init();

  return {
    app,
    httpServer: app.getHttpServer() as http.Server,
    messageStore: app.get<MessageStore>(MESSAGE_STORE),
  };
}
