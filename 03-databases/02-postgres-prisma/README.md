# Topic: PostgreSQL + Prisma — repositories, transactions & rollbacks

> **Goal:** Own the data-access layer patterns real services are built from: interactive transactions, upserts, guarded state transitions, aggregate reads — and *prove* rollback behavior with injected failures instead of trusting marketing slides.

## Beginner-friendly picks

- 🎥 [Prisma (YouTube)](https://www.youtube.com/@PrismaData) — official short how-tos incl. transactions
- 📝 [Prisma blog](https://www.prisma.io/blog) — pattern-focused posts (outbox, batching, N+1)

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Schema-first workflow | models → db push vs migrate (when each is right); why one schema per service | [Prisma — schemas](https://www.prisma.io/docs/orm/prisma-schema) · [migrate vs push](https://www.prisma.io/docs/orm/prisma-migrate/production-techniques/db-push) |
| Relations in practice | explicit m-n join tables vs implicit; include vs select; `_count` aggregations | [Prisma — relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations) |
| CRUD + upsert | findUnique/updateMany semantics; upsert races & unique constraints backing them | [Prisma — reference](https://www.prisma.io/docs/orm/reference/prisma-client-reference) |
| Interactive transactions | `$transaction(async (tx) => …)`; isolation default; what does NOT roll back (external side effects!) | [Prisma — transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) |
| Guarded transitions | publish/unpublish style flips belong behind Result-typed functions, not boolean flags everywhere | your phase-01 `Result` pattern, reused here |
| N+1 queries | loop of `post.comments` fetches; include/batching fixes; how to DETECT (log/query events, tracing) | [Prisma — query logging](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging) |

## Keep in mind

- **Transactions protect the database, not the world.** An HTTP call inside `$transaction` still fires if the tx later rolls back — keep external effects OUT or compensate deliberately (sagas arrive in phase 06).
- **Upserts lean on unique constraints** — without a backing UNIQUE index, "upsert" is fiction under concurrency.
- **updateMany returns counts, not entities** — perfect for bulk moves; wrong tool when you need rows back.
- **Sequenced writes ≠ atomicity.** Five awaited creates outside a transaction are five opportunities to strand half-state. This topic makes you break it on purpose (`__failAt` seams) so you never forget.
- **Prisma 7 note:** this repo uses the modern driver-adapter setup (`@prisma/adapter-pg`) — connection strings live at construction, not in schema files. You'll meet this pattern in every current NestJS codebase.

## Self-check quiz

<details><summary>1. Why did the tag created inside a rolled-back transaction vanish, while a console.log printed earlier?</summary>
DB writes obey tx atomicity; process-side effects (logs, queues, emails) don't participate. Rule: inside tx boundaries, touch ONLY the database.</details>

<details><summary>2. Two requests upsert tag "kafka" simultaneously without a unique constraint. Outcome?</summary>
Both miss on SELECT, both INSERT → duplicate rows. With @unique, one insert fails w/ P2002 → retry path. Constraints turn races into handled errors.</details>

<details><summary>3. What's the difference between db push and migrate deploy?</summary>
push diffs schema↔db directly (prototyping, tests); migrate replays versioned SQL history (prod audit trails, team sync). Knowing when each is appropriate IS the answer.</details>

<details><summary>4. Your list endpoint issues 1+N queries (posts, then comments per post). Two fixes, ranked.</summary>
(1) include: { comments: true } — single roundtrip, right shape; (2) batch second query WHERE postId IN (...) and stitch in memory — better when comments are huge/paginated.</details>

## Assignment

[assignment.md](assignment.md) — build the blog repository layer against REAL PostgreSQL: transactional tag fan-out with proven rollback, Result-guarded publishing, aggregate listing, and bulk comment moves.
