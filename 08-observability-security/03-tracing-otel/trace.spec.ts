// Namespace import survives dual CJS/ESM interop for this package under
// vitest+SWC (named-import destructure broke at runtime).
import * as otelSdk from "@opentelemetry/sdk-trace-base";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { describe, expect, it } from "vitest";
import { handleCheckout } from "./src/trace";

const { InMemorySpanExporter, SimpleSpanProcessor, BasicTracerProvider } =
  otelSdk as typeof import("@opentelemetry/sdk-trace-base");

function setup() {
  const exporter = new InMemorySpanExporter();
  // OTel v2: processors are passed in the constructor (no addSpanProcessor).
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  const tracer = provider.getTracer("checkout");
  return { exporter, tracer };
}

/** v2 ReadableSpan exposes parentage as parentSpanContext. */
function parentIdOf(span: { parentSpanContext?: { spanId?: string } }): string | undefined {
  return span.parentSpanContext?.spanId;
}

describe("handleCheckout — span tree", () => {
  it("creates a root with two properly parented children", async () => {
    const { exporter, tracer } = setup();

    await handleCheckout(
      {
        dbQuery: async () => ({ rows: [] }),
        publish: async () => {},
      },
      tracer,
    );

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(3);

    const root = spans.find((s) => s.name === "http.post /checkout")!;
    const db = spans.find((s) => s.name === "db.query")!;
    const queue = spans.find((s) => s.name === "queue.publish")!;

    expect(root).toBeDefined();
    // root has no parent
    expect(parentIdOf(root)).toBeUndefined();

    // children parent to the ROOT
    expect(parentIdOf(db)).toBe(root.spanContext().spanId);
    expect(parentIdOf(queue)).toBe(root.spanContext().spanId);
  });

  it("root carries http attributes; db span declares its system", async () => {
    const { exporter, tracer } = setup();

    await handleCheckout(
      { dbQuery: async () => null, publish: async () => {} },
      tracer,
    );

    const spans = exporter.getFinishedSpans();
    const root = spans.find((s) => s.name === "http.post /checkout")!;
    const db = spans.find((s) => s.name === "db.query")!;

    expect(root.attributes["http.method"]).toBe("POST");
    expect(root.attributes["http.route"]).toBe("/checkout");
    expect(db.attributes["db.system"]).toBe("postgres");
  });

  it("all spans end (exported), each exactly once", async () => {
    const { exporter, tracer } = setup();

    await handleCheckout(
      { dbQuery: async () => null, publish: async () => {} },
      tracer,
    );

    const spans = exporter.getFinishedSpans();
    const ids = spans.map((s) => s.spanContext().spanId);
    expect(new Set(ids).size).toBe(spans.length); // no duplicate exports
    for (const span of spans) {
      expect(span.endTime[0]).toBeGreaterThan(0); // ended
    }
  });

  it("publish failure records exception + ERROR status and rethrows", async () => {
    const { exporter, tracer } = setup();

    await expect(
      handleCheckout(
        {
          dbQuery: async () => null,
          publish: async () => {
            throw new Error("broker down");
          },
        },
        tracer,
      ),
    ).rejects.toThrow("broker down");

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(3); // db + failed publish + root all still end

    const publish = spans.find((s) => s.name === "queue.publish")!;
    expect(publish.status.code).toBe(SpanStatusCode.ERROR);
    expect(JSON.stringify(publish.events)).toContain("broker down");

    const root = spans.find((s) => s.name === "http.post /checkout")!;
    expect(root.status.code).toBe(SpanStatusCode.ERROR);
  });

});
