# Build guide — Capstone 3: Realtime Chat & Notifications

> **Prerequisites:** phase 06 (queues) · **Est:** 30–40 hours · **Full guide unlocked after phase 06.**

## Core domain

- Workspaces → channels → messages; presence; unread counts
- WebSocket gateway (ws or Socket.IO) with JWT auth on the handshake
- Message persistence is WRITE-BEHIND: WS ack ≠ durable until the queue consumer confirms

## Milestones

### M1 — Gateway & auth (2 days)

WS server with JWT verification during upgrade handshake; connection registry keyed by userId (multi-tab aware: one user, many sockets).

**Accept:** scripted ws-client test suite connects with valid/invalid tokens; invalid → close 4401.

### M2 — Durable message flow (3 days)

1. Client sends message → server persists via queue job (write-behind), ACKs optimistically with a client-generated messageId
2. Queue consumer confirms durability → emits `message:delivered` to sender + `message:new` to channel members
3. Reconnect replay: `Last-Event-Id` style cursor serves missed messages from a bounded ring buffer/stream

**Accept:** kill the worker mid-flow → client sees retry/dedup, no lost or duplicated messages in the log after recovery.

### M3 — Fan-out & unread counts (3 days)

- On durability: fan-out delivery jobs per channel member batch (your phase-01 pool!)
- Unread counters in Redis (`INCR` per member) reconciled nightly against source of truth
- Presence via heartbeat TTLs; zombie sockets reaped

**Accept:** fan-out to a 50-member channel completes <100ms p95 locally; presence flips to offline within TTL of disconnect.

### M4 — Backpressure & load proof (2 days)

- Slow-consumer protection: per-socket send queue with high-water mark → drop-and-resync via replay cursor instead of OOM
- k6/ws-load scenario: 500 concurrent sockets, sustained send rate
- Commit latency histogram (p50/p95) and memory profile

---

## Definition of done

- [ ] Two-browser demo + automated ws test suite green
- [ ] Backpressure story documented: what happens when a consumer can't keep up (numbers, not vibes)
- [ ] Sequence diagram of message lifecycle committed
- [ ] Load report: 500 sockets sustained, p95 <80ms local, zero unbounded growth

**Resume bullet shape:**
*"Realtime chat hub (WS/Redis/BullMQ): write-behind durability with dedupe keys, TTL presence, reconnect replay windows; 500 concurrent sockets at p95 <80ms in committed load tests."*
