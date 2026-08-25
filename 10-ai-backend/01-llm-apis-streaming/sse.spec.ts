import { describe, expect, it } from "vitest";
import {
  extractDeltas,
  parseSseStream,
  sseFrame,
  type SseEvent,
} from "./src/sse";

async function* chunksOf(...parts: string[]): AsyncIterable<string> {
  for (const p of parts) yield p;
}

async function collect(gen: AsyncIterable<unknown>): Promise<unknown[]> {
  const out: unknown[] = [];
  for await (const item of gen) out.push(item);
  return out;
}

describe("sseFrame (server side)", () => {
  it("serializes data + blank-line terminator", () => {
    expect(sseFrame({ data: "hello" })).toBe("data: hello\n\n");
  });

  it("includes event name and id when present", () => {
    expect(sseFrame({ event: "token", id: "42", data: "x" })).toBe(
      "id: 42\nevent: token\ndata: x\n\n",
    );
  });

  it("splits multi-line data into multiple data fields", () => {
    expect(sseFrame({ data: "line1\nline2" })).toBe("data: line1\ndata: line2\n\n");
  });
});

describe("parseSseStream", () => {
  it("parses a well-formed single-frame stream", async () => {
    const events = await collect(parseSseStream(chunksOf("event: token\ndata: abc\n\n")));
    expect(events).toEqual([{ event: "token", data: "abc" }]);
  });

  it("reassembles frames split across chunks ANYWHERE (the boundary bug)", async () => {
    const events = await collect(
      parseSseStream(chunksOf("event: to", "ken\nda", "ta: hel", "lo\n", "\n")),
    );
    expect(events).toEqual([{ event: "token", data: "hello" }]);
  });

  it("joins multiple data lines with newline", async () => {
    const events = await collect(parseSseStream(chunksOf("data: a\ndata: b\n\n")));
    expect(events).toEqual([{ data: "a\nb" }]);
  });

  it("ignores comment/keep-alive frames entirely", async () => {
    const events = await collect(
      parseSseStream(chunksOf(": keep-alive\n\n", "data: real\n\n")),
    );
    expect(events).toEqual([{ data: "real" }]);
  });

  it("normalizes CRLF and tolerates the optional space after colon", async () => {
    const events = await collect(parseSseStream(chunksOf("data:with-nospace\r\n\r\ndata: spaced\n\r\n")));
    expect(events.map((e) => (e as SseEvent).data)).toEqual(["with-nospace", "spaced"]);
  });

  it("dispatches a final unterminated frame at end-of-stream", async () => {
    const events = await collect(parseSseStream(chunksOf("data: last", "")));
    expect(events).toEqual([{ data: "last" }]);
  });
});

describe("extractDeltas — OpenAI-style completion chunks", () => {
  const frame = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

  it("yields delta contents in order", async () => {
    const deltas = await collect(
      extractDeltas(
        chunksOf(
          frame({ choices: [{ delta: { content: "Hel" } }] }),
          frame({ choices: [{ delta: { content: "lo" } }] }),
          frame({ choices: [{ delta: {} }] }), // role-only chunk → no output
          "data: [DONE]\n\n",
        ),
      ),
    );
    expect(deltas).toEqual(["Hel", "lo"]);
  });

  it("stops at [DONE] even with trailing frames", async () => {
    const deltas = await collect(
      extractDeltas(
        chunksOf(
          frame({ choices: [{ delta: { content: "one" } }] }),
          "data: [DONE]\n\n",
          frame({ choices: [{ delta: { content: "never" } }] }),
        ),
      ),
    );
    expect(deltas).toEqual(["one"]);
  });

  it("survives non-JSON keep-alive payloads between chunks", async () => {
    const deltas = await collect(
      extractDeltas(chunksOf(": ping\n\n", frame({ choices: [{ delta: { content: "ok" } }] }))),
    );
    expect(deltas).toEqual(["ok"]);
  });

  it("round-trips: serializer output parses back through extractDeltas", async () => {
    const wire = [
      sseFrame({ data: JSON.stringify({ choices: [{ delta: { content: "stream" } }] }) }),
      sseFrame({ data: "[DONE]" }),
    ];
    const deltas = await collect(extractDeltas(chunksOf(...wire)));
    expect(deltas).toEqual(["stream"]);
  });
});
