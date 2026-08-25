# Phase 01 — TypeScript & Node.js internals (~3 weeks)

Node runs your backend; TypeScript describes it. Seniors debug *inside* these layers instead of around them.

## Beginner-friendly picks

- 🎥 [Matt Pocock — Total TypeScript free tutorials](https://www.totaltypescript.com/tutorials) — beginners course is gold
- 📝 [javascript.info](https://javascript.info/) — the friendliest JS-to-depth book online

## Topics

| Folder | Est. | You build |
|---|---|---|
| [01-ts-type-system](01-ts-type-system/) | 5 days | Generic utilities, discriminated unions (`Result`), a fully typed event emitter |
| [02-event-loop-async](02-event-loop-async/) | 5 days | Concurrency pool, timeouts, `Promise.race` patterns — the code behind every rate limiter/batcher |
| [03-streams-iterators](03-streams-iterators/) | 4 days | Chunk-boundary-safe transforms, NDJSON parsing, async-generator batching |

## Why this matters

- The event loop explains **why Node servers hang** (blocking sync call in a handler) and why p99 spikes happen (microtask floods). Interviewers probe this relentlessly.
- A hand-rolled concurrency pool is the seed of: DB connection pools, worker queues, batch processors — phase 06 builds on it directly.
- Streams = how you'll process logs/uploads/backups without OOM. The flagship projects ingest exactly this way.

## Done means

- [ ] All three topic specs green
- [ ] You can explain microtask vs macrotask ordering with a whiteboard example
- [ ] Your notes contain one "I broke it and now I understand" story per topic
