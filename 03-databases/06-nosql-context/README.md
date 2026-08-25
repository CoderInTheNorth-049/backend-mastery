# Topic: NoSQL in context — when documents genuinely win *(reading)*

> **Goal:** Not a Mongo tutorial — a decision framework. You'll already feel relational strengths from topics 01–05; this is about recognizing the workloads where documents/key-value/wide-column models are the honest choice.

## Beginner-friendly picks

- 🎥 YouTube search: **“SQL vs NoSQL”** — take every claim with the decision-table above as your filter

## The honest comparison table

| Dimension | Relational (Postgres) | Document (Mongo/Dynamo-style) | Key-value (Redis) |
|---|---|---|---|
| Data shape | normalized, stable schema | aggregate-shaped, evolving | opaque values |
| Relationships | joins everywhere, FK-enforced | embed or manual $lookup | none |
| Transactions | full multi-row ACID | single-document ACID (multi-doc varies) | limited/atomic ops |
| Access pattern | ad-hoc queries thrive | known access paths per aggregate | get/put by key |
| Scaling story | vertical first, read replicas, sharding later | horizontal-native design intent | partition by key trivially |

## When each genuinely wins

**Documents:** event payloads stored as aggregates, content management with per-type shapes, mobile-sync style nested records read/write whole, write-once telemetry snapshots. The tell: *you always read and write the whole aggregate anyway* — joins would be ceremony.

**Relations:** anything with cross-entity integrity requirements (money, inventory, bookings), reporting/ad-hoc queries, slowly-changing dimensions. The tell: *multiple access paths over shared facts*.

**Key-value:** sessions, feature flags, rate counters, caches — phase 05 was exactly this.

## Keep in mind

- **"Web scale" is not an argument.** Postgres comfortably handles most products' lifetime load; premature sharding/document-model choices create MORE scaling pain than they solve.
- **Embedding vs referencing is THE document-modeling decision.** Embed what you read together and bounded growth; reference what's shared/unbounded. A comment list growing forever inside a post document is a production incident on install day.
- **Eventual consistency is a product decision,** not an implementation detail — someone must own the "your data may lag" UX conversation.
- **Polyglot persistence is real but taxed**: two backup strategies, two failure modes, two ORMs. Earn the second database with a workload, not a blog post.
- Phase 06's Kafka is technically an append-only log — distributed systems keep re-inventing constrained stores because constraints are where correctness lives.

## Self-check quiz

<details><summary>1. A team picked Mongo "so schema changes are free." Six months later: painful migrations anyway. Why?</summary>
Schemas didn't vanish — they moved into code. Every reader must handle every historical shape forever (or you write migration scripts = migrations with worse tooling).</details>

<details><summary>2. Which model for: product catalog (per-department attributes) + order placement? Defend the split.</summary>
Catalog as documents (department-specific attribute blobs, whole-aggregate reads); orders relational (cross-entity integrity, financial reporting, joins to users/payments). Polyglot with a reason.</details>

<details><summary>3. What does Redis's single-threaded command execution buy you?</summary>
Per-command atomicity without locks (INCR, SETNX semantics) — which is why rate limiters and locks are natural there. Multi-key atomicity requires Lua/Lua-script equivalents.</details>

<details><summary>4. Your boss says "add DynamoDB so checkout survives Black Friday." First question?</summary>
"What breaks today, measured?" — if checkout's bottleneck is Postgres contention, a second datastore adds latency hops and consistency hazards while the hot row stays hot. Diagnose before distributing.</details>

## Assignment

→ [assignment.md](assignment.md)
