-- 001_init.sql — core schema
-- Mirrors docs/DATA_MODEL.md. Runs inside a transaction.

create extension if not exists "pgcrypto";
create extension if not exists timescaledb;

create table users (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  email_verified_at timestamptz,
  created_at        timestamptz not null default now()
);

-- rule_type: 'any_change' | 'keyword_appears' | 'keyword_disappears' | 'regex' | 'ai'
-- status:    'warming' | 'active' | 'paused' | 'failing' | 'blocked'
create table watches (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade,
  name                 text not null,
  url                  text not null,
  css_selector         text,
  rule_type            text not null default 'any_change',
  keywords             text[] not null default '{}',
  ai_prompt            text,
  interval_seconds     int  not null default 300 check (interval_seconds >= 60),
  cooldown_seconds     int  not null default 3600,
  status               text not null default 'warming',
  next_check_at        timestamptz not null default now(),
  locked_at            timestamptz,
  last_notified_at     timestamptz,
  consecutive_failures int  not null default 0,
  created_at           timestamptz not null default now()
);

-- the index the whole scheduler depends on
create index watches_due_idx on watches (next_check_at)
  where status in ('active','warming','failing');

create table snapshots (
  id             uuid primary key default gen_random_uuid(),
  watch_id       uuid not null references watches(id) on delete cascade,
  content_hash   text not null,
  extracted_text text not null,
  status_code    int,
  fetched_at     timestamptz not null default now()
);
create index snapshots_watch_idx on snapshots (watch_id, fetched_at desc);

-- checks is a TimescaleDB hypertable: append-only, ~288 rows/day/watch,
-- always read newest-first. NOTE THE PRIMARY KEY — a hypertable's unique
-- indexes must contain the partitioning column, so it is (created_at, id),
-- never id alone.
create table checks (
  id            uuid not null default gen_random_uuid(),
  watch_id      uuid not null references watches(id) on delete cascade,
  changed       boolean not null default false,
  matched       boolean not null default false,
  confidence    numeric(3,2),
  ai_summary    text,
  diff_added    text,
  diff_removed  text,
  status_code   int,
  duration_ms   int,
  error         text,
  created_at    timestamptz not null default now(),
  primary key (created_at, id)
) with (
  tsdb.hypertable,
  tsdb.partition_column = 'created_at'
);
create index checks_watch_idx on checks (watch_id, created_at desc);

create table notifications (
  id                  uuid primary key default gen_random_uuid(),
  watch_id            uuid not null references watches(id) on delete cascade,
  -- plain uuid, NOT a foreign key: checks is a hypertable whose primary key
  -- is (created_at, id), so id alone is not a unique target to reference.
  check_id            uuid,
  channel             text not null default 'email',
  recipient           text not null,
  subject             text not null,
  provider_message_id text,
  status              text not null default 'queued',
  sent_at             timestamptz
);
create index notifications_watch_idx on notifications (watch_id, sent_at desc);
