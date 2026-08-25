import { Context, context as otelContext, SpanStatusCode, trace, Tracer } from "@opentelemetry/api";

type Fn<T> = (ctx: Context) => Promise<T>;

async function withSpan<T>(
  tracer: Tracer,
  name: string,
  attributes: Record<string, string | undefined>,
  parentContext: Context | undefined,
  fn: Fn<T>,
): Promise<T> {
  const parent = parentContext ?? otelContext.active();
  const span = tracer.startSpan(name, { attributes }, parent);

  // Derive the child-context EXPLICITLY and hand it to fn. Reading
  // context.active() inside fn would need a registered context manager —
  // the base SDK doesn't install one.
  const ctx = trace.setSpan(parent, span);

  try {
    return await fn(ctx);
  } catch (error) {
    if (error instanceof Error) {
      span.recordException(error);
    }
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}

export async function handleCheckout(
  deps: { dbQuery(): Promise<unknown>; publish(): Promise<void> },
  tracer?: Tracer,
): Promise<void> {
  const t = tracer ?? trace.getTracer("checkout");

  await withSpan(
    t,
    "http.post /checkout",
    { "http.method": "POST", "http.route": "/checkout" },
    undefined,
    async (rootContext) => {
      await withSpan(t, "db.query", { "db.system": "postgres" }, rootContext, deps.dbQuery);
      await withSpan(t, "queue.publish", {}, rootContext, deps.publish);
    },
  );
}
