import "reflect-metadata";
import { buildApp } from "./app";
import { loadConfig } from "./config";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp();
  await app.listen(config.port, "0.0.0.0");
}

bootstrap().catch((err: unknown) => {
  // Logger may not exist yet if wiring itself failed; stderr is the only
  // reliable channel at this point.
  console.error(err);
  process.exitCode = 1;
});
