# Topic: Tracing with OpenTelemetry — following one request through the maze

> **Goal:** Instrument a checkout flow so a single trace shows the whole story — HTTP span parenting a DB span and a queue span — and verify the tree via OpenTelemetry's official in-memory exporter. No collector, no agent, no network.

## Beginner-friendly picks

- 🎥 [OTel — tracing intro video](https://opentelemetry.io/docs/concepts/signals/traces/) page links official walk-throughs
- 🧪 [OpenTelemetry Starship demo? no — try the official getting-started](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/) — manual instrumentation exactly like yours

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Spans & traces | trace = one request's story; spans = timed operations WITH parent links forming a tree | [OTel — tracing concepts](https://opentelemetry.io/docs/concepts/signals/traces/) |
| Context propagation | active span ⇒ implicit parent for children (`context.with` / `tracer.startActiveSpan`); cross-service via headers (W3C traceparent) | [OTel — propagation](https://opentelemetry.io/docs/concepts/context-propagation/) |
| Attributes & events | structured metadata ON spans (db.system, queue.name); errors recorded as exceptions + ERROR status | [OTel — semantic conventions](https://opentelemetry.io/docs/specs/semconv/) |
| Exporters | span processors hand ended spans to exporters; Simple = sync/debug, Batch = prod default | [OTel JS SDK](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/) |
| Sampling | head vs tail sampling: which traces you keep is a cost/coverage dial | [OTel — sampling](https://opentelemetry.io/docs/concepts/sampling/) |
| Instrumentation layers | manual tracer API vs auto-instrumentations (http/pg plugins do phases 02–03 wiring FOR you) | [OTel — instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/) |

## Keep in mind

- **Parentage is CONTEXT, not parameters** — startActiveSpan makes children inherit automatically; passing span objects around is the manual (fragile) path.
- **End every span in `finally`.** An unended span never exports, silently amputating your trace.
- **Attributes are your query surface**: without db.system/http.method on spans, traces are pretty pictures you can't filter.
- **Record exceptions explicitly** (`span.recordException(err)` + `setStatus(ERROR)`) or failures look like slow successes.
- InMemorySpanExporter + SimpleSpanProcessor = deterministic tests; BatchSpanProcessor in prod trades immediacy for throughput.

## Self-check quiz

<details><summary>1. DB span shows NO parent but exists in the same trace. What did the author forget?</summary>
Context activation: child created outside the parent's context.with scope. Parentage comes from the ACTIVE context at span creation.</details>

<details><summary>2. Trace ends mid-flow: publish span missing entirely. Classic cause?</summary>
Fire-and-forget promise: process exited (or span garbage) before end() ran. End in finally; await async children within the parent's lifetime.</details>

<details><summary>3. Why does tail sampling need buffering the WHOLE trace?</summary>
Decision requires seeing the final outcome (error anywhere?) — possible only after all spans arrive at the collector. Head sampling decides at root with no such knowledge.</details>

## Assignment

[assignment.md](assignment.md) — instrument `handleCheckout` so its three operations form a properly parented, attributed, error-recording span tree, verified through OpenTelemetry's own InMemorySpanExporter.
