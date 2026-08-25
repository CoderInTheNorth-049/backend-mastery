# Topic: Redis caching — deliberate speed

> **Goal:** Implement cache-aside correctly — including the parts everyone skips: negative caching, invalidation after writes, hit/miss observability, and thundering-herd protection. Unit-tested with fakes, proven against real Redis.

## Beginner-friendly picks

- 🎥 YouTube search: **“Redis explained in 100 seconds”** then **“cache aside pattern”** — orientation pair
- 🧪 [Redis University archives](https://www.redis.io/learn/university) — free structured courses

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Why caches exist here | read-heavy paths, expensive joins, external APIs — and what NOT to cache | [Redis docs — using/evaluating](https://redis.io/docs/latest/develop/use/) |
| Cache-aside pattern | app owns reads AND writes; DB is truth; cache is disposable | [redis.io learn — cache-aside](https://redis.io/learn/howtos/antipatterns/caching-patterns) |
| Write-through vs write-back vs aside | consistency vs latency vs loss trade-off table | same series |
| TTLs & invalidation | expire as safety net, DEL after commit as correctness; versioned keys for shape changes | [redis.io — EXPIRE](https://redis.io/docs/latest/commands/expire/) |
| Cache stampede | hot key expiring under load = synchronized miss avalanche; single-flight/locks/early-refresh cures | your assignment |
| Negative caching | caching "not found" stops attackers & repeated lookups from punching through | assignment contract |
| Key design | namespaces (`user:{id}`), TTL tiers, why you never cache WITHOUT a shape version plan | [redis.io learn data modeling](https://redis.io/learn/howtos/data-modeling) |

## Keep in mind

- **The cache lies sometimes — by design.** Anything reading through it must tolerate staleness ≤ TTL. Auth checks? Usually wrong place to cache casually.
- **Invalidate AFTER the database commit**, not before — otherwise a concurrent reader repopulates stale data between your DEL and COMMIT.
- **Serialize with an explicit format** (JSON today); version keys when shapes change (`user:v2:{id}`) instead of debugging half-migrated caches at midnight.
- **Caching nulls** is penetration protection, not pessimism — otherwise every 404 becomes a DB hit forever.
- **Single-flight is process-local.** Multi-instance deployments need distributed coordination (short SET NX lock or probabilistic refresh) — know where your fix stops working.

## Self-check quiz

<details><summary>1. Write-through guarantees cache freshness. So why does cache-aside dominate in practice?</summary>
Write-through pays sync-write latency on EVERY write incl. cold keys nobody will read, plus cache-unavailable handling complexity. Aside keeps writes lean and treats cache as disposable — failures degrade gracefully.</details>

<details><summary>2. Your service restarts and Redis is fine, but suddenly every request misses. What happened?</summary>
Nothing — likely key-shape/version bump, namespace change, or different serialization. Caches are coupled to CODE VERSIONS more than people admit; plan versioned keys.</details>

<details><summary>3. p99 spikes exactly when a popular entity's TTL lapses. Diagnose + two fixes.</summary>
Stampede: many workers miss simultaneously, all hammer the DB. Fix A: single-flight/distributed lock so ONE reloads; Fix B: jittered TTLs / probabilistic early refresh so expirations spread out.</details>

<details><summary>4. Where should the DEL go relative to the DB write, and why?</summary>
After the successful COMMIT. Before = concurrent reader misses, loads OLD committed data, re-caches staleness that outlives your invalidation.</details>

## Assignment

[assignment.md](assignment.md) — build `CachedUserRepo` (hits/misses stats, negative caching, invalidation-on-update) and `createSingleFlight`, unit-tested against a fake; then prove the whole thing against real Redis via the provided adapter.
