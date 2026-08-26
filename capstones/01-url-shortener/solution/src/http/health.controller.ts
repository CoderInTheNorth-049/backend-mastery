import { Controller, Get, Inject } from "@nestjs/common";
import type { LinkStore } from "../domain/ports";
import { ProblemJsonError, serviceUnavailable } from "../lib/problem-json";
import { LINK_STORE } from "../lib/tokens";

@Controller()
export class HealthController {
  constructor(@Inject(LINK_STORE) private readonly links: LinkStore) {}

  /** Liveness: always 200 while the process can serve at all. */
  @Get("healthz")
  healthz(): { status: string } {
    return { status: "ok" };
  }

  /** Readiness: checks the backing store so LBs stop routing before we break. */
  @Get("readyz")
  async readyz(): Promise<{ status: string }> {
    try {
      const ok = await this.links.ping();
      if (!ok) throw serviceUnavailable("link store is not ready");
    } catch (error) {
      // Re-throw problem errors as-is; wrap raw adapter failures in a 503.
      if (error instanceof ProblemJsonError) throw error;
      throw serviceUnavailable(error instanceof Error ? error.message : "link store ping failed");
    }
    return { status: "ready" };
  }
}
