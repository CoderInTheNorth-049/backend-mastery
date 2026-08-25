# Topic: The transactional outbox — killing the dual-write bug

> **Goal:** Make "write to DB + publish event" atomic where it counts and at-least-once everywhere else. You'll implement the outbox pattern, a SKIP LOCKED relay, and an inbox-based idempotent consumer — then prove each failure mode with tests.

## Beginner-friendly picks

- 📝 [Chris Richardson's outbox pattern page](https://microservices.io/patterns/data/transactional-outbox.html) — read twice; it's the assignment's thesis
- 🎥 YouTube search: **“dual writes problem”** — visual failure-mode demos

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| The dual-write problem | `db.save(); bus.publish()` — crash between them = state changed, world never told (or vice versa) | [microservices.io — transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html) |
| Transactional outbox | event row committed IN THE SAME tx as the state change; publishing becomes a separate relay concern | same pattern page |
| Relay mechanics | poll (or tail/WAL) unpublished rows → publish → mark. Crash windows mean AT-LEAST-ONCE publishing | [microservices.io — polling publisher](https://microservices.io/patterns/data/polling-publisher.html) |
| Concurrent relays | `FOR UPDATE SKIP LOCKED` — workers claim disjoint rows without blocking | [PG docs — SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE) |
| Inbox pattern | consumers record processed event ids; replays become no-ops | [microservices.io — idempotent consumer](https://microservices.io/patterns/data/idempotent-consumer.html) |
| Ordering caveats | outbox rows per aggregate keep order; cross-aggregate ordering needs care (watermarks/partition keys) | phase 04 recap |

## Keep in mind

- **The outbox row IS the commit**: if the tx rolls back, the event never existed. That's the entire magic — no distributed transactions.
- **Relay crash between publish and mark ⇒ duplicate publish.** Not a bug: the contract. Consumers dedupe via inbox keyed on deterministic event ids.
- **`SKIP LOCKED` turns locking from queue-blocker into work-stealer** — the one SQL feature every job system quietly relies on.
- **Event payloads are versioned contracts** too — consumers break on silent shape changes just like APIs.
- Handler-throws semantics you define matter: release-the-claim-and-retry vs park-as-failed. This topic pins one policy and tests it.

## Self-check quiz

<details><summary>1. Why not just publish AFTER the DB transaction returns?</summary>
Crash in that gap = committed state with no event (silent downstream drift). Outbox moves the publish decision INTO the committed data itself.</details>

<details><summary>2. Two relay pods race. Without SKIP LOCKED what do you see?</summary>
Both SELECT the same pending rows → duplicate publishes even before any crash (and lock contention errors). SKIP LOCKED makes claims disjoint atomically.</details>

<details><summary>3. Where does the event ID for consumer dedupe come from?</summary>
Deterministic identity: outbox row id (relay stamps it onto the envelope), or natural key like order-id+version. Random uuid-per-attempt defeats dedupe.</details>

<details><summary>4. Your inbox table grows forever. Options?</summary>
TTL cleanup of old processed keys once dedupe horizon passes (event ids never reused within window); or fold dedupe into handler's own unique constraints.</details>

## Assignment

[assignment.md](assignment.md) — implement `placeOrderWithOutbox`, `relayOnce` (SKIP LOCKED), and `consumeIdempotent`. Tests prove: commit-survives-publisher-crash, no duplicates under concurrent relays, replay-safe consumption, and claim-release-on-handler-failure.
