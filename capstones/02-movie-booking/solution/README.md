# Capstone 2 Solution - Movie Booking System (answer key)

Reference implementation of the concurrency-integrity capstone: finite seats,
racing users, money involved. Runs its whole suite **offline** against
in-memory adapters; a real PostgreSQL adapter sits behind `DATABASE_URL`.

## What this is (and honest simplifications)

This is the teaching "answer key" for [the build guide](../build-guide.md).
It deliberately keeps the domain heart - transactional seat integrity,
idempotent confirms, TTL expiry - while simplifying edges so everything runs
with zero external services:

- **Payment gateway**: deterministic fake (card `4242...` approves, all else
  declines). No flakiness knobs, no retry/backoff loop from M4's flaky-PSP
  exercise; the *decline* path (402 + atomic seat release + re-bookable) is
  fully proven by tests.
- **Charge happens inside the tx closure.** In production you would call the
  PSP *outside* the row lock and reconcile via outbox/saga; here holding the
  lock across the (instant, local) charge is what makes decline-and-release
  observably atomic in both adapters.
- **M5 (k6/chaos drills)** is represented by the deterministic concurrency
  suite instead of load reports; no `reports/` artifacts ship with the answer
  key.
- **Optimistic locking** is sketched as commented SQL in the migration rather
  than a second runtime strategy behind a flag.
- One process, no message broker, no auth.

## Quickstart

```bash
pnpm install
pnpm test          # 31 tests green, zero infrastructure
pnpm start         # serves http://localhost:3002 with seeded data
```

Optional real Postgres:

```bash
docker compose up -d postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/movie_booking \
  pnpm test:pg     # runs test/booking.pg.int.ts against real row locks
DATABASE_URL=postgres://postgres:postgres@localhost:5432/movie_booking pnpm start
```

Copy `.env.example` to `.env` to tweak `PORT`, `HOLD_TTL_MS`,
`SWEEP_INTERVAL_MS`, `LOG_LEVEL`, `DATABASE_URL`.

## Milestone map

| Milestone | Where it lives | Proof |
|---|---|---|
| M1 schema & state machine | `db/migrations/0001_init.sql` (CHECK constraints), `src/domain/errors.ts` guards | `test/domain.spec.ts` (illegal states rejected) |
| M2 seat locking two ways | memory adapter models `FOR UPDATE` via serialized promise chain (`src/infra/memory-booking-store.ts`); pg adapter does real `SELECT ... FOR UPDATE` + unique-index backstop (`src/infra/pg-booking-store.ts`) | `test/concurrency.spec.ts`, `test/booking.pg.int.ts` |
| M3 idempotent confirmation | replay lookup before any writes, inside the same tx (`src/domain/booking-service.ts`) | replay/double-click tests in both spec files |
| M4 payment & expiry | decline releases seats atomically; sweep job + lazy expiry-on-read/write (`src/domain/sweep-service.ts`, adapters) | declined-card, expired-confirm, sweep tests |
| M5 load & chaos | deterministic N-racer suites stand in for k6 (see simplifications above) | `ten racers...`, `20 parallel holds...` tests |

## Architecture

```mermaid
graph TD
    subgraph HTTP
        C1[MoviesController] 
        C2[ShowingsController]
        C3[HoldsController]
        C4[HealthController]
        F[ProblemJsonFilter]
        M[requestIdMiddleware]
        L[PinoLoggerService]
    end
    subgraph Domain - framework-free
        HS[HoldService]
        BS[BookingService]
        SS[SweepService]
        E[DomainError hierarchy]
    end
    subgraph Ports
        PS[[BookingStore port<br/>tx TxView]]
        PG[[PaymentGateway port]]
        CK[[Clock port]]
    end
    subgraph Adapters
        MEM[MemoryBookingStore<br/>promise-chain serialization]
        PGS[PgBookingStore<br/>FOR UPDATE + unique index]
        MPAY[MemPaymentGateway]
        SC[SystemClock / FakeClock]
    end
    C1 --> PS
    C2 --> HS --> PS
    C3 --> HS & BS
    BS --> PS & PG
    SS --> PS
    PS -. default .-> MEM
    PS -. DATABASE_URL .-> PGS
    CK --> SC
    HS & BS & SS --> CK
```

## Decisions

| Decision | Why |
|---|---|
| Holds stored one-row-per-seat (pg) | lets `holds_active_unique ON holds(showing_id, seat_ref) WHERE state='ACTIVE'` police each seat individually at the DB level |
| Memory tx = single promise chain | models `SELECT ... FOR UPDATE` serialization so the same domain suite proves correctness offline and on Postgres |
| Replay lookup first in confirm | an idempotency-key retry must return the original booking even if the hold has since expired |
| Decline returns a result object, not an exception, from inside tx | the adapter can COMMIT the release; the 402 is thrown after durability - decline and freed seats are never observable apart |
| Sweep job AND lazy expiry | eager reclaim for idle showings; lazy read/write checks make correctness independent of sweep timing |
| Flat per-showing pricing | keeps money math trivially auditable; per-seat categories would generalize `priceCents x count` |
| Seed ids prefixed `seed-`, fixed dates | the curl tour below works verbatim forever |

## API tour (after `pnpm start`)

```bash
BASE=http://localhost:3002

curl -s $BASE/movies | jq
# [{ "id": "seed-movie-1", "title": "The Matrix" }, { "id": "seed-movie-2", ... }]

curl -s $BASE/movies/seed-movie-2/showings | jq
# seed-showing-2: 3x4 grid, priceCents 900

curl -s $BASE/showings/seed-showing-2/seats | jq
# [{ "seatRef": "A1", "status": "available" }, ... ]

HOLD=$(curl -s -X POST $BASE/showings/seed-showing-2/holds \
  -H 'content-type: application/json' \
  -d '{"userId":"u1","seatRefs":["A1","A2"]}')
echo "$HOLD" | jq      # 201: holdId, expiresAt (= now + HOLD_TTL_MS)
HOLD_ID=$(echo "$HOLD" | jq -r .holdId)

curl -s -X POST $BASE/holds/$HOLD_ID/confirm \
  -H 'content-type: application/json' \
  -d '{"idempotencyKey":"order-123","card":{"number":"4242424242424242"}}' -i
# 201 Created + Location /bookings/<id>, totalCents: 1800 (server-side math)

# Replay the SAME key -> 200 with the SAME bookingId (no second charge):
curl -s -X POST $BASE/holds/$HOLD_ID/confirm \
  -H 'content-type: application/json' \
  -d '{"idempotencyKey":"order-123","card":{"number":"4242424242424242"}}'

# DELETE frees seats while a hold is still ACTIVE (204, idempotent);
# deleting a CONFIRMED hold is refused with 409:
FRESH=$(curl -s -X POST $BASE/showings/seed-showing-2/holds \
  -H 'content-type: application/json' \
  -d '{"userId":"u1b","seatRefs":["B1"]}')
curl -s -X DELETE $BASE/holds/$(echo "$FRESH" | jq -r .holdId) \
  -o /dev/null -w '%{http_code}\n'   # 204

curl -s -X POST $BASE/showings/seed-showing-2/holds \
  -H 'content-type: application/json' \
  -d '{"userId":"u2","seatRefs":["A3"]}' -i
# 201; now race for the same seat from "another user" -> 409 seat-held problem json

curl -s $BASE/healthz && curl -s $BASE/readyz
```

## Resume bullet

> Built a movie-booking engine eliminating oversell: pessimistic
> `SELECT ... FOR UPDATE` serialization with a partial unique index backstop,
> mirrored by an in-memory adapter whose promise-chain transactions let the
> identical domain suite prove exactly-one-winner under parallel contention;
> idempotent confirms (replay-before-write inside one transaction) with
> server-computed totals; declined payments release seats atomically; TTL
> holds expire eagerly via sweep and lazily on read.
