# Topic: Kafka fundamentals — partitions, offsets & consumer groups

> **Goal:** Build a tiny in-memory partition log with real Kafka semantics: key→partition routing, per-partition monotonic offsets, windowed consumption. After implementing it, "consumer group rebalance" stops being hand-waving.

## Beginner-friendly picks

- 🎥 [Confluent — Kafka 101](https://developer.confluent.io/courses/kafka/intro/) — video-first fundamentals
- 📝 [Kafka — the design doc](https://kafka.apache.org/documentation/#design) sections referenced in README map 1:1 to your mini-log

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Topics & partitions | partition = append-only ordered log; parallelism unit; ORDERING IS PER-PARTITION ONLY | [Kafka — design](https://kafka.apache.org/documentation/#design) |
| Keys → partitions | same key ⇒ same partition (hash routing); null keys ⇒ round-robin/sticky | [Confluent — partitions](https://developer.confluent.io/courses/apache-kafka/partitions/) |
| Offsets & consumers | consumers track THEIR cursor per partition; seek/rewind is just moving the number | [Confluent — offsets](https://developer.confluent.io/courses/apache-kafka/consumers/) |
| Consumer groups | group = competing workers splitting partitions; rebalancing on membership change; one partition ⇒ max one active consumer per GROUP | [Kafka docs — groups](https://kafka.apache.org/documentation/#consumer-groups) |
| Retention & compaction | time/size retention deletes OLD segments; compaction keeps LATEST per key — two different lifetimes | [Kafka — compaction](https://kafka.apache.org/documentation/#compaction) |
| Delivery semantics recap | at-least-once default (commit AFTER processing); exactly-once = transactions/idempotent producers within pipeline bounds | Kafka FAQ |

## Keep in mind

- **Ordering you didn't shard for is ordering you don't have.** If events for one entity must be ordered, route by THAT entity's key — not by whatever key was convenient.
- **Offsets are per-partition counters**, not global ids. Two partitions can both contain offset 5.
- **Rebalance pauses are real**: adding a consumer revokes partitions fleet-wide (sticky/cooperative strategies soften this). Bursty membership = throughput sawtooth.
- **Commit timing IS your delivery semantic**: commit-before-process = at-most-once; process-before-commit = at-least-once + dedupe.
- Real brokers add segment files, page-cache reads, ISR replication — your mini-log models the SEMANTICS, which is what interviews probe.

## Self-check quiz

<details><summary>1. Producer sends events keyed userId=7 rapidly. Are they guaranteed ordered to a consumer?</summary>
Same key ⇒ same partition ⇒ ordered WITHIN that partition. Ordered delivery additionally requires ONE consumer in the group holding that partition and committing after processing.</details>

<details><summary>2. Group has 4 consumers, topic has 3 partitions. What happens?</summary>
Three get one partition each; the fourth idles (no partition assignment). Consumers beyond partition count are standby capacity.</details>

<details><summary>3. Consumer processed offset 10 but crashed before committing 11. Restart behavior under at-least-once?</summary>
Resumes from last COMMITTED offset (≤10) ⇒ reprocesses already-handled messages. Idempotent handlers or transactional consume-transform-produce required.</details>

<details><summary>4. Log compaction vs retention: which keeps the latest "user-7 profile" forever while deleting old clicks?</summary>
Compacted topic for profile state (latest per key retained); retention-deleted topic for clicks (time-based). Two topics because two lifetimes.</details>

## Assignment

[assignment.md](assignment.md) — implement `PartitionLog`: produce with key/null-key routing, per-partition offsets, and `consume(partition, fromOffset, max)` windows. Deterministic, dependency-free, brutally instructive.
