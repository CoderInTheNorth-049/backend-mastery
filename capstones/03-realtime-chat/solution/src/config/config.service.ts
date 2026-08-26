import { Inject } from "@nestjs/common";

export interface AppOptions {
  /**
   * Tests drive presence expiry manually and an unref'd interval would be
   * one more async handle racing teardown, so they opt out explicitly.
   */
  sweeper?: boolean;
}

export const APP_OPTIONS = Symbol("APP_OPTIONS");

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class ConfigService {
  readonly port = intFromEnv("PORT", 3003);
  readonly tokenSecret = process.env.TOKEN_SECRET ?? "dev-secret";
  readonly databaseUrl = process.env.DATABASE_URL || undefined;
  readonly sweepIntervalMs = intFromEnv("SWEEP_INTERVAL_MS", 15_000);
  readonly sweeperEnabled: boolean;

  constructor(@Inject(APP_OPTIONS) options: AppOptions = {}) {
    this.sweeperEnabled = options.sweeper ?? true;
  }

  get storeKind(): "postgres" | "memory" {
    return this.databaseUrl ? "postgres" : "memory";
  }
}
