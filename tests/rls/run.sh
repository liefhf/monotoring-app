#!/usr/bin/env bash
# Zugriffsregeln (RLS) lokal pruefen - NIE gegen die echte Datenbank.
# Startet eine leere Wegwerf-PostgreSQL-Instanz, spielt einen Nachbau der
# Supabase-Grundlagen (stub.sql) und die Projekt-Skripte ein und prueft
# mit eingeschraenkten Rollen (authenticated/anon, nicht als Admin).
#   bash tests/rls/run.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
WORK="$(mktemp -d)"
PORT="${PG_PORT:-54331}"
RUNAS=""
if [ "$(id -u)" = "0" ]; then id -u postgres >/dev/null 2>&1 || useradd -m postgres; chown postgres "$WORK"; chmod 755 "$WORK"; RUNAS="su postgres -c"; fi
run() { if [ -n "$RUNAS" ]; then $RUNAS "$*"; else bash -c "$*"; fi; }
cleanup() { run "$BIN/pg_ctl -D $WORK/data stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
run "$BIN/initdb -D $WORK/data -A trust -U postgres" >/dev/null
run "$BIN/pg_ctl -D $WORK/data -o '-k $WORK -p $PORT -c listen_addresses=' -l $WORK/log start -w" >/dev/null
PSQL="psql -X -q -h $WORK -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1"
cp "$ROOT"/tests/rls/*.sql "$ROOT"/supabase/{anwesenheit,gesundheit_dokumente,ziele_notizen,sicherheit_trainerteam,trainerteam_aktivieren,trainerteam_zuruecksetzen,sicherheitscheck,regeln_anzeigen}.sql "$WORK"/
chmod 644 "$WORK"/*.sql
$PSQL -f "$WORK/stub.sql"
for f in anwesenheit gesundheit_dokumente ziele_notizen sicherheit_trainerteam; do $PSQL -o /dev/null -f "$WORK/$f.sql"; done
$PSQL -o /dev/null -f "$WORK/fixtures.sql"
echo "== Phase 1: nach Skript 23-25 (Trainerteam noch NICHT aktiv)"
$PSQL -o /dev/null -v phase=1 -f "$WORK/checks_base.sql" 2>&1 | sed -n -e "s/.*NOTICE:  //p" -e "/ERROR/p"
$PSQL -f "$WORK/trainerteam_aktivieren.sql" >/dev/null
echo "== Phase 2: nach Skript 26 (Trainerteam aktiv)"
$PSQL -o /dev/null -v phase=2 -f "$WORK/checks_base.sql" 2>&1 | sed -n -e "s/.*NOTICE:  //p" -e "/ERROR/p"
$PSQL -o /dev/null -f "$WORK/checks_team.sql" 2>&1 | sed -n -e "s/.*NOTICE:  //p" -e "/ERROR/p"
$PSQL -f "$WORK/trainerteam_zuruecksetzen.sql" >/dev/null
echo "== Phase 3: nach Rueckweg (wieder wie Phase 1)"
$PSQL -o /dev/null -v phase=3 -f "$WORK/checks_base.sql" 2>&1 | sed -n -e "s/.*NOTICE:  //p" -e "/ERROR/p"
echo "== Pruefskripte laufen fehlerfrei (Ausgabe des Sicherheitschecks auf der Testdatenbank):"
$PSQL -f "$WORK/sicherheitscheck.sql"
$PSQL -o /dev/null -f "$WORK/regeln_anzeigen.sql"
$PSQL -f "$WORK/summary.sql"
