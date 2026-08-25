# Topic: Message brokers 101 — queues, streams, and the exactly-once myth

> **Goal:** Choose a messaging shape deliberately, and know precisely which failure each delivery guarantee survives. This topic is written-only: the vocabulary here is load-bearing for everything you build after it.

## Beginner-friendly picks

- 🎥 [RabbitMQ tutorial videos](https://www.rabbitmq.com/getstarted.html) — each written tutorial links its video twin
- 📝 [Kafka intro](https://kafka.apache.org/intro) is short — read twice, quiz once

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Queue vs pub/sub vs stream | point-to-point work distribution vs broadcast vs replayable ordered log — who reads a message AFTER it's consumed? | [RabbitMQ tutorial 1-3](https://www.rabbitmq.com/getstarted.html) · [Kafka — intro](https://kafka.apache.org/intro) |
| Delivery semantics | at-most-once (fire & forget), at-least-once (retry + consumer dedupe), exactly-once (end-to-end pipeline property, not a checkbox) | [Kafka FAQ — semantics](https://kafka.apache.org/documentation/#semantics) |
| Push vs pull | broker pushes (RabbitMQ) vs consumers poll (Kafka); flow control implications | both docs above |
| Durability & persistence | acks before vs after fsync; what "durable queue" actually promises | RabbitMQ reliability guide |
| Backpressure | what happens when consumers are slower than producers — in EACH paradigm | phase-01 streams recap |
| Poison messages | the one payload that crashes every retry — where it ends up and why DLQs exist | your topic-02 assignment |

## Keep in mind

- **Exactly-once is a marketing shortcut** for "at-least-once + idempotent processing." Anyone promising otherwise is describing a narrow, configured pipeline — ask about the consumer side.
- **At-least-once means duplicates WILL happen** — design consumers around idempotency keys from day one (topic 05 makes you build it).
- **Ordering is per-partition/per-queue only**, never global — and it breaks silently the moment you scale consumers.
- **The broker is not your database**, but a good stream (Kafka) can be your *history* — replayability changes recovery playbooks entirely.
- Dead-letter queues need their own ops story: alerting, inspection tooling, redrive procedure. A DLQ nobody watches is a bit bucket with extra steps.

## Self-check quiz

<details><summary>1. Payment service publishes "charge.succeeded"; consumer crashes AFTER side effects but BEFORE ack. What happens under at-least-once, and what must the consumer do?</summary>
Redelivery on reconnect ⇒ duplicate side effects. Consumer must dedupe by event id (inbox table / idempotent operation) — the ack gap is WHY exactly-once needs end-to-end design.</details>

<details><summary>2. Why does Kafka call itself a distributed commit log rather than a message queue?</summary>
Messages are appended immutably and RETAINED after consumption — consumers track offsets and can rewind/replay. Queues delete on ack; logs keep history as the product.</details>

<details><summary>3. Your worker takes 30s/job; prefetch is unlimited. What breaks?</summary>
Broker shovels unbounded unacked deliveries to one consumer → memory blowup + redelivery storms on crash. Cap prefetch to concurrency × safety factor.</details>

<details><summary>4. Where do poison messages come from and what's the correct lifecycle?</summary>
Schema drift/corrupt payloads that fail every attempt. Lifecycle: bounded attempts → DLQ → alert → inspect/fix → redrive (or discard with audit). Never infinite-retry into oblivion.</details>

## Assignment — written deliverable `delivery-semantics.md`

For six producer→consumer flows, fill the matrix: chosen semantics · mechanism (acks/retries/dedupe) · failure tolerated · residual risk (/18):

1. Order-created → inventory reservation
2. Password-reset email send
3. Analytics click events (lossy OK)
4. Payment webhooks INBOUND to your platform
5. Cache invalidation broadcasts
6. Audit log entries to immutable storage

Plus one paragraph: "where would EXACTLY-once actually be achievable end-to-end in our stack, and what does it cost?"

### Rubric

| Criterion | Points |
|---|---|
| Semantics match blast radius of each duplicate/loss | /6 |
| Mechanisms named concretely (ack modes, dedupe keys, TTLs) | /5 |
| Residual risks stated honestly (what STILL goes wrong) | /4 |
| Exactly-once paragraph names pipeline boundaries, not flags | /3 |
