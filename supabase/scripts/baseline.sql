-- Row count + table size baseline.
-- Run with: psql -f supabase/scripts/baseline.sql
--
-- Captures a snapshot of every user table's row count and disk size so you
-- can track growth over time and spot unexpected bloat early.

SELECT
  schemaname AS schema,
  relname    AS table,
  n_live_tup AS row_estimate,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid))        AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
