-- Capstone 4 - production blueprint for the durable equivalents of the
-- in-memory adapters used by the single-deployable answer key.
--
-- The runtime in ../src keeps everything in Maps and Sets so the suite runs
-- with ZERO external services. This file documents what each adapter maps to
-- when contexts are extracted into services with real Postgres databases:
--   MemOutboxStore  -> outbox table (below)
--   InboxDedupe     -> inbox table (below)
--   OrdersStore     -> orders table
--   OrderViewStore  -> order_views table
-- Inventory and payments would mirror outbox/inbox in their own databases
-- (database-per-service: no cross-context joins, ever).

-- ---------------------------------------------------------------- orders --
CREATE TABLE orders (
    order_id    UUID PRIMARY KEY,
    user_id     TEXT        NOT NULL,
    status      TEXT        NOT NULL CHECK (status IN (
                    'PENDING', 'CONFIRMED', 'CANCELLED_STOCK', 'CANCELLED_PAYMENT')),
    total_cents BIGINT      NOT NULL CHECK (total_cents >= 0),   -- integer cents only
    items       JSONB       NOT NULL,                            -- [{sku, qty}]
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------- transactional outbox --
-- Inserted in the SAME transaction as the orders row above; published_at
-- stays NULL until the relay has delivered the event. A crash between
-- publish and mark = redelivery = at-least-once; consumer inbox makes the
-- side effects effectively-once.
CREATE TABLE outbox (
    event_id     UUID PRIMARY KEY,
    topic        TEXT        NOT NULL,
    payload      JSONB       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ          -- NULL == pending
);

CREATE INDEX idx_outbox_pending ON outbox (created_at) WHERE published_at IS NULL;

-- --------------------------------------------- inbox (consumer dedupe) --
-- The consumer-side idempotency gate. Handler inserts its side effect and
-- its inbox row in ONE transaction; ON CONFLICT DO NOTHING turns broker
-- redeliveries into no-ops. One row per (consumer, eventId).
CREATE TABLE inbox (
    consumer    TEXT        NOT NULL,
    event_id    UUID        NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (consumer, event_id)
);

-- -------------------------------------------- CQRS read model (orders) --
-- Denormalized view maintained by the projector from order.* events only.
-- Eventually consistent BY DESIGN: reads here may lag the write model for a
-- beat while events propagate. Never written by the command path.
CREATE TABLE order_views (
    order_id    UUID PRIMARY KEY,
    status      TEXT        NOT NULL CHECK (status IN (
                    'PENDING', 'CONFIRMED', 'CANCELLED_STOCK', 'CANCELLED_PAYMENT')),
    total_cents BIGINT      NOT NULL DEFAULT 0,
    items       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_views_status ON order_views (status);
