# Accounts

Passwordless accounts for ishtarinsights.com. Spec: docs/superpowers/specs/2026-09-09-accounts-design.md.

## Service

Django project in `server/ishtar`. On the VPS it lives at `/opt/ishtar-app/app` with a venv at
`/opt/ishtar-app/venv`, runs as `ishtar-app` under systemd unit `ishtar-app` (gunicorn on
127.0.0.1:8138, 2 workers), and stores SQLite at `/var/lib/ishtar-app/db.sqlite3`. Secrets are in
`/etc/ishtar-app.env` (see "Environment file" below). Nginx proxies `/api/account/`,
`/api/readings/`, `/api/health/`, `/_allauth/` and `/admin/` to it, plus `/static/`; everything
else stays static. `/api/newsletter/` is not yet proxied to this service -- see "Newsletter
cutover" below.

Login is by six-digit email code (django-allauth headless, login by code). Codes are sent through
Resend via django-anymail from `hello@ishtarinsights.com`. An unknown email becomes an account on
first successful code. Sessions last 30 days and refresh on activity.

Django's cache (`CACHES` in `ishtar/settings.py`) is `DatabaseCache`, backed by a `django_cache`
table in the same SQLite file as the app's own data. This is a correctness requirement, not an
optimization: allauth's rate limiter (`request_login_code`, default `20/m/ip,3/m/key`) keeps its
hit counters in Django's cache, and gunicorn runs 2 worker processes -- with no `CACHES` override
Django falls back to `LocMemCache`, a per-process in-memory dict, so each worker would enforce an
isolated limit and the effective rate would run at up to 2x across the pool. `DatabaseCache`
shares one bucket across both workers because it lives in the SQLite file both processes already
read and write with WAL journaling. Its table is created automatically for the test database by
Django's own test runner; on the VPS, `deploy-app.sh` runs `manage.py createcachetable` (idempotent
-- a no-op if the table already exists) after `migrate`.

Every endpoint returns errors as `{"error": "..."}`, including an uncaught exception: `handler500`
(`ishtar/urls.py`) mirrors the existing `handler404` so a 500 in production still returns that
shape instead of Django's default HTML error page.

## Endpoints

- `GET /api/account/` summary: email, active entitlement features, profile, newsletter status
- `PUT|DELETE /api/account/profile/` synced birth profile (the localStorage object, max 4 KB)
- `POST /api/account/newsletter/` `{"subscribed": bool}`
- `POST /api/account/delete/` `{"confirm": true}` removes the account and its data; newsletter row stays
- `GET|POST /api/readings/`, `GET|PATCH|DELETE /api/readings/{id}/` journal (500 per user, 8 KB payloads)
- `POST /api/newsletter/subscribe|unsubscribe` unchanged public contract, implemented by this
  service and ready to serve -- but nginx does not route `/api/newsletter/` here yet (see below)
- `/_allauth/browser/v1/auth/code/request`, `/auth/code/confirm`, `/auth/session` from allauth

## Admin

`https://ishtarinsights.com/admin/` with the superuser created at deploy. Grant a feature by adding an
Entitlement row (feature key such as `member`) to a user.

## Local development

```
cd server/ishtar
uv venv --python 3.11 .venv && uv pip install --python .venv/Scripts/python.exe -r requirements.txt
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py test
DJANGO_DEBUG=1 .venv/Scripts/python.exe manage.py runserver 8000
```

Without `RESEND_API_KEY` the login code prints to the console.

## Environment file

`server/ishtar-app.env.example` documents every variable the app reads from the environment, but
it is a reference template only -- never copy it over the real file. `/etc/ishtar-app.env` already
exists on the VPS (mode 600, root-owned) with a working `RESEND_API_KEY` and `DJANGO_FROM_EMAIL`,
verified end-to-end with a real delivered send (see docs/deployment.md, "Resend transactional
email"). Deploying this service means appending the remaining variables --
`DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `NEWSLETTER_ORIGINS` --
to the existing file, not regenerating it. `deploy-app.sh` only ever reads this file (to source it,
and to `chown`/`chmod` it); nothing in it writes, truncates or regenerates the file's content, and
it refuses to proceed if any of the six variables the app needs is missing or empty.

Values containing spaces must stay quoted (e.g. `DJANGO_FROM_EMAIL="Ishtar Insights
<hello@ishtarinsights.com>"`) so the file works both when sourced by POSIX `sh` and when read by
systemd's `EnvironmentFile=`.

## Deploy

See docs/deployment.md, section "Accounts service".

`server/deploy-app.sh` installs or updates `/opt/ishtar-app`, migrates, creates the cache table,
collects static files, (re)starts the `ishtar-app` unit, wires the new locations into nginx, and
health-checks `http://127.0.0.1:8138/api/health/`. It is safe to re-run: user creation, directory
creation, the venv, `pip install`, `migrate`, `createcachetable`, `collectstatic`, `systemctl
enable`/`restart`, and the nginx edit are all no-ops or converge to the same result when nothing
changed. Never stops, disables, or reconfigures the separate `ishtar-newsletter` unit or its nginx
route.

## Newsletter cutover

The old standalone `ishtar-newsletter` service (127.0.0.1:8137) still owns `/api/newsletter/` in
nginx and must keep running -- it is the rollback path. This service implements the same
`/api/newsletter/subscribe|unsubscribe` contract, ready to take over, but nothing in the deploy
tooling above points nginx at it: that cutover is a deliberate, separate step, not a side effect of
deploying.

When ready, replace the existing block in `/etc/nginx/sites-available/ishtarinsights.com`:

```nginx
location /api/newsletter/ {
    limit_req zone=ishtar_newsletter burst=10 nodelay;
    limit_req_status 429;
    client_max_body_size 1k;
    client_body_timeout 10s;
    proxy_pass http://127.0.0.1:8137;
    ...
}
```

with:

```nginx
location ^~ /api/newsletter/ {
    limit_req zone=ishtar_newsletter burst=10 nodelay;
    limit_req_status 429;
    client_max_body_size 1k;
    client_body_timeout 10s;
    proxy_pass http://127.0.0.1:8138;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_connect_timeout 3s;
    proxy_read_timeout 10s;
    add_header Cache-Control "no-store" always;
    access_log off;
}
```

The `^~` matters: nginx gives an unanchored regex location priority over a matching prefix
location regardless of which is more specific, so without `^~` the `location ~
^/(api/(account|readings|health)|_allauth|admin)/` block `deploy-app.sh` already installed could
end up deciding this route instead (it doesn't today only because it deliberately excludes
`newsletter` from its pattern). `^~` makes this block win outright once its prefix matches, the
same way the original block implicitly relied on being the only thing that could match
`/api/newsletter/` at all. Then `nginx -t && systemctl reload nginx`, verify a live subscribe
request, and only then consider retiring the `ishtar-newsletter` unit.

## Backups

`server/backup-ishtar-app.sh` runs nightly (suggested via `/etc/cron.d/ishtar-app-backup`, see the
script's header) into `/var/backups/ishtar-app/`, keeping fourteen copies. Each backup is taken
with SQLite's online backup API (safe against a live WAL-mode database), then independently
reopened and checked -- non-zero size, `PRAGMA integrity_check`, and the same table count the
source had -- before the script allows it to count toward rotation; any check failing aborts the
whole run (`set -eu`) before any older backup is deleted, so a bad backup can never age out a good
one.
