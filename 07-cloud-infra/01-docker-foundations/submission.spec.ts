import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { load as loadYaml } from "js-yaml";

// Submission vs answer-key: file artifacts aren't importable, so pick the
// directory by mode (same pattern as the k6 load-test grader).
const DIR =
  process.env.SOLUTION_MODE === "1"
    ? join(__dirname, "solution")
    : join(__dirname, "submission");

const dockerfilePath = join(DIR, "Dockerfile");
const composePath = join(DIR, "docker-compose.yml");

describe("Dockerfile contract", () => {
  const src = readFileSync(dockerfilePath, "utf8");
  const lines = src.split(/\r?\n/).map((l) => l.trim());

  const fromLines = lines.filter((l) => /^FROM\s/i.test(l));
  const findLine = (re: RegExp) => lines.findIndex((l) => re.test(l));

  it("D1: multi-stage — build stage aliased AS build, alpine final stage", () => {
    expect(fromLines.length).toBeGreaterThanOrEqual(2);
    expect(fromLines.some((l) => /AS\s+build/i.test(l))).toBe(true);
    expect(fromLines.some((l) => /^FROM\s+node:\S*alpine/i.test(l))).toBe(true);
  });

  it("D2: manifests copied before any source copy", () => {
    const manifestIdx = findLine(/^COPY\s+\S*package\.json/i);
    const sourceIdx = findLine(/^COPY\s+\.\s/i);
    expect(manifestIdx).toBeGreaterThanOrEqual(0);
    expect(sourceIdx).toBeGreaterThan(manifestIdx);

    const lockCopied = lines.some((l) =>
      /^(COPY|RUN).*?(pnpm-lock\.yaml|package-lock\.json)/i.test(l),
    );
    expect(lockCopied).toBe(true);
  });

  it("D3: installs dependencies with frozen lockfile", () => {
    expect(lines.some((l) => /(pnpm install --frozen-lockfile|npm ci)/i.test(l))).toBe(true);
  });

  it("D5: final stage drops to a non-root user", () => {
    // last USER directive in the file must be non-root
    const userLines = lines.filter((l) => /^USER\s/i.test(l));
    expect(userLines.length).toBeGreaterThan(0);
    expect(/root/i.test(userLines[userLines.length - 1])).toBe(false);
  });

  it("D6 + D7: exposes 3000 and starts node in exec form", () => {
    expect(lines.some((l) => /^EXPOSE\s+3000$/i.test(l))).toBe(true);
    const cmd = lines.find((l) => /^CMD\s/i.test(l));
    expect(cmd).toBeDefined();
    expect(cmd!.replace(/^CMD\s*/i, "")).toMatch(/^\[/); // JSON-array (exec) form
    expect(cmd).toMatch(/node/i);
  });

  it("D8: never copies .env files", () => {
    expect(lines.some((l) => /^COPY/i.test(l) && /\.env/i.test(l))).toBe(false);
  });
});

describe("docker-compose.yml contract", () => {
  it("is valid YAML with app/postgres/redis services", () => {
    expect(existsSync(composePath)).toBe(true);
    const doc = loadYaml(readFileSync(composePath, "utf8")) as Record<string, any>;
    for (const svc of ["app", "postgres", "redis"]) {
      expect(doc.services?.[svc], `missing service ${svc}`).toBeTruthy();
    }
  });

  it("C2/C3: app maps port 3000 and depends on both backing services", () => {
    const doc = loadYaml(readFileSync(composePath, "utf8")) as Record<string, any>;
    const app = doc.services.app;

    expect(JSON.stringify(app.ports ?? [])).toContain("3000");
    const deps = JSON.stringify(app.depends_on ?? {});
    expect(deps).toContain("postgres");
    expect(deps).toContain("redis");
  });

  it("C4–C6: postgres is versioned alpine, secret interpolated (never literal), volume + healthcheck present", () => {
    const doc = loadYaml(readFileSync(composePath, "utf8")) as Record<string, any>;
    const pg = doc.services.postgres;

    expect(String(pg.image)).toMatch(/postgres:16-alpine/);

    const env = JSON.stringify(pg.environment ?? {});
    expect(env).toMatch(/POSTGRES_PASSWORD/);
    // literal secrets look like: POSTGRES_PASSWORD: hunter2
    const literal = Object.entries(pg.environment ?? {}).some(
      ([k, v]) => k === "POSTGRES_PASSWORD" && !String(v).includes("${"),
    );
    expect(literal).toBe(false);

    expect(JSON.stringify(pg.volumes ?? [])).toMatch(/\/var\/lib\/postgresql\/data/);

    const hc = JSON.stringify(pg.healthcheck ?? {});
    expect(hc).toContain("pg_isready");
  });

  it("C7: redis pinned to redis:7-alpine", () => {
    const doc = loadYaml(readFileSync(composePath, "utf8")) as Record<string, any>;
    expect(String(doc.services.redis.image)).toMatch(/redis:7-alpine/);
  });
});
