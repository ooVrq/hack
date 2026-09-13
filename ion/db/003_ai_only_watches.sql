-- 003_ai_only_watches.sql
-- Product decisions from 2026-09-12: no accounts, every watch is AI-judged,
-- 1-minute default interval, robots.txt is a warning the user can override.

alter table watches alter column interval_seconds set default 60;
alter table watches alter column rule_type set default 'ai';
alter table watches add column robots_blocked boolean not null default false;
alter table watches add column last_checked_at timestamptz;

-- the verbatim diff line the judge based its verdict on; shown on the timeline
alter table checks add column ai_evidence text;

-- /demo/job-board reads its open/closed state from here so every serverless
-- instance (and the watcher) sees the same page.
create table demo_state (
  key        text primary key,
  value      boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into demo_state (key, value) values ('job_board_open', false);
