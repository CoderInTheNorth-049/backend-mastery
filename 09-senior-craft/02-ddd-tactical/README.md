# Topic: DDD tactical patterns — aggregates that protect invariants

> **Goal:** Stop letting any code mutate any field. You'll spot broken aggregate modeling in a provided flawed module, then build the corrected version: a `Money` value object and an `Order` aggregate that makes invalid states unrepresentable — fully autograded.

## Beginner-friendly picks

- 📝 [Fowler — Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html) — two pages, zero jargon
- 🎥 YouTube search: **“aggregates domain driven design”** — several visual boundary walkthroughs

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Value objects | no identity, immutable, equality by VALUE (`Money`); primitives that travel together deserve types | [Fowler — value object](https://martinfowler.com/bliki/ValueObject.html) |
| Aggregates & roots | consistency boundary; ONE root owns access; invariants enforced INSIDE across the whole cluster | [Fowler — DDD_Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html) |
| Invariants in the model | `order.total === Σ(lineItems)` must be impossible to break — even by future-you | your assignment |
| Repositories per aggregate | persist/load WHOLE aggregates; no repository per table | [Fowler — repository](https://martinfowler.com/eaaCatalog/repository.html) |
| Domain events from aggregates | state changes announce themselves (`OrderPlaced`) — feeds outbox (phase 06!) | [microservices.io domain event](https://microservices.io/patterns/data/domain-event.html) |
| Bounded contexts | same word, different model per context ("User" in auth ≠ "User" in billing) | Fowler DDD tag above |

## Keep in mind

- **One aggregate per transaction** — cross-aggregate rules become sagas/eventual consistency (phase 06), never shared locks.
- **Setters are a smell**: behavior methods (`order.pay()`) carry rules; raw setters leak them.
- **Small aggregates win**: big clusters = contention. Reference other aggregates BY ID, not by object graph.
- **Anemic models = procedural code in classes**: if your domain folder is all getters/setters + a service doing logic, you've missed the point.

## Self-check quiz

<details><summary>1. Why make Money immutable instead of {amount, currency} with setters?</summary>
Aliasing bugs: two holders of the same object mutate it unexpectedly. Immutability + operations returning NEW instances makes math safe to share.</details>

<details><summary>2. Can OrderLineItem have its own repository?</summary>
No — line items have meaning only inside their Order. Persist via the order aggregate's repository or you can bypass invariants.</details>

<details><summary>3. Rule: “an order may not exceed 100 items.” Where does it live?</summary>
Inside Order.addLineItem as an invariant check throwing a domain error — enforced for EVERY caller forever.</details>

## Assignment

[assignment.md](assignment.md) — analyze a provided broken model, then implement `Money` + `Order` with enforced invariants. Spec covers immutability, currency discipline, invariant throws, and total-consistency.
