# Accounts

## Birth-detail saving (2026-09-12)

The account panel has a persistent **Save my birth details to my account** switch, a
**Save birth details now** button for the current form, an edit link, and a button to reopen
browser-saving preferences. Account saving is independent of optional localStorage consent.
`User.save_birth_details` defaults to true to preserve existing account behavior (migration
`0004_user_save_birth_details`); `GET /api/account/` exposes `saveBirthDetails`.
`POST /api/account/birth-storage/` accepts only `{"enabled": bool}`. Disabling deletes the
saved profile in the same transaction; subsequent profile PUTs return 409 until enabled.
The frontend keeps the active reading in page memory, removes any cached local birth profile
when account saving is off, and does not upload new readings while off.

Two save defects fixed alongside the controls: the profile endpoint now accepts the
`returnLocation` field already sent by the birth form, and signing in captures a guest's
in-memory reading before installing account storage. This preserves a reading entered after
declining local saving when the guest subsequently signs in with account saving enabled.
The account transition guard is set before asynchronous reconciliation to avoid reentrant
restores. Save failures are shown beside the birth form as well as in the account panel.

Passwordless accounts for ishtarinsights.com. Spec: docs/superpowers/specs/2026-09-09-accounts-design.md.

## Saved charts (C5a–C5b, 2026-09-16)

`chart-rooms.js` is the shared saving contract for the chart rooms; it is loaded on
`/charts/` after `natal-engine.js`, and on `/eastern/` after `natal-engine.js` too, for
Jyotish. Its exports, one line each:

- `KINDS` — the ten chart kinds the module knows about, all now wired to rooms:
  `natal`, `solar-return`, `lunar-return`, `progressed`, `horary`, `synastry`,
  `composite`, `davison`, `bazi`, `jyotish`.
- `NOTES` — the three disclosure strings shown beside the save button (below).
- `validate(kind, payload)` — sanitises a saved payload for a kind, or returns `null`.
- `birthFromChart(chart)` — builds a `birth` object from a computed, ready natal chart.
- `placeFrom(location)` — a profile location (`{latitude, longitude, timeZone, label}`)
  to a payload `place`.
- `locationFrom(where)` — the inverse of `placeFrom`.
- `natalFrom(birth)` — `NatalEngine.calculate(...)` from a saved `birth` object, never
  from the live profile.
- `reading(kind, {payload, summary, layout, question})` — the object a room's
  `current()` returns, with `deck`/`focus` empty and strings clipped to the server caps.
- `describe(birth)` — "12 March 1980 at 06:30, London", for a restored banner.
- `describeMoment` — the same function, used for horary's `moment`.
- `summaries` — per-kind functions (`natal`, `solarReturn`, `lunarReturn`, `progressed`,
  `horary`) computing the journal line from a rendered chart.
- `saveControl(kind, note)` — the save-button/status/note markup.
- `banner(text, {live})` — the restored-chart banner markup; passing `live` adds a
  "Use my chart" button.
- `restoredGate()` — `{set, clear, get, active}`, the reopened-chart gate a room keeps
  while a saved chart is on screen.

### Payload

`payload.v` is `1`. `payload.birth` (all kinds but horary) is `{date, time, place:
{name, lat, lon, tz}, houseSystem, fold, orbScale}`, taken from the profile.

| Kind | Extras | `layout` | `question` |
|---|---|---|---|
| `natal` | none | house system | — |
| `solar-return`, `lunar-return` | `target` (the date the reading was saved, the
  engine's reference), `offset` (the return index), `place` override (same shape as
  `birth.place`) or `null` | house system | — |
| `progressed` | `target`, `method: 'secondary' \| 'tertiary' \| 'solar-arc'` | method | — |
| `horary` | `birth` is omitted; `moment: {date, time, place}` from `#ho-date`,
  `#ho-time` and the chosen place; `house: 1..12` | `'regiomontanus'` | the question
  text, clipped to 240 |
| `synastry`, `composite`, `davison` | `partner` (the second person's `birth`, same
  shape as `birth`) | house system | — |
| `bazi` | `pillar` (the selected Four Pillars tab, `0`–`3`) | `'four-pillars'` | — |
| `jyotish` | `tab` (the open Jyotish view), `gochar` (the selected Gochar date) | `'sidereal'` | — |

### Disclosure notes

- One-person charts: "Saving stores the birth details this chart was cast from."
- Two-person charts: "Saving stores both people’s birth details."
- Horary: "Saving stores the moment, the place and your question."

### Restored gate

While a reopened chart is on screen, profile pushes are ignored by that room; a "Use my
chart" button clears the gate and re-renders from the live profile. Horary keeps no gate
object — a fresh "Cast the chart" click always replaces the result outright — but does
skip refreshing its default place while a saved question is open.

In `celestial-extras.js`, the save button's kind follows whichever method (Synastry,
Composite or Davison) is currently in view. "Use my chart" restores the reader's own
chart from the gate but leaves the partner form and the compared `partner` chart alone,
so a two-person reading stays comparable after returning to the live profile. If
reopening a saved two-person or BaZi chart fails its readiness check, `load()` rolls
back every field it had changed, including the partner form, rather than leaving the
page saved-but-broken. In `jyotish.js`, reopening a saved chart also restores the tab
it was saved from (`payload.tab`), not always Rashi.

### Reopening

`?reading=ID` reaches the page through the shared opener (`rooms.js`'s
`Rooms.openFromQuery`), which calls `room.load(reading)` once sign-in resolves and
scrolls to `[data-room~="KIND"]`.

### Tests

`tests/chart-rooms.test.cjs` (7 tests), `tests/chart-in-time-room.test.cjs` (2),
`tests/horary-room.test.cjs` (1), `tests/celestial-extras-room.test.cjs` (1),
`tests/jyotish-room.test.cjs` (1); Django: `test_c5_kinds_are_charts`,
`test_two_person_chart_kinds_save`.

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

The session cookie is same-origin only, so exercising the sign-in dialog, account panel, or
journal in a browser needs the static site and the API served from one origin. Nginx does that in
production, and continues to at every future stage including after the newsletter cutover (see
"Newsletter cutover" below) -- Django never serves the static site. `runserver` alone only serves
`/api/`, `/admin/`, and `/_allauth/`, so to check the signed-in UI locally, temporarily append this
to `ishtar/urls.py` -- **do not commit it**:

```python
from django.conf import settings
from django.views.static import serve
if settings.DEBUG:
    from django.urls import re_path
    urlpatterns += [re_path(r'^(?P<path>.*)$', lambda request, path: serve(request, path or 'index.html', document_root=settings.BASE_DIR.parent.parent))]
```

It only takes effect when `DEBUG` is true, which never happens in production (`DJANGO_DEBUG`
appears in neither `ishtar-app.env.example` nor `deploy-app.sh`'s required-variable check), but
revert it (`git checkout -- ishtar/urls.py`) before committing anything else -- nginx serving the
static site is the permanent design, not a placeholder this route will ever graduate into filling.
Then run the server as above with `DJANGO_DEBUG=1` and open `http://127.0.0.1:8000/`.

## Environment file

`server/ishtar-app.env.example` documents every variable the app reads from the environment, but
it is a reference template only -- never copy it over the real file. `/etc/ishtar-app.env` already
exists on the VPS (mode 600, root-owned) with a working `RESEND_API_KEY` and `DJANGO_FROM_EMAIL`,
verified end-to-end with a real delivered send (see docs/deployment.md, "Resend transactional
email"). Deploying this service means appending the remaining variables --
`DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `NEWSLETTER_ORIGINS` --
to the existing file, not regenerating it. `deploy-app.sh` never chowns or chmods this file -- even
tightening its permissions would mean silently modifying a file that holds a live key. Instead it
asserts the file is not group- or world-readable and is owned by root, refusing to deploy and
naming every problem found, if not; it also refuses to proceed if any of the six variables the app
needs is missing or empty. Readability alone would not be enough to check: systemd reads
`EnvironmentFile=` as root, in PID 1, before dropping to `User=ishtar-app`, so ownership was never
relevant to *that* read -- but the gunicorn worker itself runs as `User=ishtar-app` under
`ProtectSystem=strict`/`ProtectHome=true`, neither of which covers `/etc`, so a file merely mode
600 but owned by `ishtar-app` would still be directly readable, and writable, by that same account.

Values containing spaces must stay quoted (e.g. `DJANGO_FROM_EMAIL="Ishtar Insights
<hello@ishtarinsights.com>"`) so the file works both when sourced by POSIX `sh` and when read by
systemd's `EnvironmentFile=`.

## Deploy

See docs/deployment.md, section "Accounts service".

`server/deploy-app.sh` installs or updates `/opt/ishtar-app`, migrates, creates the cache table,
collects static files, (re)starts the `ishtar-app` unit, wires the new locations into nginx,
installs the nightly backup script and its cron entry (see "Backups" below), and health-checks
`http://127.0.0.1:8138/api/health/`. It is safe to re-run: user creation, directory creation, the
venv, `pip install`, `migrate`, `createcachetable`, `collectstatic`, `systemctl enable`/`restart`,
the nginx edit, and the backup install are all no-ops or converge to the same result when nothing
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

`deploy-app.sh` installs `server/backup-ishtar-app.sh` to `/opt/ishtar-app/backup-ishtar-app.sh`
(root-owned, mode 755, outside the app's own `app/` tree so `rsync --delete` never touches it, and
unwritable by `ishtar-app` so a compromised app process can't tamper with the script that reads the
database) and writes root's `/etc/cron.d/ishtar-app-backup` pointing at it, on every deploy. Both
steps write identical content each run, so re-deploying converges rather than duplicating or
drifting the cron entry. It runs nightly at 03:17 into `/var/backups/ishtar-app/`, keeping fourteen
copies. Each backup is taken with SQLite's online backup API (safe against a live WAL-mode
database), then independently reopened and checked -- non-zero size, `PRAGMA integrity_check`, and
the same table count the source had -- before the script allows it to count toward rotation; any
check failing aborts the whole run (`set -eu`) before any older backup is deleted, so a bad backup
can never age out a good one.
