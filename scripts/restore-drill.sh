#!/usr/bin/env bash
#
# Restore drill — the part of a backup that actually matters (MEMORY.md §6 — operations).
#
# Restores a pg_dump custom-format file into a throwaway Postgres instance and
# proves the data came back by comparing row counts against the source
# database. An untested restore is not a backup; this script is the test.
#
# Usage:
#   scripts/backup.sh                 # 1. make a backup (or use an existing one)
#   scripts/restore-drill.sh [DUMP_FILE] [SOURCE_DB_URL] [DEST_DB_URL]
#
# Defaults: latest dump in ./backups, local source DB, and a throwaway
# database named mekteb_restore_drill on the same Postgres server.
#
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_URL="${2:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
DEST_URL="${3:-postgresql://postgres:postgres@127.0.0.1:54322/mekteb_restore_drill}"

DUMP="${1:-$(ls -1 "$DIR"/backups/mekteb-*.dump 2>/dev/null | sort | tail -1)}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "No dump found. Run scripts/backup.sh first." >&2
  exit 1
fi
echo "→ Dump: $DUMP"

# Extract the destination DB name out of the DEST_URL for the create/drop steps.
DEST_DB="$(python3 - <<PY
import sys, urllib.parse
url = "$DEST_URL"
print(url.rstrip('/').split('/')[-1])
PY
)"

echo "→ Recreating throwaway database '$DEST_DB'"
psql "${SOURCE_URL%/*}/postgres" -v ON_ERROR_STOP=1 -c "drop database if exists \"$DEST_DB\";" >/dev/null
psql "${SOURCE_URL%/*}/postgres" -v ON_ERROR_STOP=1 -c "create database \"$DEST_DB\";" >/dev/null

# The dump contains `CREATE SCHEMA public`; a fresh database already has one.
psql "$DEST_URL" -v ON_ERROR_STOP=1 -c "drop schema public cascade;" >/dev/null

# Public tables reference auth.users via FKs. A stub satisfies the pre-data
# DDL; the data restore does not validate FKs because they are created in the
# post-data section, which this bare-database drill deliberately skips (see
# below).
psql "$DEST_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
SQL

echo "→ Restoring (schema + data)"
pg_restore --no-owner --no-privileges --exit-on-error --section=pre-data -d "$DEST_URL" "$DUMP"
pg_restore --no-owner --no-privileges --exit-on-error --section=data     -d "$DEST_URL" "$DUMP"

# Post-data (foreign keys, indexes, triggers) is not restored here: the
# constraints reference auth.users, which exists in any real Supabase project
# but is only a stub in this throwaway database. A production restore runs the
# full dump into a real project where that schema is present; this drill is
# about proving the *data* survives the round trip.

echo "→ Comparing row counts (source vs restored)"
# Real counts, not pg_stat estimates — a freshly reset database has never been
# ANALYZEd, so n_live_tup is 0 even when the data is there.
source_tables="$(psql "$SOURCE_URL" -Atc \
  "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name;")"
dest_tables="$(psql "$DEST_URL" -Atc \
  "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name;")"

if [[ "$source_tables" != "$dest_tables" ]]; then
  echo "✗ Table lists differ between source and restore" >&2
  diff <(echo "$source_tables") <(echo "$dest_tables") >&2 || true
  exit 1
fi

FAILED=0
SOURCE_SUM=0
DEST_SUM=0
while IFS= read -r table; do
  [[ -z "$table" ]] && continue
  src="$(psql "$SOURCE_URL" -Atc "select count(*) from public.\"$table\";")"
  dst="$(psql "$DEST_URL" -Atc "select count(*) from public.\"$table\";")"
  SOURCE_SUM=$((SOURCE_SUM + src))
  DEST_SUM=$((DEST_SUM + dst))
  if [[ "$src" != "$dst" ]]; then
    echo "✗ Table '$table': $src rows in source, $dst in restore" >&2
    FAILED=1
  fi
done <<< "$source_tables"

echo "  source rows: $SOURCE_SUM"
echo "  restored rows: $DEST_SUM"

if [[ "$DEST_SUM" -eq 0 ]]; then
  echo "✗ RESTORE FAILED: destination is empty." >&2
  exit 1
fi
if [[ "$FAILED" -ne 0 ]]; then
  echo "✗ RESTORE FAILED: row counts differ." >&2
  exit 1
fi

echo "✓ Restore drill passed: data survived the round trip."
echo "  Cleaning up '$DEST_DB'"
psql "${SOURCE_URL%/*}/postgres" -c "drop database \"$DEST_DB\";" >/dev/null
