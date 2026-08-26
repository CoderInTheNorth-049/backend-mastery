import { Inject, Controller, Post } from "@nestjs/common";
import type { OutboxStorePort } from "./lib/outbox";
import type { OutboxRelay } from "./lib/relay";
import { TOKENS } from "./lib/tokens";

@Controller("__admin")
export class AdminController {
  constructor(
    @Inject(TOKENS.Relay) private readonly relay: OutboxRelay,
    @Inject(TOKENS.Outbox) private readonly outbox: OutboxStorePort,
  ) {}

  // Explicit pump for demos and tests: drain the outbox and let every handler
  // chain settle before responding. In production the relay runs on an
  // interval instead and this endpoint would be operator-only.
  @Post("drain")
  async drain(): Promise<{ published: number; pending: number }> {
    const published = await this.relay.tick();
    return { published, pending: this.outbox.pending().length };
  }
}
