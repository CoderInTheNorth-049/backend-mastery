# Topic: The event loop, async patterns & concurrency control

> **Goal:** Understand *why* Node servers behave the way they do under load — then build the concurrency primitives every real backend secretly contains.

## Beginner-friendly picks

- 🎥 [Philip Roberts — What the heck is the event loop anyway?](https://www.youtube.com/watch?v=8aGhZQkoFbQ) — the most-watched JS talk ever; watch FIRST
- 🎥 [Jake Archibald — In The Loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0) — microtasks/macrotasks done properly
- 📝 [javascript.info — Event loop](https://javascript.info/event-loop) — text version with exercises

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Call stack vs queues | What runs when? Sync code → microtasks (promises) → macrotasks (timers/IO) | [Node.js event loop docs](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) · [MDN concurrency model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) |
| Microtask scheduling | `queueMicrotask`, promise `.then` chains starving timers; `process.nextTick` priority | Node docs above, "nextTick vs setImmediate" section |
| Timers phases | Why `setTimeout(0)` ≠ immediate; timer phase ordering; unref'd timers | Node event loop docs |
| Promises mechanics | Chaining, error propagation through chains, `Promise.all/allSettled/race/any` semantics | [javascript.info — promises](https://javascript.info/async) (chapters 1–6) |
| async/await truth | await ≈ `.then`; parallel vs sequential awaits; forgotten awaits = fire-and-forget bugs | javascript.info + [Ashley Willis — forgotten awaits](https://dev.to/this-is-learning/javascript-promises-and-why-await-forgets-3dcl) |
| Blocking the loop | One 200ms sync call in a handler = whole server frozen for everyone; worker_threads escape hatch | [Node guide — don't block](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop) |

## Keep in mind

- **Concurrency limit ≠ connection limit.** Your pool caps *tasks*; each task may still hold DB connections. Phase 03 connects these dots.
- **`Promise.all` fails fast and leaves siblings running** (unhandled rejection risk!). Production batch code uses `allSettled` or a pool with error collection.
- **Timeouts must cancel work**, not just stop waiting. A "timed out" DB query still burning CPU server-side is a leak with extra steps.
- **Unhandled rejections crash modern Node.** Fire-and-forget needs explicit `.catch` or `void`-documented policy.
- Backpressure is the senior concept here: producing promises faster than consuming them = memory explosion. Pools ARE backpressure.

## Self-check quiz

<details><summary>1. Order of logs: <code>setTimeout(()=>log("A")); Promise.resolve().then(()=>log("B")); log("C"); queueMicrotask(()=>log("D"));</code></summary>
C, B, D, A. Sync first, then microtasks in FIFO (B before D), timers last.
</details>

<details><summary>2. <code>const [a,b] = await Promise.all([f(),g()])</code> vs two awaited lines — latency difference?</summary>
Parallel vs sequential: all() starts both immediately, total ≈ max(f,g); sequential awaits sum. Classic accidental-slow-query bug in loops — fix with all() over a map().
</details>

<details><summary>3. Why can a single JSON.parse of a huge body take your API down globally?</summary>
JSON.parse is synchronous CPU work ON the event loop: no other request progresses during it. Mitigate: size limits at ingress, streaming parsers, worker threads.
</details>

<details><summary>4. What does Promise.any return when ALL reject?</summary>
Rejects with AggregateError containing all errors — vs race (first settle incl. rejection) and allSettled (never rejects).
</details>

## Assignment

[assignment.md](assignment.md) — build `sleep`, `withTimeout`, a concurrency-limited task pool with live stats, and `mapLimit`. These are the exact internals behind BullMQ workers, p-limit (60M+ downloads/wk), and DB pools.
