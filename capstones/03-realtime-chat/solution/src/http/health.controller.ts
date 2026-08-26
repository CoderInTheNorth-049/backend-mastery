import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "../config/config.service";

@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get("healthz")
  liveness(): { status: string } {
    return { status: "ok" };
  }

  @Get("readyz")
  readiness(): { status: string; store: string } {
    // Liveness says "process alive"; readiness adds which backing store is
    // wired so orchestrators can gate traffic until the pg pool is in play.
    return { status: "ready", store: this.config.storeKind };
  }
}
