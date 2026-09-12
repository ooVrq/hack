-- migrate:no-transaction
--
-- 002_timescale.sql — the TigerData-specific layer.
--
-- This file must NOT run inside a transaction: TimescaleDB refuses to create
-- a continuous aggregate inside a transaction block. The migrate script reads
-- the directive on line 1 above and runs these statements outside one.

-- Self-updating hourly rollups. This is what makes the dashboard sparkline
-- instant instead of a count(*) over every check ever run — and it survives
-- the retention policy below, so lifetime counts outlive the raw rows.
create materialized view checks_hourly
with (timescaledb.continuous) as
select
  watch_id,
  time_bucket('1 hour', created_at) as bucket,
  count(*)                          as checks,
  count(*) filter (where changed)   as changes,
  count(*) filter (where matched)   as matches,
  avg(duration_ms)::int             as avg_ms
from checks
group by watch_id, bucket;

select add_continuous_aggregate_policy('checks_hourly',
  start_offset      => interval '3 days',
  end_offset        => interval '1 hour',
  schedule_interval => interval '15 minutes');

-- Raw checks drop themselves after 14 days. Replaces hand-written cleanup.
select add_retention_policy('checks', interval '14 days');
