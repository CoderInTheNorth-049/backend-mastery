# Flagship 1 — Milestone 5: Kafka swap behind the queue interface

> **Unlocked by:** phase 06 · **Est:** 14–18 hours · The scale-path proof.

## Goal

Prove your M2 abstraction was worth it: swap BullMQ for Kafka (kafkajs) WITHOUT touching delivery-worker business logic. Partition strategy gives per-endpoint ordering.

## Work items

1. **Topic design:** `webhook.deliver` keyed by `endpointId` ⇒ per-endpoint ordering; 12 partitions default
2. **KafkaQueue adapter** implementing the same interface BullMQ used (add/stats/deadLetters via a compacted `webhook.dead` topic or companion queue)
3. **Consumer group:** delivery workers as one group; partition assignment = natural parallelism; lag metric exported
4. **Ordering test:** 50 events for one endpoint, shuffled ingest → delivered in order
5. **Ops doc (`docs/kafka-runbook.md`):** broker counts, replication factor choice, what consumer-lag alerts mean, how to reset a group safely

## Accept

- [ ] Same integration suites pass with the Kafka adapter selected by env var
- [ ] Per-endpoint ordering proven under concurrent producers
- [ ] Consumer rebalance (kill/restore a worker) causes zero lost deliveries

## Resume line fed
*"Swapped queue backends behind one interface: BullMQ→Kafka with per-endpoint partition ordering and rebalance-safe consumer groups."*
