# RFC-001: Adopt Kafka as the webhook delivery backbone

**Author:** me · **Status:** draft · **Reviewers:** @platform

## 1. Summary
Migrate flagship delivery from BullMQ/Redis to Kafka behind our existing queue interface to unlock replay and multi-team fan-out at current growth.

## 2. Context
Ingest peaked at 1,800 jobs/sec; Redis memory +40% MoM. Two teams need the same events (audit, billing) — BullMQ lacks native fan-out. Enterprise asks: replay after consumer bugs. Team: 4 engineers, one with Kafka ops experience.

## 3. Goals
- Replayable event history per endpoint (7d)
- Fan-out to N internal consumers without ingest changes
Non-goals: multi-region Kafka; replacing Postgres outbox for order flows.

## 4. Options considered

### Option A — Stay on BullMQ + tuning
Pros: zero migration risk; DLQ/redrive already proven. Cons: no replay; fan-out = app-side fan-out code; memory trend unbounded.

### Option B — do nothing
Same as A without tuning; growth curve makes this a Q+1 incident.

### Option C — Redis Streams adapter
Pros: replay-ish (MAXLEN), reuses Redis ops. Cons: weaker ecosystem tooling for consumer groups rebalancing at our scale; still single-store coupling.

### Option D — Kafka migration
Pros: replay via offsets, native fan-out, lag dashboards. Cons: new ops surface (brokers/partitions), team learning curve.

## 5. Decision
**Adopt Option D behind the existing ResilientQueue interface, strangler-style over four shippable steps.**

## 6. Consequences
Easier: fan-out, replay-driven recovery, per-endpoint ordering via key partitioning.
Harder: broker ops (3 brokers min), lag dashboards become SLO-relevant, redrive semantics shift from DLQ-list to offset reset + inbox dedupe.

## 7. Rollout plan
1. Shadow-produce every job to Kafka while BullMQ stays source of truth (compare counts).
2. Dual-consume: Kafka consumers run in dry-run, diffing side effects against prod logs.
3. Cut reads per-tenant behind a flag; BullMQ pauses per tenant.
4. Decommission BullMQ paths after 14 clean days.

Each step is independently revertible (flag off = BullMQ resumes).

## 8. Open questions
@infra: managed MSK vs self-hosted Strimzi preference? @billing: exact consumer-group naming convention?
