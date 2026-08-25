# Topic: Database scaling — sharding without tears

> **Goal:** Understand why "mod N" breaks hearts, then build the fix: a working consistent-hash ring with virtual nodes — the algorithm behind Cassandra, DynamoDB, Discord's namespaces, and your future cache tiers.

## Beginner-friendly picks

- 🎥 YouTube search: **“consistent hashing explained”** — several ring animations; re-watch AFTER your implementation passes
- 📝 [Discord — scaling with Elixir + consistent hashing](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users) — production war story

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Replication topologies | primary-replica failover, multi-primary conflicts, sync vs async lag as a product decision | [Primer — replication](https://github.com/donnemartin/system-design-primer#replication) |
| Sharding strategies | range (hot ranges!), hash (loses range queries), directory (extra lookup) | [Primer — sharding](https://github.com/donnemartin/system-design-primer#sharding) |
| The re-sharding cliff | mod-N: adding one node remaps ~ALL keys; consistent hashing moves ~1/N | your assignment |
| Virtual nodes | smooths distribution AND rebalances; also enables heterogeneous capacity weighting | [karanpratapsingh — consistent hashing](https://github.com/karanpratapsingh/system-design#consistent-hashing) |
| Hot keys / celebrities | one shard on fire; fixes: key salting, replica reads, local caching of the hot entity | [Discord's consistent hashing in production](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users) |
| Cross-shard queries | scatter-gather costs; secondary indexes per shard vs global ones; when to denormalize | Primer sections above |

## Keep in mind

- **Shard only when you must**: replication ≠ sharding. Reads scale with replicas; writes/dataset need shards. Premature sharding is the #1 self-inflicted wound in this space.
- **Pick a shard key you never need to change.** user-id usually beats timestamp (range hot spots) — unless time-range queries dominate, then think twice.
- **Consistent hashing trades exact balance for cheap membership changes.** Virtual nodes buy most of the balance back.
- **Rebalancing is a data-movement project**, not a config flip: dual-writes, backfill, verification, cutover — even WITH a ring.
- Every distributed store you'll touch later (Kafka partitions, Dynamo pks, Cassandra tokens) is this topic wearing different clothes.

## Self-check quiz

<details><summary>1. With mod-N routing, adding node #4 to a 3-node cache cluster invalidates what fraction of keys?</summary>
~all of them (key→shard changes whenever N changes). Consistent hashing: ~1/4 move. That delta IS the argument.</details>

<details><summary>2. Why do virtual nodes improve BALANCE but not eliminate skew entirely?</summary>
More ring points → law-of-large-numbers smoothing of hash noise; tail imbalance persists because hashing is random, not perfect bin-packing. 100–500 vnodes typically lands shares within a few % of uniform.</details>

<details><summary>3. Celebrity problem: one user id holds 5% of read traffic post-sharding. Three mitigations, ranked by effort.</summary>
(1) local/in-proc + Redis cache of that entity; (2) salted shard key copies (id#0..id#N spread replicas); (3) dedicated hot-entity service/shard. Effort ascends.</details>

<details><summary>4. When does RANGE sharding beat hash despite hot-range risk?</summary>
Time-series with TTL'd old data and queries bounded by time windows — ranges keep queries single-shard and drops become range deletes. Hot spot = "always write to newest" which is manageable via split points.</details>

## Assignment

[assignment.md](assignment.md) — implement `HashRing` (add/remove, lookups, ordered replication lists) over a provided FNV-1a hash — and discover why the classic djb2 choice fails catastrophically on sequential keys. Distribution and movement fractions are graded against real measured behavior of YOUR ring.
