import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import Redis from "ioredis";
import pino from "pino";
import type { Logger } from "pino";
import { Pool } from "pg";
import { AppModule } from "./app.module";
import type { AppDependencies } from "./app.module";
import { createCodeFactory } from "./domain/base62";
import { flushClicks } from "./domain/click-worker";
import type {
  CacheStore,
  ClickDrain,
  ClickQueue,
  ClickStore,
  Clock,
  LinkStore,
} from "./domain/ports";
import { BullmqClickQueue } from "./infra/bullmq/bullmq-click.queue.int";
import { MemCacheAdapter } from "./infra/memory/mem-cache.adapter";
import { MemClickQueue } from "./infra/memory/mem-click.queue";
import { MemClickStore } from "./infra/memory/mem-click.store";
import { MemLinkStore } from "./infra/memory/mem-link.store";
import { PgClickStore } from "./infra/pg/pg-click.store.int";
import { PgLinkStore } from "./infra/pg/pg-link.store.int";
import { RedisCacheAdapter } from "./infra/redis/redis-cache.adapter.int";
import { SYSTEM_CLOCK } from "./lib/clock";
import { httpMetricsMiddleware } from "./lib/http-metrics";
import { AppMetrics } from "./lib/metrics";
import { PinoLoggerService } from "./lib/pino-logger.service";
import { requestIdMiddleware } from "./lib/request-id";

export interface AdapterOverrides {
  clock?: Clock;
  linkStore?: LinkStore;
  clickStore?: ClickStore;
  cache?: CacheStore;
  /** Memory-mode producer; overrides win over env-selected adapters. */
  queue?: ClickQueue & ClickDrain & { pendingCount(): number };
}

export interface AppOptions extends AdapterOverrides {
  port?: number;
  logLevel?: string;
  /**
   * Background click-flush cadence in memory mode. `null` disables it (tests
   * pump via flush()); undefined falls back to 250ms.
   */
  autoFlushMs?: number | null;
}

const DEFAULT_AUTO_FLUSH_MS = 250;
const DEFAULT_PORT = 3001;

export interface BuiltApp {
  port: number;
  nest: INestApplication;
  logger: Logger;
  metrics: AppMetrics;
  clock: Clock;
  linkStore: LinkStore;
  clickStore: ClickStore;
  cache: CacheStore;
  queue: ClickQueue;
  /** Live backlog size, whatever the transport. */
  pendingCount(): Promise<number>;
  /** Drains buffered clicks into the store (dedupe included). Returns count. */
  flush(): Promise<number>;
  stop(): Promise<void>;
}

// Single composition root for main.ts AND the test suite - tests boot exactly
// what production boots, minus the socket. Adapters are chosen here:
//   DATABASE_URL set -> pg stores                  (else memory)
//   REDIS_URL set    -> redis cache + BullMQ queue (else memory)
// so CI runs green with zero external services while the production adapters
// stay one env var away.
export async function buildApp(options: AppOptions = {}): Promise<BuiltApp> {
  const port = options.port ?? Number(process.env.PORT ?? DEFAULT_PORT);
  const logger = pino({ level: options.logLevel ?? process.env.LOG_LEVEL ?? "info" });
  const clock = options.clock ?? SYSTEM_CLOCK;
  const metrics = new AppMetrics();
  const codeFactory = createCodeFactory();

  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  const closables: Array<() => Promise<void>> = [];

  let linkStore: LinkStore;
  let clickStore: ClickStore;
  if (databaseUrl !== undefined) {
    const pool = new Pool({ connectionString: databaseUrl });
    closables.push(() => pool.end());
    linkStore = new PgLinkStore(pool);
    clickStore = new PgClickStore(pool);
  } else {
    linkStore = options.linkStore ?? new MemLinkStore();
    clickStore = options.clickStore ?? new MemClickStore(clock);
  }

  // One ioredis client feeds cache AND queue; BullMQ duplicates internally
  // wherever a dedicated blocking connection is required.
  let redisClient: Redis | undefined;
  if (redisUrl !== undefined && options.cache === undefined) {
    // maxRetriesPerRequest:null is mandatory for BullMQ blocking connections.
    const client = new Redis(redisUrl, { maxRetriesPerRequest: null });
    redisClient = client;
    closables.push(async (): Promise<void> => {
      await client.quit();
    });
  }

  const cache =
    options.cache ?? (redisClient !== undefined ? new RedisCacheAdapter(redisClient) : new MemCacheAdapter(clock));

  const memQueue = new MemClickQueue();
  let queue: ClickQueue = options.queue ?? memQueue;
  let drain: ClickDrain | undefined = options.queue ?? memQueue;
  let pendingCount: () => Promise<number>;

  if (redisClient !== undefined) {
    const bullmq = new BullmqClickQueue(redisClient, (events) => clickStore.bulkInsert(events));
    bullmq.startWorker(redisClient);
    closables.push(() => bullmq.close());
    queue = bullmq;
    drain = undefined;
    pendingCount = (): Promise<number> => bullmq.waitingCount();
  } else {
    const local = queue as ClickQueue & { pendingCount(): number };
    pendingCount = (): Promise<number> => Promise.resolve(local.pendingCount());
  }

  const flush = async (): Promise<number> => {
    // Real-adapters mode: the BullMQ worker owns consumption; there is no
    // local buffer to drain.
    if (drain === undefined) return 0;
    const { inserted } = await flushClicks(drain, clickStore);
    metrics.setQueueDepth(await pendingCount());
    return inserted;
  };

  let flushTimer: NodeJS.Timeout | undefined;
  const autoFlushMs = resolveAutoFlushMs(options.autoFlushMs);
  if (autoFlushMs !== null && drain !== undefined) {
    flushTimer = setInterval(
      () => void flush().catch((err: unknown) => logger.error({ err }, "click flush failed")),
      autoFlushMs,
    );
    flushTimer.unref();
  }

  const dependencies: AppDependencies = {
    logger,
    clock,
    links: linkStore,
    clicks: clickStore,
    cache,
    queue,
    queueDepth: pendingCount,
    metrics,
    codeFactory,
  };

  const nest = await NestFactory.create(AppModule.forRoot(dependencies), { logger: false });
  nest.use(requestIdMiddleware);
  nest.use(httpMetricsMiddleware(metrics));
  nest.useLogger(new PinoLoggerService(logger));

  const openapi = new DocumentBuilder()
    .setTitle("URL shortener - capstone 1")
    .setDescription("Reference solution: queue-buffered analytics, cache-aside redirects.")
    .setVersion("0.1.0")
    .build();
  SwaggerModule.setup("docs", nest, SwaggerModule.createDocument(nest, openapi));

  await nest.init();

  const stop = async (): Promise<void> => {
    if (flushTimer !== undefined) clearInterval(flushTimer);
    // Graceful shutdown: persist whatever clicks are still buffered before
    // closing adapters (main.ts wires SIGTERM/SIGINT here).
    await flush().catch(() => undefined);
    for (const close of closables.reverse()) await close();
    await nest.close();
  };

  return {
    port,
    nest,
    logger,
    metrics,
    clock,
    linkStore,
    clickStore,
    cache,
    queue,
    pendingCount,
    flush,
    stop,
  };
}

function resolveAutoFlushMs(raw: number | null | undefined): number | null {
  if (raw === null) return null;
  if (raw === undefined) return DEFAULT_AUTO_FLUSH_MS;
  return raw;
}
