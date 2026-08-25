# Capstone 2 — Movie Booking System

> **When:** after Phase 03 · **Est:** ~30–40 hours · **Full build guide ships with phase 03 content.**

The concurrency-integrity capstone: seats are finite, users race, money is involved.

## Core domain

- Movies → showtimes → auditoriums (seats) → bookings; users
- `POST /showtimes/:id/seats/lock` → hold seats for 5 min (TTL)
- `POST /bookings` with idempotency key → confirm held seats atomically
- Payment simulation service (flaky by config switch!) exercising retries/sagas-lite

## The senior-level meat (why interviewers love this)

| Challenge | Technique you'll implement |
|---|---|
| Two users grab seat 7A simultaneously | DB row locks (`SELECT ... FOR UPDATE`) OR optimistic versioning — implement BOTH behind a flag, benchmark |
| Held seats expiring | TTL-based release job vs lazy expiry-on-read; document trade-offs |
| "Confirm" crashing mid-way | Transactional outbox preview; booking state machine (pending→confirmed→cancelled) |
| Oversell under load | Isolation level experiment lab: reproduce anomaly at READ COMMITTED, fix at correct level |

## Definition of done

- [ ] Concurrency test suite: N parallel bookers, zero double-sells, deterministic assertions
- [ ] Anomaly reproduction write-up in `docs/anomalies.md`
- [ ] ≥70% coverage incl. the lock paths; k6 scenario hammering one showtime
- [ ] State-machine diagram + ERD committed

**Resume bullet shape:** *"Booking engine eliminating oversell via SELECT FOR UPDATE + outbox pattern; concurrency test suite proves correctness under 200 rps contention."*
