# Topic: LLM APIs & token streaming — SSE under your fingers

> **Goal:** Every AI feature ships over Server-Sent Events. You'll implement the SSE wire format BOTH ways — server-side frame serializer and a chunk-boundary-safe parser that yields clean events from arbitrary byte splits — then map OpenAI-style completion chunks onto it.

## Beginner-friendly picks

- 📝 [MDN — Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — the format spec in plain words
- 🎥 YouTube search: **“server sent events explained”** — short visual intros; rewatch after passing

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| SSE frame anatomy | `event:`/`data:`/`id:` fields, blank line = dispatch, multiple `data:` lines join with `\n`, `:` lines are comments | [MDN SSE format](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format) |
| Chunk boundaries | TCP doesn't respect frames — buffers must accumulate until a blank line arrives (phase-01 streams, again) | your assignment |
| Chat-completion chunks | providers stream `{choices:[{delta:{content}}]}` objects as SSE `data:` payloads, ending with literal `[DONE]` | [OpenAI streaming reference](https://platform.openai.com/docs/api-reference/chat/streaming) |
| Backpressure & abort | slow clients + unbounded generation = cost bombs; AbortSignal everywhere | phase 00 retry recap |
| Why SSE before WebSockets | one-way token streams keep HTTP semantics: proxies, reconnect w/ Last-Event-ID, plain auth | MDN page above |

## Keep in mind

- **`data: [DONE]` is a SENTINEL**, not JSON — handle both worlds explicitly.
- **CRLF vs LF**: browsers send `\n`; some proxies inject `\r`. Normalize.
- **Never trust a single chunk to contain a whole frame** — this is THE bug of hand-rolled SSE parsers (your spec attacks it first).
- Token streams make **cost real-time**: every delta you forward is money (topic 05 meters it).

## Self-check quiz

<details><summary>1. Two <code>data:</code> lines inside one event arrive. What does the consumer receive?</summary>
They concatenate with "\n" between them into ONE event's data payload.</details>

<details><summary>2. A comment line (<code>: keep-alive</code>) arrives mid-stream. Effect?</summary>
Ignored by consumers but resets proxy idle timers — that's WHY keep-alive comments exist.</details>

<details><summary>3. Your parser emitted half an event. Root cause class?</summary>
Dispatching on chunk arrival instead of buffering until the blank-line terminator — the exact bug your spec's split-chunk test hunts.</details>

## Assignment

[assignment.md](assignment.md) — implement `sseFrame()` serializer, `parseSseStream()` async-parser, and `extractDeltas()` OpenAI-chunk mapper. Split-chunk tests guarantee boundary safety.
