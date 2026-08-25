# Assignment — RFC: “Adopt Kafka for the webhook platform’s delivery backbone”

**Deliverable:** `rfc-001-kafka-backbone.md` in this folder, using [rfc-template.md](rfc-template.md)
**Graded by:** self-scored /20 checklist (in template) + structure spot-check via [rfc.spec.ts](rfc.spec.ts)

## Scenario (facts you must incorporate)

Your webhook platform (flagship #1) currently delivers through BullMQ on Redis. Growth facts:

- Ingest peaked at **1,800 jobs/sec**; Redis memory grew 40% month-over-month
- Enterprise customers ask for **event replay** after consumer-side bugs
- Two new teams want the same events (audit mirror, billing tap) — BullMQ has no native fan-out
- The team is 4 engineers with Kafka experience on exactly ONE resume

## Required content decisions

1. Options MUST include: stay-on-BullMQ (+tuning), Redis-Streams adapter, Kafka migration.
2. If proposing Kafka: name partition-key strategy for per-endpoint ordering, consumer-group layout, and what happens to your DLQ/redrive design.
3. Rollout: strangler steps from M5 architecture — shadow-produce first, then dual-consume compare, then cut.
4. Consequences must include an ops-cost sentence (brokers, partitions, lag dashboards).

## Structure spot-check (spec)

The spec verifies your file: uses all eight template sections in order; contains ≥3 `### Option` headings; includes the strings "Kafka", "BullMQ", "replay"; Decision section exists and is ≤2 sentences; Open questions section present. Content quality remains rubric-scored by you (/20 → commit at ≥16).
