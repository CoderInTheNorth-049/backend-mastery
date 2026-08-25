import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { load as loadYaml } from "js-yaml";

const submissionPath = join(__dirname, "submission", "lint-and-test.yml");
const solutionPath = join(__dirname, "solution", "lint-and-test.yml");

const fileToRead = existsSync(submissionPath) ? submissionPath : solutionPath;
const MODE_NOTE =
  process.env.SOLUTION_MODE === "1" || !existsSync(submissionPath)
    ? "(solution mode)"
    : "(your submission)";

describe(`CI workflow structure ${MODE_NOTE}`, () => {
  const raw = readFileSync(fileToRead, "utf8");
  const doc = loadYaml(raw) as Record<string, any>;

  it("is valid YAML with a top-level mapping", () => {
    expect(doc).toBeTypeOf("object");
    expect(doc).not.toBeNull();
  });

  it("declares triggers: pull_request AND push to main", () => {
    // js-yaml may parse bare `on` as boolean true (YAML 1.1 legacy).
    const triggers =
      (doc[true as unknown as string] as any) ?? (doc.on as any) ?? {};
    expect(triggers).toBeTypeOf("object");

    const hasPull = Boolean(triggers.pull_request ?? triggers["pull_request"]);
    const push = triggers.push ?? triggers["push"];
    expect(hasPull).toBe(true);
    expect(push).toBeTruthy();
    expect(JSON.stringify(push)).toContain("main");
  });

  it("defines a lint job that checks out and runs pnpm lint", () => {
    const lint = doc.jobs?.lint;
    expect(lint, "missing jobs.lint").toBeTruthy();
    expect(String(lint["runs-on"])).toContain("ubuntu-latest");

    const stepsText = JSON.stringify(lint.steps ?? []);
    expect(stepsText).toContain("actions/checkout@v4");
    expect(lint.steps.some((s: any) => typeof s.run === "string" && s.run.includes("pnpm lint"))).toBe(true);
  });

  it("defines a test job with a Node 20/22 matrix", () => {
    const test = doc.jobs?.test;
    expect(test, "missing jobs.test").toBeTruthy();

    const matrix = test.strategy?.matrix?.node;
    const versions = JSON.stringify(matrix);
    expect(versions).toContain("20");
    expect(versions).toContain("22");
  });

  it("test job checks out, caches pnpm, installs frozen, typechecks, tests with coverage", () => {
    const steps = doc.jobs?.test?.steps ?? [];
    const text = JSON.stringify(steps);

    expect(text).toContain("actions/checkout@v4");
    expect(text).toContain("pnpm/action-setup@v4");
    expect(text).toContain("actions/setup-node@v4");
    const cachesPnpm = steps.some(
      (s: any) => (s.with?.["cache"] ?? s["with"]?.cache) === "pnpm",
    );
    expect(cachesPnpm).toBe(true);

    const matrixRef = steps.some((s: any) =>
      JSON.stringify(s).includes("matrix.node"),
    );
    expect(matrixRef).toBe(true); // setup-node must consume the matrix version

    const runSteps = steps.filter((s: any) => typeof s.run === "string").map((s: any) => s.run);
    expect(runSteps.some((r: string) => r.includes("--frozen-lockfile"))).toBe(true);
    expect(runSteps.some((r: string) => r.includes("pnpm typecheck"))).toBe(true);
    expect(runSteps.some((r: string) => /vitest|pnpm coverage|pnpm test/.test(r))).toBe(true);
  });

  it("uploads the coverage directory as an artifact", () => {
    const steps = doc.jobs?.test?.steps ?? [];
    const upload = steps.find((s: any) => JSON.stringify(s).includes("actions/upload-artifact@v4"));

    expect(upload, "missing actions/upload-artifact@v4 step").toBeTruthy();
    expect(JSON.stringify(upload)).toMatch(/coverage/i);
    expect(JSON.stringify(upload.with ?? {})).toMatch(/coverage/i);
  });

  it("cancels superseded runs via concurrency groups", () => {
    const concurrency = doc.concurrency;
    expect(concurrency, "missing top-level concurrency").toBeTruthy();

    const group = typeof concurrency === "object" ? concurrency.group : concurrency;
    expect(String(group)).toContain("github.workflow");
    expect(concurrency["cancel-in-progress"] ?? concurrency.cancel_in_progress).toBe(true);
  });
});
