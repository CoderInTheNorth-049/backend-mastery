# Assignment — instrumented checkout flow (OTel span trees)

## The problem you're solving
When checkout slows down, is it the database or the queue? Distributed tracing answers only if spans form a proper TREE: one root per request, children parented correctly, failures recorded as ERROR status. You'll instrument a checkout flow and verify the whole tree through OpenTelemetry's InMemorySpanExporter.

## Your tasks
Implement `handleCheckout(deps, tracer?)` in [src/trace.ts](src/trace.ts):

1. Root span `http.post /checkout` with attributes `http.method=POST`, `http.route=/checkout`.
2. Child span `db.query` around `deps.dbQuery()` with attribute `db.system=postgres`.
3. Child span `queue.publish` around `deps.publish()`.
4. Children created INSIDE the root's context so `parentSpanContext` points at root.
5. On failure: recordException + setStatus(ERROR) on the failing span AND the root; rethrow.
6. Every span ends EXACTLY once — success or failure.

⚠️ **OTel v2 gotchas you WILL hit (and learn from):** processors go in the constructor (`spanProcessors: [...]`); readable spans expose `parentSpanContext`; and the base SDK has NO implicit context propagation — derive `trace.setSpan(parent, span)` explicitly and thread it down.

## Definition of done
- [ ] Spec green: 3 exported spans, correct parentage, attributes present, publish-failure marks both spans ERROR while db span still ends cleanly

## Hints (open only when stuck)

<details><summary>Explicit threading</summary>
Derive <code>ctx = trace.setSpan(parent, span)</code>, then run fn(ctx) passing ctx DOWN to nested startSpan calls. Reading context.active() inside async continuations requires a registered manager the base SDK doesn't install.</details>

## Going further (optional)
W3C traceparent extraction/injection helpers; sampling decision attribute on the root.

