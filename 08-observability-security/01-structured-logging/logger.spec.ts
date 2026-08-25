import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, withRequest } from "./src/logger";

/** Collects every written line into an array (one JSON string per line). */
function capture(): { stream: Writable; lines: () => string[] } {
  const buffer: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      const text = chunk.toString();
      for (const line of text.split("\n")) {
        if (line.trim().length > 0) buffer.push(line);
      }
      cb();
    },
  });
  return { stream, lines: () => buffer };
}

function parse(lines: string[]): Array<Record<string, any>> {
  return lines.map((l) => JSON.parse(l));
}

describe("createLogger", () => {
  it("emits valid JSON lines with level and message", () => {
    const { stream, lines } = capture();
    const log = createLogger({ level: "info" }, stream);

    log.info("hello structured world");

    const entries = parse(lines());
    expect(entries).toHaveLength(1);
    expect(entries[0].msg).toBe("hello structured world");
    expect(entries[0].level).toBeTypeOf("number"); // pino numeric levels
    expect(entries[0].time).toBeTypeOf("number");
  });

  it("binds service name onto every line via base bindings", () => {
    const { stream, lines } = capture();
    const log = createLogger({ service: "orders-api" }, stream);

    log.info({ event: "order_placed" }, "placed");
    log.warn("careful");

    for (const entry of parse(lines())) {
      expect(entry.service).toBe("orders-api");
    }
  });

  it("merges extra base bindings (env/version)", () => {
    const { stream, lines } = capture();
    const log = createLogger({ base: { env: "test", version: "1.2.3" } }, stream);

    log.error("boom");
    const entry = parse(lines())[0];
    expect(entry.env).toBe("test");
    expect(entry.version).toBe("1.2.3");
  });

  it("redacts configured paths BEFORE serialization", async () => {
    const { stream, lines } = capture();
    const log = createLogger(
      {
        redactPaths: ["password", "req.headers.authorization"],
      },
      stream,
    );

    log.info(
      {
        user: "ada",
        password: "hunter2-super-secret",
        req: { headers: { authorization: "Bearer sk_live_abc" } },
      },
      "login attempt",
    );

    await new Promise((r) => setTimeout(r, 5)); // pino flushes async
    const raw = lines().join("\n");

    expect(raw).not.toContain("hunter2-super-secret");
    expect(raw).not.toContain("sk_live_abc");
    expect(raw).toContain("[Redacted]");

    const entry = parse(lines())[0];
    expect(entry.password).toBe("[Redacted]");
    expect(entry.req.headers.authorization).toBe("[Redacted]");
    expect(entry.user).toBe("ada"); // non-sensitive fields survive
  });

  it("level policy: debug suppressed when level=info", () => {
    const { stream, lines } = capture();
    const log = createLogger({ level: "info" }, stream);

    log.debug("noisy internals");
    log.info("business event");

    const msgs = parse(lines()).map((e) => e.msg);
    expect(msgs).toEqual(["business event"]);
  });

  it("debug visible when level=debug", () => {
    const { stream, lines } = capture();
    const log = createLogger({ level: "debug" }, stream);

    log.debug("now you see me");
    expect(parse(lines())).toHaveLength(1);
  });
});

describe("withRequest — correlation ids", () => {
  it("carries requestId on every child line without mutating the parent", async () => {
    const { stream, lines } = capture();
    const root = createLogger({ service: "api" }, stream);
    const requestLog = withRequest(root, "req-abc-123");

    requestLog.info("handling checkout");
    root.info("unrelated startup line");

    const entries = parse(lines());
    expect(entries[0].requestId).toBe("req-abc-123");
    expect(entries[1].requestId).toBeUndefined();
  });

  it("composes with redaction (correlated AND safe)", async () => {
    const { stream, lines } = capture();
    const root = createLogger(
      { redactPaths: ["cardNumber"] },
      stream,
    );
    const requestLog = withRequest(root, "req-9");

    requestLog.info({ cardNumber: "4242424242424242", amount: 42 }, "charge");

    await new Promise((r) => setTimeout(r, 5));
    const raw = lines().join("\n");
    expect(raw).not.toContain("4242424242424242");
    const entry = parse(lines())[0];
    expect(entry.requestId).toBe("req-9");
    expect(entry.cardNumber).toBe("[Redacted]");
  });
});
