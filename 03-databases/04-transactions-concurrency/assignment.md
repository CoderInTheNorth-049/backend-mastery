# Assignment — Exactly one winner, two ways

## The problem you're solving
Two fans grab seat A7 at the same millisecond. Naive “read status, check, update” code sells the same seat twice — the bug class that refunds careers. You'll implement seat reservation TWICE (pessimistic row-locks and optimistic version checks), plus a deadlock-retry helper and a bank transfer that's deadlock-proof by construction. The spec fires 8 concurrent reservers at one seat and counts survivors.

## Your tasks
Implement in [src/seats.ts](src/seats.ts):

1. **`reserveSeatPessimistic(pool, seatId, holder)`** → `boolean`
   One transaction: `SELECT status … FOR UPDATE`; if free → set `status='held'`, `heldBy`, `heldUntil = now()+15min`, bump `version`, COMMIT, return true. Missing/held → COMMIT false. Any throw → ROLLBACK and rethrow; ALWAYS release the client.
2. **`reserveSeatOptimistic(pool, seatId, holder, maxRetries = 5)`**
   Loop up to maxRetries+1 attempts, each its OWN transaction: read `{status, version}` plainly; decided seats return false immediately (no retry); otherwise `UPDATE … WHERE id AND version = $3 AND status='free'` — `rowCount === 1` wins, anything else retries on a FRESH transaction.
3. **`withDeadlockRetry(fn, maxRetries = 3)`**
   Retries ONLY errors whose `.code === DEADLOCK_CODE` (`"40P01"` — export it). Everything else rethrows immediately. After exhaustion, throw the LAST deadlock error.
4. **`transferWithRetry(pool, fromId, toId, amountCents)`**
   Validate positive integer cents (`DomainError("invalid-amount")`). Inside a transaction wrapped by your retry helper: lock BOTH accounts in one statement ordered by id (`WHERE id IN ($low,$high) ORDER BY id FOR UPDATE`) with a comment explaining WHY ordering kills cycles; missing account → `"account-not-found"`, insufficient funds → `"insufficient-funds"`; then decrement/increment and COMMIT. Export `DomainError`.

## Definition of done
- [ ] Both specs green: exactly ONE winner out of 8 concurrent reservers — every run
- [ ] Optimistic version ends at exactly 1 after the race
- [ ] 60 overlapping transfers conserve total balance to the cent

## Hints (open only when stuck)

<details><summary>Client lifecycle</summary>
connect → BEGIN → work → COMMIT/ROLLBACK → release in <code>finally</code>. Forgetting release under an error path exhausts the pool and hangs unrelated specs later.
</details>

<details><summary>Optimistic fresh snapshots</summary>
Each retry opens a NEW transaction so it sees the winner's committed state. Reusing one tx keeps the stale snapshot forever.
</details>

## Going further (optional)
Lazy expiry: allow reserving seats whose `heldUntil` has passed. Then note why testing THAT deterministically needs an injected clock.
