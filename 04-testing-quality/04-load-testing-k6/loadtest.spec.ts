import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveK6Binary } from "./test-support/k6";

const k6 = resolveK6Binary();

// Script artifacts are plain JS read/executed from disk — the vitest
// answer-key redirector only rewrites imports, so select the folder by mode.
const SCRIPTS_DIR =
  process.env.SOLUTION_MODE === "1"
    ? resolve(__dirname, "solution")
    : resolve(__dirname, "src");

// ── Target app under load (raw node http — zero deps) ────────────────────

function busyWork(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* intentional CPU burn */
  }
}

async function startTarget(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200).end("ok");
      return;
    }
    if (req.url === "/work") {
      busyWork(12);
      res.writeHead(200).end("done");
      return;
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    port,
    close: () =>
      new Promise<void>((resolveClose) => {
        server.closeAllConnections?.();
        server.close(() => resolveClose());
      }),
  };
}

// ── Structure grading (no binary needed) ─────────────────────────────────

describe("k6 scenario structure", () => {
  it("smoke.js declares fixed low volume and reads BASE_URL from env", () => {
    const src = readFileSync(join(SCRIPTS_DIR, "smoke.js"), "utf8");

    expect(src).toMatch(/export\s+const\s+options/);
    expect(src).toMatch(/vus\s*:/);
    expect(src).toMatch(/iterations\s*:/);
    expect(src).toMatch(/__ENV\.BASE_URL/);
    expect(src).toMatch(/http\.get/);
    expect(src).toMatch(/check\s*\(/);
  });

  it("stress.js declares ramp stages, thresholds, and env-driven durations", () => {
    const src = readFileSync(join(SCRIPTS_DIR, "stress.js"), "utf8");

    expect(src).toMatch(/stages\s*:/);
    // three stage objects with duration+target
    const stageMatches = src.match(/\{\s*duration/g) ?? [];
    expect(stageMatches.length).toBeGreaterThanOrEqual(3);
    expect(src).toContain("__ENV.RAMP_UP");
    expect(src).toContain("__ENV.STEADY");
    expect(src).toContain("__ENV.RAMP_DOWN");
    expect(src).toMatch(/thresholds\s*:/);
    expect(src).toMatch(/http_req_duration[\s\S]{0,60}p\(95\)\s*</);
    expect(src).toMatch(/http_req_failed[\s\S]{0,60}rate\s*</);
    expect(src).toMatch(/\/work/);
  });
});

// ── Runtime grading (requires k6 binary) ─────────────────────────────────

describe.skipIf(!k6)("k6 executes against a live server", async () => {
  let target: Awaited<ReturnType<typeof startTarget>>;

  beforeAll(async () => {
    target = await startTarget();
  });

  afterAll(async () => {
    await target.close();
  });

  async function runScript(
    scriptPath: string,
    extraEnv: Record<string, string>,
    timeoutMs = 90_000,
  ): Promise<{ exitCode: number; summary: any }> {
    const dir = mkdtempSync(join(tmpdir(), "k6-run-"));
    const summaryFile = join(dir, "summary.json");

    // ASYNC spawn on purpose: execFileSync would block THIS worker's event
    // loop, starving the in-process target server and deadlocking the run.
    const exitCode = await new Promise<number>((resolveExit) => {
      const child = spawn(
        k6!,
        ["run", "--quiet", "--summary-export", summaryFile, scriptPath],
        {
          env: { ...process.env, BASE_URL: `http://127.0.0.1:${target.port}`, ...extraEnv },
          stdio: "ignore",
        },
      );
      const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
      child.on("close", (code) => {
        clearTimeout(timer);
        resolveExit(code ?? 1);
      });
    });

    try {
      const summary = JSON.parse(readFileSync(summaryFile, "utf8"));
      return { exitCode, summary };
    } catch {
      rmSync(dir, { recursive: true, force: true });
      return { exitCode: exitCode || 1, summary: null };
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("smoke passes all checks over 5 iterations", async () => {
    const { exitCode, summary } = await runScript(join(SCRIPTS_DIR, "smoke.js"), {});
    void exitCode;

    const reqs = Number(summary?.metrics?.http_reqs?.count ?? 0);
    expect(reqs).toBeGreaterThanOrEqual(5);

    const checksRate = Number(summary?.metrics?.checks?.value ?? 0);
    expect(checksRate).toBe(1); // 100% of checks passed
  }, 120_000);

  it("stress stays within its own declared thresholds on a shrunken run", async () => {
    const { exitCode, summary } = await runScript(join(SCRIPTS_DIR, "stress.js"), {
      RAMP_UP: "2s",
      STEADY: "2s",
      RAMP_DOWN: "1s",
      TARGET_VUS: "8",
    });

    // Non-zero exit means a threshold was breached — the whole point of gates.
    expect(exitCode).toBe(0);

    const reqs = Number(summary?.metrics?.http_reqs?.count ?? 0);
    expect(reqs).toBeGreaterThan(20);
  }, 120_000);
});
