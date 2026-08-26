# Migration 0001 - initial schema.
# Written to match the pg adapters 1:1; redirect reads select ONLY the columns
# below (target_url/expires_at/disabled_at) - never SELECT * on the hot path.

CREATE TABLE links (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,           -- base62 short code
  target_url  TEXT        NOT NULL,                  -- validated http/https only
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,                           -- NULL = never expires
  disabled_at TIMESTAMPTZ                            -- NULL = active; set by PATCH /links/:code
);

-- Redirect lookup is by code; the unique constraint above already indexes it.

CREATE TABLE clicks (
  -- event_id is the dedupe key: the queue may redeliver, and ON CONFLICT DO
  -- NOTHING below makes duplicate delivery a no-op. This IS the dedupe -
  -- no separate inbox table needed at this scale.
  event_id UUID PRIMARY KEY,
  code     TEXT        NOT NULL,
  ts       TIMESTAMPTZ NOT NULL,
  ua_hash  TEXT,                                  -- hashed user agent, never raw PII
  country  TEXT
);

-- Stats endpoint aggregates per code; composite index keeps GROUP BY cheap.
CREATE INDEX clicks_code_ts_idx ON clicks (code, ts DESC);
