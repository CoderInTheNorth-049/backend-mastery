import { describe, expect, it } from "vitest";
import { scanDiff } from "./src/scan";

const DIFF = `diff --git a/config.py b/config.py
index 83db48f..bf269f4 100644
--- a/config.py
+++ b/config.py
@@ -1,8 +1,10 @@
 DEBUG = False
 
-API_KEY = "old-rotated-value-here"
+AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
+GITHUB_TOKEN = "ghp_16C7e42F292c6912E7710c838347Ae178B4a"
+SLACK_BOT = "xoxb-123456789012-ABCDEFabcdef"
 
-DATABASE_URL = "postgres://localhost/dev"
+password = "correct-horse-battery"
+
 # safe lines below
 export const maxRetries = 3;
`;

describe("scanDiff — detection", () => {
  it("finds each secret family with correct kind and line number", () => {
    const findings = scanDiff(DIFF);

    expect(findings).toEqual([
      { line: 9, kind: "aws-access-key", masked: "AKIA***" },
      { line: 10, kind: "github-token", masked: "ghp_***" },
      { line: 11, kind: "slack-token", masked: "xoxb***" },
      { line: 14, kind: "generic-api-key", masked: "corr***" },
    ]);
  });

  it("never reports REMOVED lines or diff headers", () => {
    const findings = scanDiff(DIFF);
    for (const f of findings) {
      const lineText = DIFF.split(/\r?\n/)[f.line - 1];
      expect(lineText.startsWith("+")).toBe(true);
      expect(lineText.startsWith("+++")).toBe(false);
    }
  });

  it("masks findings to first four chars + asterisks", () => {
    const [aws] = scanDiff(DIFF);
    expect(aws.masked).toBe("AKIA***");
    expect(aws.masked).not.toContain("IOSFODNN");
  });

  it("detects private key headers", () => {
    const pem = [
      "+-----BEGIN RSA PRIVATE KEY-----",
      "+MIIEowIBAAKCAQEA",
      "+-----END RSA PRIVATE KEY-----",
    ].join("\n");

    const findings = scanDiff(pem);
    expect(findings).toEqual([
      { line: 1, kind: "private-key-header", masked: "----***" },
    ]);
  });

  it("returns empty array for clean diffs", () => {
    const clean = `diff --git a/app.ts b/app.ts
+++ b/app.ts
+export function add(a: number, b: number) {
+  return a + b;
+}`;
    expect(scanDiff(clean)).toEqual([]);
  });

  it("handles CRLF diffs without phantom line numbers", () => {
    const crlf = "+const apiKey = 'super-secret-value';\r\n+const ok = true;\r\n";
    const findings = scanDiff(crlf);
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(1);
    expect(findings[0].masked).toBe("supe***");
  });
});
