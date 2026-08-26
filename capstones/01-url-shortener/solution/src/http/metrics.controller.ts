import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import type { AppMetrics } from "../lib/metrics";
import { METRICS, QUEUE_DEPTH } from "../lib/tokens";

@Controller()
export class MetricsController {
  constructor(
    @Inject(METRICS) private readonly appMetrics: AppMetrics,
    @Inject(QUEUE_DEPTH) private readonly queueDepth: () => Promise<number>,
  ) {}

  @Get("metrics")
  async metrics(@Res() res: Response): Promise<void> {
    // Sample queue depth BEFORE rendering so dashboards see the live backlog.
    this.appMetrics.setQueueDepth(await this.queueDepth());
    res.setHeader("content-type", this.appMetrics.contentType);
    res.send(await this.appMetrics.render());
  }
}
