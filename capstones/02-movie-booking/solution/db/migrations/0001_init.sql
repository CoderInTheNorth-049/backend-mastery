-- 0001_init.sql -- Capstone 2 initial schema.
-- Apply with: psql "$DATABASE_URL" -f db/migrations/0001_init.sql
-- (the pg integration spec applies this file automatically).

BEGIN;

CREATE TABLE IF NOT EXISTS movies (
  id    TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS showings (
  id          TEXT PRIMARY KEY,
  movie_id    TEXT NOT NULL REFERENCES movies(id),
  starts_at   TIMESTAMPTZ NOT NULL,
  num_rows    SMALLINT NOT NULL CHECK (num_rows > 0),
  num_cols    SMALLINT NOT NULL CHECK (num_cols > 0),
  price_cents INTEGER  NOT NULL CHECK (price_cents > 0)
);

-- One row per physical seat: the pessimistic-lock target for M2 and the
-- source of truth for GET /showings/:id/seats.
CREATE TABLE IF NOT EXISTS seats (
  showing_id TEXT NOT NULL REFERENCES showings(id),
  seat_ref   TEXT NOT NULL,
  PRIMARY KEY (showing_id, seat_ref)
);

-- Grain decision: one row per (hold, seat) instead of an array column, so a
-- partial unique index can police EACH SEAT individually and seat queries are
-- plain SQL joins. Reconstruct the Hold aggregate by grouping on hold_id.
CREATE TABLE IF NOT EXISTS holds (
  hold_id    TEXT NOT NULL,
  showing_id TEXT NOT NULL REFERENCES showings(id),
  seat_ref   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  state      TEXT NOT NULL CHECK (state IN ('ACTIVE', 'CONFIRMED', 'EXPIRED', 'RELEASED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hold_id, seat_ref)
);

-- ---------------------------------------------------------------------------
-- THE SENIOR MOVE #1 -- DB-level race backstop.
--
-- Under READ COMMITTED, two sessions can BOTH pass the app-level
-- "is this seat free?" check before either inserts. This partial unique index
-- makes the second INSERT of an ACTIVE hold for the same (showing_id,
-- seat_ref) fail with 23505 no matter what the application thinks it saw.
-- The store maps that violation to ConflictError("SEAT_HELD"). Only ACTIVE
-- rows are indexed, so confirming or releasing a hold frees the seat slot
-- without any extra bookkeeping.
--
-- CREATE UNIQUE INDEX holds_active_unique ON holds (showing_id, seat_ref) WHERE state = 'ACTIVE'
-- ...is exactly the statement below:
CREATE UNIQUE INDEX IF NOT EXISTS holds_active_unique
  ON holds (showing_id, seat_ref)
  WHERE state = 'ACTIVE';

-- THE SENIOR MOVE #2 -- pessimistic serialization (build-guide M2).
--
-- Every mutating transaction in src/infra/pg-booking-store.ts starts with:
--
--     SELECT * FROM showings WHERE id = $1 FOR UPDATE;
--
-- which takes a row lock on the showing and queues every competing
-- transaction behind it: hold-vs-hold, hold-vs-confirm, confirm-vs-confirm
-- become strictly sequential, mirroring what the in-memory adapter emulates
-- with its promise chain. READ COMMITTED is sufficient BECAUSE all writers
-- funnel through this single lock per showing; without it you would need
-- SERIALIZABLE plus retry-on-40001 machinery.
--
-- Optimistic alternative sketched for the M2 benchmark:
--
--     ALTER TABLE showings ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
--     UPDATE showings SET version = version + 1
--      WHERE id = $1 AND version = $2;   -- 0 rows updated => retry whole tx
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bookings (
  id              TEXT PRIMARY KEY,
  hold_id         TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  total_cents     INTEGER NOT NULL CHECK (total_cents >= 0),
  state           TEXT NOT NULL CHECK (state IN ('CONFIRMED', 'PAYMENT_FAILED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- hold_id deliberately carries no FK: holds is keyed (hold_id, seat_ref), so a
-- composite FK would drag seat_ref into bookings; the UNIQUE constraint above
-- (one booking per hold ever) is the invariant that matters.

CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  seat_ref   TEXT NOT NULL,
  PRIMARY KEY (booking_id, seat_ref)
);

CREATE INDEX IF NOT EXISTS holds_expiry_idx ON holds (state, expires_at);

COMMIT;
