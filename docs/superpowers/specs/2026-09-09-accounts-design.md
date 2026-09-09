# Ishtar Insights accounts: design

Date: 2026-09-09. Status: approved in conversation, awaiting written review.

## Goal

Give visitors an optional account that syncs their birth profile, saves readings
as a journal, and shows their newsletter preference, with entitlement plumbing
ready for a future paywall. No payment integration in this version.

## Decisions already made

| Decision | Choice | Source |
|---|---|---|
| Login method | Passwordless six-digit email code | Glenn, 2026-09-09 |
| Paywall scope | None yet; entitlements only | Glenn, 2026-09-09 |
| Account value in v1 | Profile sync, saved readings, newsletter preference | Glenn, 2026-09-09 |
| Email provider | Resend; Mailchimp stays for the newsletter | Glenn, 2026-09-09 |
| Stack | Django, django-allauth headless, django-anymail | Glenn approved approach A |
| Data location | On the VPS, not a third party | Glenn's earlier newsletter decision |

## Global constraints

- **Open source, maintained libraries; no hand-rolled auth, sessions, or mail.**
  Source: Glenn's global CLAUDE.md dependency rule.
- **Account and reading data stay on the VPS.** Source: Glenn, when the
  newsletter was built and reaffirmed by rejecting hosted Supabase.
- **Existing newsletter endpoints keep their paths and behaviour.** Source: my
  judgement, so the deployed newsletter.js and unsubscribe.js need no change.
- **The frontend stays vanilla JS with no build step.** Source: existing
  codebase convention, see docs/deployment.md.
- **Frontend behaviour when signed out is unchanged.** Source: my judgement; the
  consent-gated localStorage path is already live and verified.
- **No subscriber or account data in Git, Honcho, or logs.** Source: existing
  rule in docs/NEWSLETTER.md.

## Architecture

One Django project, `ishtar`, runs under gunicorn on a loopback port behind the
existing nginx site. Nginx proxies three prefixes to it and serves everything
else statically as today:

- `/api/` site endpoints
- `/_allauth/` allauth headless auth endpoints
- `/admin/` Django admin, superuser password login only

Three Django apps:

- `accounts`: custom user model, profile, entitlement
- `readings`: saved readings
- `newsletter`: subscriber model and the two public endpoints

Libraries: Django 5.x LTS, django-allauth with the headless extra, django-anymail
with the Resend backend, whitenoise for admin static files, gunicorn. SQLite in
WAL mode is the database. Postgres is not needed at this volume and can be
adopted later through Django's normal migration path.

## Data model

**User** (`accounts.User`, `AUTH_USER_MODEL`). Email is the identifier and is
unique and case-insensitive. Visitors have an unusable password. Superusers set
a password for the admin.

**Profile** (`accounts.Profile`, one-to-one with User).

- `version` integer, starts at 1
- `data` JSON: the exact object app.js writes under the `arcana-birthday-profile-v1`
  localStorage key
- `updated_at`

Server validation checks the object is a JSON object under 4 KB with only the
keys the frontend writes. The server does not interpret the fields.

**Reading** (`readings.Reading`, many per User).

- `kind` enum: `tarot-daily`, `tarot-spread`, `lenormand`, `oracle`, `runes`, `geomancy`
- `deck` string, the reading deck id, blank for non-tarot kinds
- `layout` string, the spread or line id, blank for daily
- `question` string up to 240 characters, matching the frontend limit
- `focus` string, blank when not applicable
- `payload` JSON: the draw object the frontend already produces (tarot: card
  indices and orientations; geomancy: the four mother rows; others: the drawn
  ids and orientations), under 8 KB
- `note` text up to 4000 characters, the journal entry, optional
- `created_at`

**Entitlement** (`accounts.Entitlement`, many per User).

- `feature` string key, for example `member`
- `source` enum: `manual`, `stripe`
- `starts_at`, `ends_at` nullable
- `reference` string, blank now, holds the Stripe subscription id later

An entitlement is active when `starts_at <= now` and `ends_at` is null or in the
future. The account summary returns the distinct active feature keys.

**Subscriber** (`newsletter.Subscriber`). Same columns as the current SQLite
table: email primary key, consent time, consent version, consent text,
unsubscribe token. A management command `import_subscribers` reads the old
database file and inserts rows with insert-or-ignore semantics.

## Login flow

Allauth headless in browser mode, login-by-code enabled, signup open with email as
the only field.

1. Visitor submits an email. Client calls the allauth request-code endpoint.
2. Allauth generates a six-digit code, stores it against the session, and sends
   it through anymail to Resend. Unknown emails follow allauth's anti-enumeration
   path so the response is identical either way.
3. Visitor submits the code. Allauth confirms it, creates the user if this is a
   first sign-in, and sets the session cookie.
4. Sign out calls the allauth logout endpoint.

Allauth's rate limits stay at their defaults for code requests and confirm
attempts. Code lifetime uses allauth's default. Session cookie is HttpOnly,
Secure, SameSite Lax, lifetime 30 days, refreshed on activity.

If allauth's signup-by-code path turns out not to create users for unknown
emails in the installed version, a thin allauth adapter override creates the
user during the code request. That is an implementation detail, not a design
change.

## API

All endpoints are JSON, same-origin, and require a session unless marked
public. CSRF uses Django's cookie plus header scheme; the client reads the
cookie and sends the header.

| Method and path | Purpose |
|---|---|
| GET `/api/account/` | email, active entitlement keys, profile data or null, newsletter status |
| PUT `/api/account/profile/` | replace profile data |
| DELETE `/api/account/profile/` | clear profile |
| GET `/api/readings/` | list, newest first, paginated 50 per page, payloads excluded |
| POST `/api/readings/` | create; returns the row |
| GET `/api/readings/{id}/` | one reading with payload |
| PATCH `/api/readings/{id}/` | update note only |
| DELETE `/api/readings/{id}/` | delete |
| POST `/api/account/newsletter/` | body `{"subscribed": true or false}`; subscribe or unsubscribe the user's own email |
| POST `/api/account/delete/` | delete user, profile, readings, and session; subscriber row is left alone since consent was given separately |
| POST `/api/newsletter/subscribe/` | public, unchanged contract from server/newsletter.py |
| POST `/api/newsletter/unsubscribe/` | public, unchanged contract from server/newsletter.py |

Readings are always filtered by the requesting user. A reading id belonging to
another user returns 404, never 403. Per-user reading cap of 500 rows; creating
beyond it returns 409 with a message.

Error shape: `{"error": "human readable message"}` with a 4xx status.

## Frontend

New files: `account.js`, `account.css`. Edits: `index.html` (header control,
dialog, panel), `storage-preferences.js` (server-backed profile when signed in),
`tarot-readings.js` and `divination.js` (save button and load-a-draw hook),
`app.js` (daily card save button), `cookie-policy.html` (session cookie
paragraph).

**Account module** (`account.js`) exposes a small global, `IshtarAccount`:

- `state()`: `{ signedIn, email, features, profile, newsletter }`
- `has(feature)`: boolean over active features
- `signIn` dialog control, `signOut()`
- `saveReading(reading)`, `listReadings()`, `openReading(id)`, `deleteReading(id)`
- `onChange(listener)` for UI pieces that react to sign-in state

All network calls go through one `fetch` wrapper that sets the CSRF header and
maps errors. The module is written so its logic can run under node with a mocked
fetch and a mocked document.

**Header control.** A "Sign in" button. Signed in, it shows the email and opens
the account panel.

**Sign-in dialog.** Native `<dialog>`, two steps: email, then code, with a
resend link and status text. Focus management and Escape follow the pattern of
the existing artwork dialog.

**Account panel.** A section near the newsletter block: email, newsletter
toggle, saved readings list (kind, layout, question, date, open, delete),
profile sync status line, sign out, delete account behind a confirm.

**Profile sync.** `storage-preferences.js` gains a server-backed path for the
profile key only. Signed in: reads return the server copy fetched at sign-in,
writes go to the server and update the in-memory copy. On sign-in the server
copy replaces any local copy. Signed out: unchanged behaviour. The rest of app.js
keeps calling `IshtarStorage.getItem` and `setItem` and does not know which path
is active.

**Saving readings.** When signed in, a "Save this reading" button renders after
a spread, the daily card, and each divination result. It posts the kind, deck,
layout, question, focus, and payload. Opening a saved reading calls a new
`loadDraw(payload, options)` function in the tarot and divination modules that
sets state to the given draw with all positions revealed and rerenders, in place
of dealing. Deck switching on a loaded reading works as it does for a fresh one.

**Entitlements.** `IshtarAccount.has('member')` is available. No feature is
gated in this version.

**Consent.** The session and CSRF cookies are strictly necessary for login and
are set without the storage banner's permission. The cookie policy page says
so. Declining optional storage does not sign the visitor out.

## Deployment

- Path `/opt/ishtar-app` with a venv, system user `ishtar-app`, systemd unit
  hardened like `server/ishtar-newsletter.service`, gunicorn on `127.0.0.1:8138`
  with two workers.
- State directory `/var/lib/ishtar-app` mode 700 holds `db.sqlite3`.
- Secrets file `/etc/ishtar-app.env` mode 600 owned by root and readable by the
  service via systemd `EnvironmentFile`: `DJANGO_SECRET_KEY`, `RESEND_API_KEY`,
  `DJANGO_ALLOWED_HOSTS`.
- Nginx: three `location` blocks proxying to the gunicorn port with the same
  headers and body limit pattern the newsletter block uses. Request body limit
  16 KB for the API prefixes.
- Static: whitenoise serves admin assets from the app; nginx has no static rule
  for the app.
- Newsletter migration: deploy the app, run `import_subscribers` against
  `/var/lib/ishtar-newsletter/subscribers.sqlite3`, point the newsletter nginx
  location at the new port, verify both endpoints with the same checks recorded
  in docs/NEWSLETTER.md, then stop and disable `ishtar-newsletter`. The old
  database file stays for rollback and is deleted only on a later explicit
  decision.
- Resend: create the sending domain in Resend, add its SPF and DKIM records to
  the ishtarinsights.com zone at Bluehost. The from address is
  `Ishtar Insights <hello@ishtarinsights.com>`. If the Bluehost DNS panel needs
  Glenn's login, that step is handed to him with the exact records.
- Backups: root cron nightly runs `sqlite3 ... ".backup"` into
  `/var/backups/ishtar-app/` keeping fourteen dated copies.
- Deploy helper `server/deploy-app.sh`: rsync the app source, pip install from a
  pinned requirements file, migrate, collectstatic, restart the unit, run a
  health check against `/api/health/`.
- Superuser is created once with `createsuperuser` over SSH; the password is not
  stored anywhere in the repo.

Rollback is stopping the unit and, if the newsletter was already cut over,
pointing the newsletter location back at port 8137 and restarting the old unit.

## Error handling

- Mail send failure during code request: allauth returns success to the
  visitor to avoid enumeration, the failure is logged with the email redacted,
  and the frontend's status text tells the visitor to check spam or retry in a
  minute.
- Network failure on profile write while signed in: the in-memory copy keeps
  the value, the panel shows "not synced", and the next successful write or
  sign-in reconciles by pushing the local copy.
- Session expiry mid-use: the fetch wrapper maps 401 and 403 to a signed-out
  state and the UI returns to the signed-out rendering without losing the
  current unsaved reading.
- Invalid payloads return 400 with the message shown in the panel status.

## Testing

**Django tests** (`server/ishtar/tests/`): request and confirm code with the
locmem mail backend; wrong code, expired code, rate limit trip; profile
round-trip and size limit; readings create, list, get, patch note, delete; a
second user receives 404 for the first user's reading; reading cap; entitlement
active and expired; both newsletter endpoints against the contract in
`tests/test_newsletter.py`; `import_subscribers` idempotence; account delete
cascade.

**Frontend tests** (`tests/account.test.cjs`): account module state machine
with mocked fetch: sign-in flow, error mapping to signed-out, profile sync path
in the storage wrapper, save and load reading round-trip through `loadDraw`.

**Live checks after deploy**: real code email to Glenn's address through
Resend; sign in on desktop and at 390 px; save a Celtic Cross and a geomancy
cast, reopen both; newsletter toggle round-trip; admin login; delete account;
existing 72 node tests and the Python newsletter tests pass.

## Out of scope

Stripe and any payment flow, gating of any feature, dream and moon journals,
Google sign-in, account merge or email change, Postgres.
