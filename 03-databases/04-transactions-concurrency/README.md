# Topic: Transactions & concurrency — correctness under contention

> **Goal:** Build the seat reservation that interviewers probe and products get sued over: two competing users, one seat, provably exactly-one-winner. You'll implement BOTH classic strategies against real concurrent connections.

## Beginner-friendly picks

- 🎥 YouTube search: **“database isolation levels explained”** — anomaly animations beat prose here
- 📝 [Postgres tutorial — transactions](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-transaction/) — plain-language companion to the official docs

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| ACID, precisely | atomicity vs isolation confusion; durability's fine print (fsync, replication lag) | [PG docs — concurrency intro](https://www.postgresql.org/docs/current/mvcc-intro.html) |
| Isolation levels & anomalies | dirty/nonrepeatable/phantom reads; **lost update**; what READ COMMITTED actually permits in PG | [PG docs — isolation levels](https://www.postgresql.org/docs/current/transaction-iso.html) |
| MVCC mental model | readers never block writers; snapshots; why you rarely see dirty data in Postgres | PG MVCC chapter above |
| Pessimistic locking | `SELECT … FOR UPDATE`; lock queueing; when holding locks across app logic turns dangerous | [PG — row locking](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE) |
| Optimistic locking | version column + conditional UPDATE; retry economics vs contention level | your assignment |
| Deadlocks | circular wait definition; PG's detector (`40P01`) picks a victim; prevention via **ordered resource acquisition** | [PG — deadlock detection](https://www.postgresql.org/docs/current/deadlocks.html) |

## Keep in mind

- **Check-then-act is not atomic** — `SELECT balance` then `UPDATE` without a guard loses money under concurrency. This is THE bug class this topic kills.
- **READ COMMITTED doesn't prevent lost updates**: two overlapping read-modify-write cycles can both commit. Either `FOR UPDATE`, or version-gated writes, or `SERIALIZABLE` (+retry).
- **Locks held while awaiting external I/O are landmines** — HTTP calls inside an open transaction turn row locks into outage fuel.
- **Deadlock prevention beats detection**: acquire resources in ONE global order (sort ids!) and cycles become structurally impossible. Retry helpers are the safety net, not the strategy.
- **Optimistic shines at low contention** (most bookings don't collide); pessimistic wins hot-row scenarios (last ticket, flash sales). Know the switch-over intuition.

## Self-check quiz

<details><summary>1. Two txns read stock=1, both decrement to 0 and write. Which anomaly, which fix?</summary>
Lost update. Fixes ranked: SELECT FOR UPDATE before read; version-gated UPDATE … WHERE version=n (affected-rows check); SERIALIZABLE + retry.</details>

<details><summary>2. Why can't READ COMMITTED produce a dirty read in Postgres?</summary>
MVCC: readers see only committed row versions via snapshot/xid checks — uncommitted changes live in other versions. Dirty reads simply aren't possible regardless of level.</details>

<details><summary>3. Your FOR UPDATE query sometimes errors "deadlock detected". Root cause shape?</summary>
Two txns acquiring the SAME two locks in OPPOSITE orders. Fix: canonical acquisition order (ORDER BY id / sort keys) everywhere touching those rows.</details>

<details><summary>4. When would you pick optimistic over pessimistic for seat booking?</summary>
Low collision probability (large halls, sparse demand): retries are rare, so you skip lock dwell time and hold connections briefly. Flash-sale hot rows flip it — retries would thrash; short FOR UPDATE wins.</details>

## Assignment

[assignment.md](assignment.md) — implement `reserveSeatPessimistic`, `reserveSeatOptimistic`, `withDeadlockRetry`, and `transferWithRetry`. The spec fires 8 concurrent reservers at one seat and counts survivors.
