# Assignment — A resilient BullMQ queue wrapper

## The problem you're solving
Raw BullMQ gives you queues; production needs POLICY: how many tries, how long between them, where dead jobs go, and honest counters for dashboards. You'll wrap BullMQ into one factory enforcing that policy — graded against REAL Redis with actual retries, delays, and corpses.

## Your tasks
Implement in [src/worker-kit.ts](src/worker-kit.ts):

1. **`nextRetryDelayMs(policy, attempt)`** (pure) — exponential `backoffMs * 2^(attempt-1)`, capped at 60_000ms; attempt < 1 throws RangeError.
2. **`createResilientQueue({redisUrl, queueName?, policy?, processor})`** returning `{addJob, stats, deadLetters, close}`:
   - jobs added with `{attempts, backoff:{type:"fixed",delay}}` from policy (defaults attempts 3, backoffMs 10)
   - `stats()` reads waiting/completed/failed/delayed counts
   - exhausted jobs (worker `failed`, `attemptsMade >= attempts`) mirror `{jobId,name,data,failedReason}` into Redis list `dlq:<queueName>`
   - `close()` idempotent: worker → queue → connection.disconnect

## Definition of done
- [ ] Backoff spec green (no server needed)
- [ ] Worker-kit green against live Redis: flaky job succeeds on exactly execution 3; doomed job lands ONE DLQ entry naming its payload; delayed jobs promote after ~120ms; FIFO holds at concurrency=1; double-close silent

## Hints (open only when stuck)

<details><summary>Connection flag</summary>
BullMQ blocking waits need <code>maxRetriesPerRequest: null</code> on ioredis.</details>

<details><summary>DLQ routing</summary>
In worker <code>failed</code>, compare <code>job.attemptsMade</code> to attempts BEFORE pushing — earlier failures are mid-retry, not dead.</details>

## Going further (optional)
Sandboxed processors, rate-limited groups, or a redrive API re-adding DLQ jobs.