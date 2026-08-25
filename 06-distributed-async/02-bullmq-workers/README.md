# Topic: BullMQ workers — retries, delays, and dead letters for real

> **Goal:** Wrap BullMQ into the shape you'd actually want in a service: one factory that yields a queue+worker pair with sane retry policy, observable stats, and a real dead-letter trail. Runs against REAL Redis — actual retries, actual delays, actual failures.

## Beginner-friendly picks

- 📝 [BullMQ patterns guide](https://docs.bullmq.io/patterns) — queue/worker/sandbox patterns beyond the assignment
- 🎥 YouTube search: **“BullMQ Node.js tutorial”** — setup walkthroughs matching your wrapper

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| BullMQ model | queues hold jobs; workers consume; Redis IS the broker (lists + sorted sets under the hood) | [BullMQ — getting started](https://docs.bullmq.io/guide/) |
| Attempts & backoff | `attempts` counts TOTAL tries; backoff strategies (fixed/exponential) configured per job | [BullMQ — retries](https://docs.bullmq.io/guide/retrying-failing-jobs) |
| Delayed jobs | sorted-set of future jobs promoted when due — how `delay` works without timers | [BullMQ — delayed](https://docs.bullmq.io/guide/delayed-jobs) |
| Failure events | worker `'failed'` event carries job + error; `attemptsMade` vs your policy decides DLQ routing | [BullMQ — events](https://docs.bullmq.io/guide/events) |
| Connection hygiene | ioredis needs `maxRetriesPerRequest: null` under BullMQ; closing both ends gracefully | [BullMQ — connections](https://docs.bullmq.io/connections) |
| Poison jobs | bounded attempts then DLQ mirror — never infinite retry (topic 01's lifecycle, implemented) | your assignment |

## Keep in mind

- **Attempts semantics trip everyone once**: `{attempts: 3}` = up to 3 TOTAL executions, not 3 retries after the first. Assert it in tests so it never surprises you again.
- **Fixed tiny backoffs in tests** (10ms) are legitimate — policy SHAPE is what's graded, not wall-clock patience.
- **Deterministic ordering needs `concurrency: 1`.** The moment workers overlap, completion order is scheduler's whim (phase 01 pool recap).
- **The DLQ is Redis too** — a list your ops story must drain. Mirror minimal metadata: job id, name, data, last failure reason.
- **Unique queue names per test run** prevent cross-test bleed — namespacing is part of your API's job, not the test's burden.

## Self-check quiz

<details><summary>1. Why does BullMQ demand <code>maxRetriesPerRequest: null</code> on its Redis connections?</summary>
Blocking commands (BRPOPLPUSH-style waits) can exceed ioredis's per-command retry window; null disables that ceiling so long blocking waits don't throw mid-wait.</details>

<details><summary>2. Job fails twice then succeeds with attempts=3. What does attemptsMade equal at success?</summary>
3 — attemptsMade counts executions including the successful one. Off-by-one here is how DLQ routing silently misroutes.</details>

<details><summary>3. Your delayed-job volume explodes; Redis memory climbs. Which structure is growing?</summary>
The delayed ZSET (score = ready-time). Options: shed delays onto app-side scheduling, shorten horizons, or move to a stream-based scheduler.</details>

## Assignment

[assignment.md](assignment.md) — implement `createResilientQueue` (+ pure `nextRetryDelayMs`), graded against live Redis: retry-until-success, exhaust-to-DLQ, delayed promotion, ordered processing, graceful close.
