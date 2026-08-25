# Topic: Sagas & CQRS — distributed transactions without distributed locks

> **Goal:** Orchestrate multi-service workflows that FAIL WELL: every step paired with its compensation, executed in reverse on the way down. Then serve queries from a denormalized read model kept fresh by an incremental projector.

## Beginner-friendly picks

- 🎥 YouTube search: **“saga pattern microservices”** — choreography vs orchestration animations
- 📝 [microservices.io — CQRS](https://microservices.io/patterns/data/cqrs.html) — pairs with your projector assignment

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Why not 2PC | coordinator = availability bottleneck; locks held across services; XA rarely supported by modern queues | [microservices.io — saga](https://microservices.io/patterns/data/saga.html) |
| Saga = sequence + compensations | each step's undo; compensation design is THE hard part (what if compensation itself fails?) | same + [CQRS/Saga FAQ sections] |
| Choreography vs orchestration | events-everywhere vs a stateful conductor — team size and flow complexity decide | microservices.io both pages |
| Semantic locks / pivots | steps after which you must compensate FORWARD (refund vs cancel) — pivot points can't roll back | [microservices.io notes] |
| CQRS separation | write model normalizes; read model denormalizes for ONE query shape; updated via events | [microservices.io — CQRS](https://microservices.io/patterns/data/cqrs.html) |
| Projectors & watermarks | incremental fold of domain events into read models; watermark = your consistency cursor | your assignment |

## Keep in mind

- **Compensations are business actions, not DB undos**: refund ≠ DELETE payment. Some steps are pivots — past them, only forward-fix flows exist.
- **Sagas are at-least-once end-to-end too** — every step idempotent or deduped, exactly like topic 05.
- **The orchestrator owns STATE**: persisted per-saga instance, resumable across process restarts. An in-memory statechart is the teaching model; prod adds a store.
- **Read models lag by design.** The UI contract ("updated within ~2s") is part of the architecture, not an apology.
- **One projector watermark row per read model** — losing it forces full replay; corrupting it silently skips events. Treat it like production data.

## Self-check quiz

<details><summary>1. Order saga: charge card → reserve stock → ship. Card charge succeeded but stock reservation failed. Compensation?</summary>
REFUND the charge (business action), never "uncharge". This is why compensations live in the step definition — the domain knows its own undo.</details>

<details><summary>2. Shipping completed, THEN user cancels. What does the saga do?</summary>
Nothing retroactively — shipping was the PIVOT. Cancel becomes a forward flow: return-authorize → refund. Sagas model pre-pivot rollback; post-pivot needs new sagas.</details>

<details><summary>3. Two compensations in a row fail mid-rollback. What must your runner do?</summary>
Keep compensating the rest (isolation is already lost), collect errors, surface for human/automated follow-up. Aborting compensation leaves worse half-states.</details>

<details><summary>4. Read model shows comment_count 5, source has 7. Walk your debug order.</summary>
Projector running? watermark position? event ordering assumptions? handler bug for one kind? then full-replay comparison as ground truth.</details>

## Assignment

[assignment.md](assignment.md) — implement `runSaga` (execute/compensate semantics, error collection) and `appendEvent`/`projectOnce`/`readModel` (watermarked incremental projector). Statechart specs run anywhere; projector runs on real Postgres.
