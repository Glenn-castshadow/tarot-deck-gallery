#!/bin/sh
# Run as root on the VPS after uploading server/ishtar to /tmp/ishtar-app-src
# and this script, server/ishtar-app.service, server/nginx-ishtar-app.conf
# and server/backup-ishtar-app.sh to /tmp. Safe to re-run: every step below
# either only acts when something is not already correct, or converges to
# the same end state when repeated (see docs/ACCOUNTS.md, "Deploy", for the
# reasoning behind each one).
set -eu

APP=/opt/ishtar-app
ENV_FILE=/etc/ishtar-app.env

id ishtar-app >/dev/null 2>&1 || useradd --system --home-dir /var/lib/ishtar-app --shell /usr/sbin/nologin ishtar-app

# Fail before touching anything else if the secrets file this deploy depends
# on is missing or incomplete, rather than rsyncing/building/migrating on a
# box that can only half-start. /etc/ishtar-app.env already exists on a
# previously-deployed VPS with a working RESEND_API_KEY and DJANGO_FROM_EMAIL
# (see server/ishtar-app.env.example and docs/ACCOUNTS.md) -- this script
# only ever reads that file (source it, and check -- never change -- its
# permissions below); it never writes, truncates or regenerates its content,
# so re-running this can never clobber a working key.
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (see server/ishtar-app.env.example)" >&2; exit 1; }
set -a
. "$ENV_FILE"
set +a
for v in DJANGO_SECRET_KEY DJANGO_ALLOWED_HOSTS DJANGO_CSRF_TRUSTED_ORIGINS NEWSLETTER_ORIGINS RESEND_API_KEY DJANGO_FROM_EMAIL; do
    eval "val=\${$v:-}"
    [ -n "$val" ] || { echo "$ENV_FILE is missing a value for $v" >&2; exit 1; }
done

apt-get install -y -q python3-venv rsync >/dev/null
install -d -m 755 "$APP"
install -o ishtar-app -g ishtar-app -d -m 700 /var/lib/ishtar-app
rsync -a --delete --exclude '.venv' --exclude '*.sqlite3*' --exclude 'staticfiles' /tmp/ishtar-app-src/ "$APP/app/"
[ -d "$APP/venv" ] || python3 -m venv "$APP/venv"
"$APP/venv/bin/pip" install -q --upgrade pip
"$APP/venv/bin/pip" install -q -r "$APP/app/requirements.txt"

# /etc/ishtar-app.env already exists on the VPS: root-owned, mode 600, and
# holding a live, verified RESEND_API_KEY (see server/ishtar-app.env.example
# and docs/ACCOUNTS.md, "Environment file"). This script must never chown or
# chmod it -- even tightening permissions here would mean silently modifying
# a file we promised never to touch. Refuse to deploy instead, the same way
# the missing-file check above refuses: assert it is not group- or
# world-readable AND that it is root-owned, and fail loudly, naming every
# problem found, if not. Ownership matters here even though root bypasses
# permission checks, because the actor this defends against is not systemd
# (which reads EnvironmentFile= as root, in PID 1, before dropping to
# User=ishtar-app -- ownership was never relevant to that read) but the
# gunicorn worker itself, running as User=ishtar-app under ProtectSystem=
# strict and ProtectHome=true, neither of which covers /etc. A file owned
# by ishtar-app at mode 0600 would pass a mode-only check while still being
# directly readable -- and writable -- by that same account.
python3 - "$ENV_FILE" <<'PY'
import stat
import sys
from pathlib import Path

path = sys.argv[1]
try:
    st = Path(path).stat()
except OSError as exc:
    raise SystemExit(
        'Could not stat %s (%s) -- refusing to deploy. This script never '
        'chmods or chowns this file; fix the problem by hand and re-run.'
        % (path, exc)
    )
mode = stat.S_IMODE(st.st_mode)
problems = []
if mode & (stat.S_IRGRP | stat.S_IROTH):
    problems.append('mode %04o (group- or world-readable)' % mode)
if st.st_uid != 0:
    problems.append('owned by uid %d, not root' % st.st_uid)
if problems:
    raise SystemExit(
        '%s: %s -- refusing to deploy onto it. This script never chmods or '
        'chowns this file; fix it by hand (chown root:root %s; chmod 600 '
        '%s) and re-run.' % (path, '; '.join(problems), path, path)
    )
PY
install -m 644 /tmp/ishtar-app.service /etc/systemd/system/ishtar-app.service

# Nightly backup script + cron. Installed outside $APP/app so `rsync
# --delete` above never touches it, root-owned and mode 755 so the
# ishtar-app service account -- the one this script's whole job is to take
# backups out from under, in case that account is ever compromised -- can't
# write to it. Both lines write identical content on every run, so
# re-running this deploy converges instead of duplicating or drifting the
# cron entry.
install -o root -g root -m 755 /tmp/backup-ishtar-app.sh "$APP/backup-ishtar-app.sh"
printf '17 3 * * * root %s/backup-ishtar-app.sh\n' "$APP" > /etc/cron.d/ishtar-app-backup
chmod 644 /etc/cron.d/ishtar-app-backup

# Mailchimp reconcile every 10 minutes (docs/NEWSLETTER.md). Written whole on
# every run like the backup entry above, so re-deploying converges. The
# command is a no-op until Glenn adds MAILCHIMP_API_KEY to /etc/ishtar-app.env.
printf '*/10 * * * * root cd %s/app && set -a && . /etc/ishtar-app.env && set +a && DJANGO_SETTINGS_MODULE=ishtar.settings DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3 sudo -u ishtar-app -E %s/venv/bin/python manage.py sync_mailchimp >/dev/null 2>>/var/log/ishtar-mailchimp.err\n' "$APP" "$APP" > /etc/cron.d/ishtar-app-mailchimp
chmod 644 /etc/cron.d/ishtar-app-mailchimp

# The unattended Sunday job on Glenn's box builds the week's issue, pushes it
# here and then sends it over ssh. This wrapper is what it calls, so that remote
# command carries no quotes, no && and no environment of its own:
#   ssh vps ishtar-draft-campaign 2026-09-28 --send
# Same environment as the reconcile line above. Written whole on every run like
# the cron entries, so re-deploying converges instead of drifting.
cat > /usr/local/bin/ishtar-draft-campaign <<EOF
#!/bin/sh
set -eu
cd $APP/app
set -a
. /etc/ishtar-app.env
set +a
DJANGO_SETTINGS_MODULE=ishtar.settings DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3 sudo -u ishtar-app -E $APP/venv/bin/python manage.py draft_campaign "\$@"
EOF
chmod 755 /usr/local/bin/ishtar-draft-campaign

export DJANGO_SETTINGS_MODULE=ishtar.settings DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3
cd "$APP/app"
sudo -u ishtar-app -E "$APP/venv/bin/python" manage.py migrate --noinput
# CACHES is DatabaseCache (settings.py) so allauth's rate limiter shares one
# bucket across gunicorn's 2 worker processes instead of each worker keeping
# an isolated LocMemCache counter. createcachetable is idempotent -- Django's
# own implementation checks the table doesn't already exist before creating
# it (django/core/management/commands/createcachetable.py) -- so this is
# harmless on every re-run.
sudo -u ishtar-app -E "$APP/venv/bin/python" manage.py createcachetable
"$APP/venv/bin/python" manage.py collectstatic --noinput >/dev/null
chown -R ishtar-app:ishtar-app "$APP/app/staticfiles"

systemctl daemon-reload
systemctl enable --now ishtar-app
systemctl restart ishtar-app

grep -q 'zone=ishtar_newsletter' /etc/nginx/conf.d/ishtar-newsletter-rate.conf 2>/dev/null || printf 'limit_req_zone $binary_remote_addr zone=ishtar_newsletter:1m rate=10r/m;\n' > /etc/nginx/conf.d/ishtar-newsletter-rate.conf

python3 - <<'PY'
from pathlib import Path
site = Path('/etc/nginx/sites-available/ishtarinsights.com')
text = site.read_text()
snippet = Path('/tmp/nginx-ishtar-app.conf').read_text()
# This marker (and therefore this whole snippet) never matches
# /api/newsletter/ -- see the comment in nginx-ishtar-app.conf. That is what
# keeps this idempotent insertion from ever touching the existing newsletter
# location block, which must keep proxying to the old service untouched.
marker = '    location ~ ^/(api/(account|readings|health)|_allauth|admin)/ {'
anchor = '    location / {'
if marker not in text:
    if anchor not in text:
        raise SystemExit('Expected anchor %r not found in %s' % (anchor, site))
    idx = text.index(anchor)
    # site.with_suffix() would replace '.com' (pathlib treats it as this
    # filename's suffix), silently producing
    # 'ishtarinsights.before-accounts' -- with_name() appends instead,
    # matching the sibling convention deploy-newsletter.sh sets
    # ('ishtarinsights.com.before-newsletter').
    site.with_name(site.name + '.before-accounts').write_text(text)
    site.write_text(text[:idx] + snippet + text[idx:])
PY

# The site's own `location / {` block (not installed or touched by this
# script) must serve the seven topic directories added in site-foundation
# through `try_files $uri $uri/ =404;` -- see the header comment in
# nginx-ishtar-app.conf for why. This script has no safe way to edit that
# existing block (unlike the marker-anchored insertion above, there is no
# unique text here to find and replace without risking someone's manual
# tuning of `location /`), so just warn loudly if it looks missing rather
# than silently deploying an app half its pages 404 on.
grep -q 'try_files $uri $uri/' /etc/nginx/sites-available/ishtarinsights.com || echo 'WARNING: add try_files $uri $uri/ =404 to location /'

nginx -t
systemctl reload nginx
# Django rejects the bare loopback Host header (DisallowedHost -> 400), so
# present the first ALLOWED_HOSTS entry the way nginx will.
curl --retry 5 --retry-connrefused --retry-delay 1 -fsS -H "Host: ${DJANGO_ALLOWED_HOSTS%%,*}" http://127.0.0.1:8138/api/health/
echo
