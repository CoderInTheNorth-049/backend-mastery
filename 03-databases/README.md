# Phase 03 — Databases (~5 weeks)

**Outcome:** think in sets, model domains that survive contact with reality, make queries fast *with evidence*, transact safely under concurrency, cache hot paths deliberately — all against REAL PostgreSQL and Redis running locally.

## Beginner-friendly picks

- 🧪 [SQLBolt](https://sqlbolt.com/) — interactive SELECT/JOIN lessons; do lessons 1–6 BEFORE topic 01
- 🧪 [PGExercises](https://pgexercises.com/) — follow-up practice against a real dataset

## How this phase runs (important)

Your tests talk to genuine services, not mocks:

| Backend | When it's used |
|---|---|
| `TEST_DATABASE_URL` / `TEST_REDIS_URL` env | you point at your own local services |
| Docker via Testcontainers | default when Docker is installed (CI included) |
| Embedded binaries | automatic fallback — no Docker, no root needed |

Provisioning happens in [`vitest.global-setup.ts`](../vitest.global-setup.ts): schema is pushed from Prisma models, deterministic seed data loads, and specs that need servers skip cleanly if none can start. First embedded run initializes once (~10s); Docker path pulls images on first use.

## Topics

| Folder | Est. | You build |
|---|---|---|
| [01-sql-fundamentals](01-sql-fundamentals/) | 6 days | Seven graded queries over a seeded library DB: joins → aggregation → windows |
| [02-postgres-prisma](02-postgres-prisma/) | 6 days | Transactional repository layer: tag fan-outs, rollbacks, N+1 hunting |
| [03-indexes-performance](03-indexes-performance/) | 4 days | Turn `Seq Scan`s into index scans — verified by reading EXPLAIN output |
| [04-transactions-concurrency](04-transactions-concurrency/) | 6 days | Seat reservation that provably cannot oversell: pessimistic AND optimistic |
| [05-redis-caching](05-redis-caching/) | 4 days | Cache-aside repo with hit/miss stats + stampede guard (unit + real-Redis integration) |
| [06-nosql-context](06-nosql-context/) *(reading)* | 1 day | When documents genuinely beat relations |

## Anchor free resources

- [Use The Index, Luke](https://use-the-index-luke.com/) · [PostgreSQL Tutorial](https://www.postgresqltutorial.com/) · [official PG docs](https://www.postgresql.org/docs/current/tutorial.html)
- [Prisma docs](https://www.prisma.io/docs) · [pgvector comes later](https://github.com/pgvector/pgvector) (phase 10)
- [Redis docs](https://redis.io/docs/latest/) · [redis.io learn](https://redis.io/learn/)
- [Postgres EXPLAIN visualizer](https://explain.dalibo.com/) (paste plans from assignments here)

## Done means

- [ ] All five coded topics green (`pnpm test:solutions` proves keys too)
- [ ] You can explain your seat-reservation choice to a skeptic in 5 minutes
- [ ] `analysis.md` in topic 03 shows you READ an EXPLAIN plan, not guessed
