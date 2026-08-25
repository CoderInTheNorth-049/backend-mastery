import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveTerraform } from "../test-support/terraform";

const tf = resolveTerraform();

// HCL is a file artifact: select directory by mode (k6 pattern).
const DIR =
  process.env.SOLUTION_MODE === "1"
    ? join(__dirname, "solution")
    : join(__dirname, "submission");

const src = readFileSync(join(DIR, "main.tf"), "utf8");

describe("main.tf — textual contracts", () => {
  it("T1/T2: pins terraform version and the aws provider", () => {
    expect(src).toMatch(/required_version\s*=\s*["']>?=\s*1\./);
    expect(src).toMatch(/required_providers/);
    expect(src).toMatch(/source\s*=\s*"hashicorp\/aws"/);
    expect(src).toMatch(/version\s*=\s*"~>\s*\d/);
  });

  it("T3: provider block wires region to a variable", () => {
    expect(src).toMatch(/provider\s+"aws"[\s\S]{0,120}region\s*=\s*var\.aws_region/);
  });

  it("T4: aws_region variable documented with default us-east-1", () => {
    const block = extractVariable("aws_region");
    expect(block).toBeTruthy();
    expect(block).toMatch(/description\s*=/);
    expect(block).toMatch(/default\s*=\s*"us-east-1"/);
  });

  it("T5: bucket_name variable documented + validated for length", () => {
    const block = extractVariable("bucket_name");
    expect(block).toMatch(/description\s*=/);
    expect(block).toMatch(/validation\s*{/);
    expect(block).toMatch(/length\(var\.bucket_name\)\s*>=\s*3/);
  });

  it("T6: s3 bucket resource interpolates the variable", () => {
    expect(src).toMatch(/resource\s+"aws_s3_bucket"\s+"app"/);
    expect(src).toMatch(/bucket\s*=\s*var\.bucket_name/);
  });

  it("T7: tags include Environment and ManagedBy=terraform", () => {
    const tagsBlock = /tags\s*=\s*{[\s\S]*?}/.exec(src)?.[0] ?? tagsNoEq(src);

    function tagsNoEq(source: string): string {
      return /tags\s*{[\s\S]*?}/.exec(source)?.[0] ?? "";
    }
    expect(tagsBlock).toContain("Environment");
    expect(tagsBlock.replace(/\s+/g, " ")).toMatch(/ManagedBy\s*=\s*"terraform"/);
  });

  it("T8: outputs the created bucket name with a description", () => {
    const out = /output\s+"bucket_name"[\s\S]{0,200}?}/.exec(src)?.[0] ?? "";
    expect(out).toContain("aws_s3_bucket.app.id");
    expect(out).toMatch(/description\s*=/);
  });

  function extractVariable(name: string): string | undefined {
    const re = new RegExp(`variable\\s+"${name}"\\s*{[\\\\s\\\\S]*?^}`);
    return multilineExtract(`variable "${name}"`);
  }

  function multilineExtract(anchor: string): string | undefined {
    const idx = src.indexOf(anchor);
    if (idx === -1) return undefined;
    // capture until balanced closing brace
    let depth = 0;
    let end = idx;
    for (; end < src.length; end++) {
      if (src[end] === "{") depth++;
      if (src[end] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    return src.slice(idx, end + 1);
  }
});

describe.skipIf(!tf)("HCL parses — real terraform fmt -check", () => {
  function fmtCheck(file: string): { ok: boolean; diff: string } {
    const work = mkdtempSync(join(tmpdir(), "tf-fmt-"));
    const target = join(work, "main.tf");
    writeFileSync(target, file);

    try {
      execFileSync(tf!, ["fmt", "-check", "-diff", target], { stdio: "pipe" });
      return { ok: true, diff: "" };
    } catch (error) {
      const err = error as { stderr?: Buffer; stdout?: Buffer; status?: number };
      const diff =
        err.stdout?.toString() ?? err.stderr?.toString() ?? `exit ${err.status}`;
      return { ok: false, diff };
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }

  it("terraform fmt -check exits clean on your file (canonical formatting = parseable)", () => {
    const result = fmtCheck(src);
    if (!result.ok) {
      console.error("\nterraform fmt diff:\n" + result.diff.slice(0, 2000));
    }
    expect(result.ok).toBe(true);
  });

  it("sanity: fmt -check actually REJECTS broken HCL (guard against vacuous pass)", () => {
    const result = (() => {
      const work = mkdtempSync(join(tmpdir(), "tf-bad-"));
      const bad = join(work, "broken.tf");
      writeFileSync(bad, 'resource "aws_s3_bucket" "app" {\n  bucket = var.bucket_name\n'); // missing }
      try {
        execFileSync(tf!, ["fmt", "-check", bad], { stdio: "pipe" });
        return false;
      } catch {
        return true;
      } finally {
        rmSync(work, { recursive: true, force: true });
      }
    })();
    expect(result).toBe(true);
  });
});
