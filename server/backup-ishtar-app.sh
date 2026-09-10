#!/bin/sh
# Nightly SQLite backup via the sqlite3 online backup API. Keeps 14 dated
# copies. Suggested crontab: run as root from /etc/cron.d/ishtar-app-backup
# (root can read /var/lib/ishtar-app even though that directory is 0700
# owned by ishtar-app, and /var/backups/ishtar-app is created root-owned
# below rather than shared with the app's own service account, so a
# compromised app process cannot read or tamper with its own backups):
#   17 3 * * * root /opt/ishtar-app/backup-ishtar-app.sh
set -eu
DEST=/var/backups/ishtar-app
install -d -m 700 "$DEST"
python3 - <<'PY'
import datetime
import os
import sqlite3

dest_path = '/var/backups/ishtar-app/db-%s.sqlite3' % datetime.date.today().isoformat()

src = sqlite3.connect('file:/var/lib/ishtar-app/db.sqlite3?mode=ro', uri=True)
src_tables = src.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").fetchone()[0]
if src_tables < 1:
    src.close()
    raise SystemExit('Source database has no tables -- refusing to back it up')

for stale in (dest_path, dest_path + '-wal', dest_path + '-shm'):
    if os.path.exists(stale):
        os.remove(stale)

dst = sqlite3.connect(dest_path)
src.backup(dst)
dst.close()
src.close()

# A backup that silently produced a zero-byte or empty file is worse than no
# backup at all, because it looks like one succeeded. Check before this file
# is allowed to age out any older copy: confirm it is not zero bytes, then
# reopen it as a wholly separate connection (not the one used to write it)
# and confirm it passes SQLite's own integrity check and holds exactly as
# many tables as the live database had at backup time -- integrity_check
# alone would not catch a validly-empty database, which is the actual
# failure mode this guards against.
size = os.path.getsize(dest_path)
if size == 0:
    raise SystemExit('Backup %s is zero bytes -- refusing to treat as valid' % dest_path)

check = sqlite3.connect('file:%s?mode=ro' % dest_path, uri=True)
integrity = check.execute('PRAGMA integrity_check').fetchone()
backup_tables = check.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").fetchone()[0]
check.close()
if integrity != ('ok',):
    raise SystemExit('Backup integrity check failed for %s: %r' % (dest_path, integrity))
if backup_tables != src_tables:
    raise SystemExit(
        'Backup %s has %d tables, source had %d -- refusing to treat as valid'
        % (dest_path, backup_tables, src_tables)
    )
print('Backup OK: %s (%d bytes, %d tables)' % (dest_path, size, backup_tables))
PY
ls -1t "$DEST"/db-*.sqlite3 | tail -n +15 | xargs -r rm -f
chmod 600 "$DEST"/db-*.sqlite3
