import { describe, expect, it } from "vitest";
import { validateTargetUrl } from "./url-validation";

describe("validateTargetUrl", () => {
  it("accepts http and https URLs", () => {
    expect(validateTargetUrl("https://example.com/a?b=1")).toMatchObject({
      ok: true,
      url: "https://example.com/a?b=1",
    });
    expect(validateTargetUrl("http://example.com")).toMatchObject({ ok: true });
  });

  it("rejects non-http schemes (SSRF control)", () => {
    for (const bad of ["ftp://example.com", "javascript:alert(1)", "file:///etc/passwd"]) {
      const result = validateTargetUrl(bad);
      expect(result).toMatchObject({ ok: false });
      if (!result.ok) expect(result.reason).toMatch(/http or https/);
    }
  });

  it("rejects unparseable or empty input", () => {
    for (const bad of ["", "   ", "not a url", "http://", null, 42]) {
      expect(validateTargetUrl(bad)).toMatchObject({ ok: false });
    }
  });

  it("enforces the max length", () => {
    const long = `https://example.com/${"a".repeat(2100)}`;
    const result = validateTargetUrl(long);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/2048/);
  });
});
