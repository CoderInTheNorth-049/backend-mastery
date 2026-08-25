# Build guide — Capstone 2: Movie Booking System

> **Prerequisites:** phase 03 (esp. transactions/concurrency) · **Est:** 30–40 hours
> The concurrency-integrity capstone: seats are finite, users race, money is involved.

## Core domain model

```
Movie 1─n Showtime 1─n Seat(hold)      User 1─n Booking n─n Seats(via BookingSeat)
```

- `POST /showtimes/:id/seats/lock {seatIds[]}` → holds seats for 5 minutes (TTL)
- `POST /bookings` with `Idempotency-Key` header → converts held seats to a confirmed booking atomically
- `POST /payments/:bookingId/simulate` → flaky-by-config payment service exercising retries

## Milestones

### M1 — Schema & state machine (1 day)

Tables: movies, showtimes, seats, bookings, booking_seats, payments.
Booking states: `pending → confirmed → cancelled | expired` — enforced in code AND a DB CHECK constraint.

**Accept:** ERD committed; illegal transitions throw domain errors with tests.

### M2 — Seat locking, two ways (3 days)

Implement seat holds behind a strategy flag:
- **Pessimistic:** `SELECT … FOR UPDATE` on seat rows inside the hold transaction
- **Optimistic:** version column + conditional UPDATE + retry

**Accept:** concurrency spec fires N parallel lockers on one seat → exactly one wins, every run. Both strategies pass the same suite.

### M3 — Idempotent booking confirmation (2–3 days)

- Confirm consumes the hold and creates the booking in ONE transaction
- Same idempotency-key replay returns the ORIGINAL response (store key→response)
- Concurrent same-key requests: loser gets 409 + Location to winner

**Accept:** double-click test proves one booking; replay proves no duplicate charge.

### M4 — Payment simulation & expiry (2 days)

- Flaky payment service (config: failure rate, latency) — retry with backoff, idempotency key on payment intents
- Expired holds released by a sweep job AND lazily on read (implement both, benchmark)
- Failed payment → booking cancelled, seats returned atomically

**Accept:** forced-failure drill ends in clean cancellation with seats re-bookable.

## M5 — Load & chaos proof (2 days)

- k6 scenario hammering ONE showtime's inventory at realistic contention
- Chaos drill: kill the app mid-confirm → no orphaned pending bookings after sweep
- Commit reports to `reports/`

---

## Definition of done

- [ ] Concurrency suite green: zero double-sells across both strategies
- [ ] Anomaly write-up in `docs/anomalies.md`: which isolation level allowed what, and your fix
- [ ] Coverage ≥70% including lock paths; state-machine diagram + ERD committed
- [ ] Resume bullet survives follow-ups:
  *"Booking engine eliminating oversell via SELECT FOR UPDATE + optimistic-version strategies behind a flag; idempotent confirms with outbox-style event capture; k6 contention report."*
