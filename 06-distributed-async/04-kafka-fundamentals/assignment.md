# Assignment — Mini Kafka: an in-memory partitioned log

## The problem you're solving
“Kafka guarantees ordering” — per PARTITION, and only if your keys route there. Teams learn this in production. You'll build a tiny in-memory log with real Kafka semantics: key-hash routing, null-key round-robin, per-partition monotonic offsets, and windowed consumption — so offsets stop being hand-waving.

## Your tasks
Implement in [src/minilog.ts](src/minilog.ts) (`fnv1a` is PROVIDED — same sequential-clustering lesson as the hash ring):

1. `new PartitionLog(partitions)` — RangeError on non-positive counts.
2. `produce(key, value)` → keyed messages hash to `fnv1a(key) % partitions` (same key ⇒ same partition forever); `null` keys round-robin starting at partition 0; returns `{partition, offset}` with per-partition offsets from 0.
3. `consume(partition, fromOffset, max)` → entries with `offset >= fromOffset`, oldest first, capped at max; out-of-range partitions throw RangeError.
4. `latestOffset(partition)` → last offset or `-1` when empty; `totalMessages()` sums everything.

## Definition of done
- [ ] Spec green: 20 keyed messages all land on one partition; null-keys cycle 0,1,2,0…; two consumers read independently from different cursors
- [ ] Offsets restart per partition (b's first message is offset 0 even after a's exist)

## Hints (open only when stuck)

<details><summary>Consume slicing</summary>
<code>log.slice(fromOffset, fromOffset + max)</code> handles tail-shortage and past-end empties for free.</details>

## Going further (optional)
Add consumer-group simulation: `createGroup(n)` assigning partitions round-robin across members and rebalancing when membership changes.