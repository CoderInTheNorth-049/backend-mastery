import { Controller, Get, Inject, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { RedirectService } from "../domain/redirect.service";
import { REDIRECT_CACHE_CONTROL } from "../domain/cache-keys";
import { gone, notFound } from "../lib/problem-json";

/**
 * The one-segment hot path. Registered LAST so concrete routes
 * (/healthz, /metrics, /links/*) always win over GET /:code.
 */
@Controller(":code")
export class RedirectController {
  constructor(@Inject(RedirectService) private readonly redirects: RedirectService) {}

  @Get()
  async redirect(@Param("code") code: string, @Res() res: Response): Promise<void> {
    const outcome = await this.redirects.resolve(code);
    switch (outcome.kind) {
      case "redirect": {
        res.setHeader("location", outcome.targetUrl);
        res.setHeader("cache-control", REDIRECT_CACHE_CONTROL);
        res.status(302).end();
        return;
      }
      case "not-found":
        throw notFound(outcome.detail);
      case "gone":
        throw gone(outcome.detail);
    }
  }
}
