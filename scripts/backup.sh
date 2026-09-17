#!/usr/bin/env bash
#
# Logical backup of the Mekteb database (MEMORY.md §6 — operations).
#
# Dumps the `public` schema — everything the app reads and writes. The Supabase
# system schemas (auth, storage, realtime) are deliberately excluded: they
# exist in every Supabase project and are handled by Supabase's own platform
# backup; this script backs up the data that would otherwise be irreplaceable.
#
# Uses pg_dump --format=custom so the file carries schema + data and restores
# transactionally. Output lands in ./backups with a timestamp.
#
# Usage:
#   scripts/backup.sh [DATABASE_URL]
#
# DATABASE_URL defaults to the local Supabase Postgres. For a hosted project,
# use the project's connection string (pooler or direct):
#   scripts/backup.sh "postgresql://postgres.mosquexxxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
#
set -euo pipefail

DB_URL="${1:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$DIR/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/mekteb-$STAMP.dump"

mkdir -p "$OUT_DIR"

echo "→ Backing up public + app schemas to $OUT"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=app \
  "$DB_URL" \
  -f "$OUT"

echo "→ Verifying the dump reads back"
pg_restore --list "$OUT" >/dev/null

SIZE="$(du -h "$OUT" | cut -f1)"
echo "✓ Backup ok ($SIZE): $OUT"
echo "  Restore with: scripts/restore-drill.sh $OUT"
