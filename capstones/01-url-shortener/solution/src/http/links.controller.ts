import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post } from "@nestjs/common";
import type { ClickStore, LinkStore } from "../domain/ports";
import { LinksService } from "../domain/links.service";
import { validateTargetUrl } from "../domain/url-validation";
import { badRequest, notFound } from "../lib/problem-json";
import { CLICK_STORE, LINK_STORE } from "../lib/tokens";

interface CreateLinkBody {
  url?: unknown;
  expiresAt?: unknown;
}

interface DisableLinkBody {
  disabled?: unknown;
}

@Controller("links")
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    @Inject(LINK_STORE) private readonly links: LinkStore,
    @Inject(CLICK_STORE) private readonly clicks: ClickStore,
  ) {}

  /** M1: create returns the code only - clients never need the row id. */
  @Post()
  async create(@Body() body: CreateLinkBody): Promise<{ code: string; url: string }> {
    const validation = validateTargetUrl(body?.url);
    if (!validation.ok) throw badRequest(validation.reason);

    let expiresAt: number | null = null;
    if (body.expiresAt !== undefined && body.expiresAt !== null) {
      if (typeof body.expiresAt !== "number" || !Number.isFinite(body.expiresAt)) {
        throw badRequest("expiresAt must be epoch milliseconds");
      }
      expiresAt = body.expiresAt;
    }

    return this.linksService.create({ url: validation.url, expiresAt });
  }

  @Get(":code/stats")
  async stats(
    @Param("code") code: string,
  ): Promise<{ code: string; total: number; last24h: number }> {
    // Distinguish unknown codes (404) from known-but-unclicked (zeros).
    const link = await this.links.findByCode(code);
    if (link === null) throw notFound(`no link for code '${code}'`);
    // M3: pre-aggregated counts only - never raw event lists.
    const counts = await this.clicks.aggregateByCode(code);
    return { code, ...counts };
  }

  /** M4 disable flow: commit first, invalidate cache after (see LinksService). */
  @Patch(":code")
  @HttpCode(200)
  async disable(
    @Param("code") code: string,
    @Body() body: DisableLinkBody,
  ): Promise<{ code: string; disabled: boolean }> {
    if (body?.disabled !== true) throw badRequest("only { disabled: true } is supported");
    const disabled = await this.linksService.disable(code);
    if (!disabled) throw notFound(`no link for code '${code}'`);
    return { code, disabled: true };
  }
}
