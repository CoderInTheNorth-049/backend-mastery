# Assignment — concurrency primitives from scratch

## The problem you're solving
Ever wondered how a server handles 10k connections with one thread — or why ONE slow JSON.parse freezes everyone? The event loop is the answer, and concurrency pools are how you tame it. p-limit downloads millions of times weekly because teams keep needing exactly what you'll build today.

## Your tasks
1. [src/timing.ts](src/timing.ts): implement `sleep(ms)` and `withTimeout(promise, ms)` — reject with a “timed out” error when too slow, clean up internal timers either way, and never leak unhandled rejections from the wrapped promise.
2. [src/pool.ts](src/pool.ts): implement `createPool(limit)` whose `run(tasks)` executes queued tasks with AT MOST `limit` running simultaneously, preserves input ORDER in results, reports live `active()` count, rejects if any task fails (without starting untouched ones), and stays reusable. Then implement `mapLimit(items, limit, fn)` using your pool.
3. Specs use fake timers and concurrency spies — run them until green.

## Definition of done
- [ ] Peak concurrency never exceeds limit (spies prove it)
- [ ] Results arrive in INPUT order even when later tasks finish first
- [ ] No leaked timers; fake-timer tests pass cleanly

## Hints

<details><summary>Hint 1 — pool core</summary>
Worker pattern: spawn exactly min(limit, tasks.length) worker loops; each loop pulls the next index from a shared counter, awaits it, repeats until exhausted. Workers = concurrency; shared counter = queue.
</details>

<details><summary>Hint 2 — ordering</summary>
Preallocate results: Array(tasks.length); each completed task writes results[itsIndex]. Single Promise.all over workers at the end.
</details>

<details><summary>Hint 3 — active()</summary>
Increment BEFORE starting each task's promise, decrement in a finally. If tests see stale numbers, you're decrementing too early or counting wrong side of await.
</details>

## Acceptance criteria

- [ ] Spec green (`pnpm test:topic 01-typescript-node/02-event-loop-async`)
- [ ] No `any`, no unhandled-rejection warnings in output
- [ ] Fake-timer tests pass → zero leaked timers

## Stretch

- Add `runCatching` variant collecting per-task errors as `Result<T, unknown>[]` (ties to previous topic!)
- Add pause/resume to the pool
- Benchmark: pool vs naive all() for 10k tasks × limit 10 — note memory/latency deltas
