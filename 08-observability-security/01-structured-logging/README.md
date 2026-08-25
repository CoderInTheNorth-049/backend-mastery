# Topic: Structured logging — grep-able truth at 3 AM

> **Goal:** Logs are the UI of production incidents. You'll build a logger factory with redaction, request correlation, and level policy — then verify every guarantee by PARSING your own output as JSON.

## Beginner-friendly picks

- 📝 [pino — docs quick start](https://getpino.io/#/docs/api?id=loggerchildbindings) — child-binding section mirrors your assignment
- 🎥 YouTube search: **“structured logging”** — several language-agnostic motivation talks

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Structured > string logs | key-value JSON lines beat interpolated prose: queryable, parseable, cheap to ship | [pino — basics](https://getpino.io/#/docs/api) |
| Levels as policy | trace/debug for development noise; info = business events; warn = handled anomalies; error = needs attention. Level choice is a COST decision | pino docs + your assignment |
| Redaction | credentials/PII must never leave the process — path-based redaction happens BEFORE serialization | [pino — redact](https://getpino.io/#/docs/redaction) |
| Correlation ids | one request-id on every line across services; the join key for incident archaeology | phase-02 request-id middleware recap |
| Child loggers | bind per-request/per-job context once; inherit everywhere below | [pino — child loggers](https://getpino.io/#/docs/api#child) |
| Sampling & volume | debug everything in dev ≠ prod; head/tail sampling trades blind spots for cost | [Google SRE — logging](https://sre.google/sre-book/handling-postmortems/) (context chapters) |

## Keep in mind

- **Redact by PATH (`req.headers.authorization`), not by hope** — string-scanning after serialization is too late; secrets already hit disk/shippers.
- **Log arguments, not conclusions**: `{"attempt":2,"backoffMs":200}` beats "retrying" — numbers enable alerting.
- **Every line carries service/version/env** via base bindings, or cross-service greps lie to you.
- **Timestamps ISO or epoch-ms, never locale strings** — sortability is survival.
- **Errors log the STACK and the CONTEXT** (user id? request id?), never just `err.message`.

## Self-check quiz

<details><summary>1. Why redact inside the logger instead of just not logging secrets?</summary>
Defense-in-depth: upstream libraries/debug code add objects you didn't audit. Path-redaction catches them pre-serialization; "we were careful" doesn't survive dependency updates.</details>

<details><summary>2. Your grep for requestId=abc returns lines from THREE services. What made that possible?</summary>
Propagation: inbound header extracted → bound into each service's child logger (and trace context). Without deliberate propagation it's three unrelated streams.</details>

<details><summary>3. Cost question: info-level everywhere vs sampled debug in prod?</summary>
Info keeps business events complete (auditable) but pays bytes forever; sampled debug buys deep traces at partial coverage. Choose per service criticality — document the blind spots.</details>

<details><summary>4. What's wrong with <code>logger.info("User " + email + " did " + action)</code>?</summary>
Unstructured (unqueryable), concatenation hides field boundaries, injection-prone formatting, no stable keys for alerts. Use <code>logger.info({email, action}, "user action")</code>.</details>

## Assignment

[assignment.md](assignment.md) — implement `createLogger` (redaction, base bindings, stream injection) + `withRequest` correlation helper. Specs PARSE your output as JSON and assert every promise.
