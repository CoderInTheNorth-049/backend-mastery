-- Capstone 3 · 0001_init
-- Initial schema for the realtime chat hub's durable message log.
--
-- Apply: `docker compose up -d db` (the postgres image auto-runs everything
-- in /docker-entrypoint-initdb.d on FIRST init of a fresh volume) or by hand:
--   psql "$DATABASE_URL" -f db/migrations/0001_init.sql
--
-- Teaching note: gen_random_uuid() is core Postgres since 13, so no
-- pgcrypto extension line needed on 16.

create table if not exists messages (
  id      uuid primary key,             -- doubles as the dedupe key: a retried write-behind job hits "on conflict do nothing"
  room_id text        not null,
  user_id text        not null,
  text    text        not null,
  ts      timestamptz not null default now()
);

-- Keyset pagination walks this newest-first per room:
--   where room_id = $1 and (ts, id) < ($2::timestamptz, $3)
--   order by ts desc, id desc
-- (room_id, ts DESC) serves the order-by; the id tie-break resolves
-- equal-ts groups at page boundaries. Rooms with heavy same-instant bursts
-- should extend this to (room_id, ts DESC, id DESC) for exact index-only walks.
create index if not exists messages_room_ts_idx on messages (room_id, ts desc);
