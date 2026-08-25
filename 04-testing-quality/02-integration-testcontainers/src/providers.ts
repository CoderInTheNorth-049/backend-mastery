import { startEmbeddedPostgres, hasDocker } from "../../../03-databases/test-support/backend";

/**
 * PROVIDED — database providers for the harness assignment.
 * Read this file: it's phase 03's infrastructure, crystallized into one
 * composable interface. Your job in this topic is the HARNESS that sits
 * on top of any provider, not the binaries themselves.
 */

export interface ProviderRuntime {
  connectionString: string;
  stop(): Promise<void>;
}

export interface DatabaseProvider {
  readonly name: "env" | "docker" | "embedded";
  isAvailable(): Promise<boolean>;
  start(): Promise<ProviderRuntime>;
}

/** Uses TEST_DATABASE_URL if the operator exported one. */
export const envProvider: DatabaseProvider = {
  name: "env",
  async isAvailable() {
    return Boolean(process.env.TEST_DATABASE_URL);
  },
  async start() {
    const connectionString = process.env.TEST_DATABASE_URL ?? "";
    return { connectionString, stop: async () => {} };
  },
};

/** Real throwaway container via Testcontainers (CI + Docker installs). */
export const dockerProvider: DatabaseProvider = {
  name: "docker",
  async isAvailable() {
    return hasDocker();
  },
  async start() {
    const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
    const container = await new PostgreSqlContainer("postgres:16-alpine").start();
    return {
      connectionString: container.getConnectionUri(),
      stop: async () => {
        await container.stop();
      },
    };
  },
};

/** Zero-setup embedded binaries (no Docker, no root required). */
export const embeddedProvider: DatabaseProvider = {
  name: "embedded",
  async isAvailable() {
    return process.platform !== "win32";
  },
  async start() {
    return startEmbeddedPostgres();
  },
};

export const PROVIDER_ORDER: DatabaseProvider[] = [
  envProvider,
  dockerProvider,
  embeddedProvider,
];

/** First available provider wins; throws only when nothing can run. */
export async function selectAvailableProvider(
  order: DatabaseProvider[] = PROVIDER_ORDER,
): Promise<DatabaseProvider> {
  for (const provider of order) {
    if (await provider.isAvailable()) return provider;
  }
  throw new Error(
    `no database provider available (tried: ${order.map((p) => p.name).join(", ")})`,
  );
}
