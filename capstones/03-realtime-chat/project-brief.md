# Capstone 3 — Realtime Chat & Notification Service

> **When:** after Phase 06 (needs queues) · **Est:** ~30–40 hours · **Full build guide ships with phase 06.**

Realtime is where backends prove they can hold state and push bytes responsibly.

## Core domain

- Workspaces → channels → messages; presence; unread counts
- WebSocket gateway (Socket.IO or ws) with JWT auth handshake
- Message persistence via write-behind: WS ack ≠ durable until queue consumer confirms

## Senior-level meat

| Challenge | Technique |
|---|---|
| Fan-out on message | Queue job per channel member batch; delivery worker pool (your phase 01 pool!) |
| Unread counts at scale | Redis counters + periodic reconciliation vs event-sourced projections — implement one, document the other |
| Presence correctness | Heartbeat TTLs, zombie-connection cleanup, multi-tab handling |
| Reconnect integrity | Last-event-id replay window from a ring buffer/stream |

## Definition of done

- [ ] Two browser tabs demo + scripted WS client test suite (vitest ws clients)
- [ ] Backpressure story: slow consumer can't OOM the hub
- [ ] Latency histogram p50/p95 committed from load run with 500 concurrent sockets
- [ ] Sequence diagram of message lifecycle in README

**Resume bullet shape:** *"Realtime chat hub (WS/Redis/Kafka): queue-fanned delivery, TTL presence, reconnect replay; sustained 500 concurrent sockets at p95 <80ms."*
