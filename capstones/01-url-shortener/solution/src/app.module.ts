import { Module } from "@nestjs/common";
import type { DynamicModule, Provider } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import type { Logger } from "pino";
import type { CodeFactory } from "./domain/base62";
import { LinksService } from "./domain/links.service";
import type {
  CacheStore,
  ClickQueue,
  ClickStore,
  Clock,
  LinkStore,
} from "./domain/ports";
import { RedirectService } from "./domain/redirect.service";
import { HealthController } from "./http/health.controller";
import { LinksController } from "./http/links.controller";
import { MetricsController } from "./http/metrics.controller";
import { RedirectController } from "./http/redirect.controller";
import type { AppMetrics } from "./lib/metrics";
import { ProblemJsonFilter } from "./lib/problem-json";
import {
  CACHE_STORE,
  CLICK_QUEUE,
  CLICK_STORE,
  CLOCK,
  LINK_STORE,
  METRICS,
  QUEUE_DEPTH,
} from "./lib/tokens";

export interface AppDependencies {
  logger: Logger;
  clock: Clock;
  links: LinkStore;
  clicks: ClickStore;
  cache: CacheStore;
  queue: ClickQueue;
  queueDepth: () => Promise<number>;
  metrics: AppMetrics;
  codeFactory: CodeFactory;
}

/**
 * All controllers registered here EXCEPT RedirectController - GET /:code is
 * last so concrete single-segment routes (/healthz, /metrics) always win.
 */
@Module({})
export class AppModule {
  static forRoot(deps: AppDependencies): DynamicModule {
    const redirectService: Provider = {
      provide: RedirectService,
      inject: [CLOCK, LINK_STORE, CACHE_STORE, CLICK_QUEUE, METRICS],
      useFactory: (
        clock: Clock,
        links: LinkStore,
        cache: CacheStore,
        queue: ClickQueue,
        metrics: AppMetrics,
      ): RedirectService =>
        new RedirectService({ clock, links, cache, queue, metrics, logger: deps.logger }),
    };
    const linksService: Provider = {
      provide: LinksService,
      inject: [CLOCK, LINK_STORE, CACHE_STORE],
      useFactory: (clock: Clock, links: LinkStore, cache: CacheStore): LinksService =>
        new LinksService({
          clock,
          links,
          cache,
          codeFactory: deps.codeFactory,
          logger: deps.logger,
        }),
    };
    return {
      module: AppModule,
      controllers: [HealthController, MetricsController, LinksController, RedirectController],
      providers: [
        { provide: CLOCK, useValue: deps.clock },
        { provide: LINK_STORE, useValue: deps.links },
        { provide: CLICK_STORE, useValue: deps.clicks },
        { provide: CACHE_STORE, useValue: deps.cache },
        { provide: CLICK_QUEUE, useValue: deps.queue },
        { provide: QUEUE_DEPTH, useValue: deps.queueDepth },
        { provide: METRICS, useValue: deps.metrics },
        redirectService,
        linksService,
        // Global RFC 9457 envelope for every thrown error.
        { provide: APP_FILTER, useValue: new ProblemJsonFilter(deps.logger) },
      ],
    };
  }
}
