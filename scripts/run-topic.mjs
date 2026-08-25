#!/usr/bin/env node
/**
 * Run tests for a single topic folder.
 *
 * Usage:
 *   pnpm test:topic 00-foundations/02-http-protocol
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const topic = process.argv[2];

if (!topic) {
  console.error("Usage: pnpm test:topic <phase>/<topic-folder>");
  console.error('Example: pnpm test:topic 00-foundations/02-http-protocol');
  process.exit(1);
}

if (!existsSync(join(topic, "..")) ) {
  console.error(`Folder not found: ${topic}`);
  process.exit(1);
}

const result = spawnSync("npx", ["vitest", "run", topic], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
