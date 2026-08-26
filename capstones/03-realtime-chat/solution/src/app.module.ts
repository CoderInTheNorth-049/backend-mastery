import { Module, type DynamicModule, type Provider } from "@nestjs/common";
import { Pool } from "pg";
import { TokenService } from "./auth/token.service";
import { AuthController } from "./auth/auth.controller";
import { InMemoryMessageStore } from "./adapters/in-memory-message-store";
import { PgMessageStore } from "./adapters/pg-message-store";
import { ChatGateway } from "./chat/chat.gateway";
import { PresenceService } from "./chat/presence.service";
import { RateLimiterService } from "./chat/rate-limiter.service";
import { APP_OPTIONS, ConfigService, type AppOptions } from "./config/config.service";
import { HealthController } from "./http/health.controller";
import { HistoryController } from "./history/history.controller";
import { MESSAGE_STORE, type MessageStore } from "./ports/message-store";

@Module({})
export class AppModule {
  static register(options: AppOptions = {}): DynamicModule {
    // The env switch: DATABASE_URL present -> real pg adapter, absent ->
    // in-memory. Everything downstream depends only on the port token.
    const messageStoreProvider: Provider = {
      provide: MESSAGE_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MessageStore =>
        config.databaseUrl
          ? new PgMessageStore(new Pool({ connectionString: config.databaseUrl }))
          : new InMemoryMessageStore(),
    };

    return {
      module: AppModule,
      controllers: [AuthController, HistoryController, HealthController],
      providers: [
        { provide: APP_OPTIONS, useValue: options },
        ConfigService,
        TokenService,
        PresenceService,
        RateLimiterService,
        messageStoreProvider,
        ChatGateway,
      ],
    };
  }
}
