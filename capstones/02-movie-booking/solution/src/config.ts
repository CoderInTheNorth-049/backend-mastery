export interface AppConfig {
  port: number;
  holdTtlMs: number;
  sweepIntervalMs: number;
  logLevel: string;
  databaseUrl?: string;
}

function intOr(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: intOr(env.PORT, 3002),
    holdTtlMs: intOr(env.HOLD_TTL_MS, 600_000),
    sweepIntervalMs: intOr(env.SWEEP_INTERVAL_MS, 60_000),
    logLevel: env.LOG_LEVEL ?? "info",
    databaseUrl: env.DATABASE_URL,
  };
}
