# Handoff: build the Ishtar Insights accounts feature

Written 2026-09-09 by Claude (Fable 5.1) for another Claude session to execute.

## Your first action

Invoke the `superpowers:subagent-driven-development` skill with the plan below. Do not
re-brainstorm, re-plan, or re-open decisions. Everything in the spec and plan was approved
by Glenn in conversation on 2026-09-09.

- Spec (approved): `docs/superpowers/specs/2026-09-09-accounts-design.md`
- Plan (13 tasks, TDD, one commit per task): `docs/superpowers/plans/2026-09-09-accounts.md`

Execute the tasks in order. Each task's implementer subagent needs only its own task text plus
the plan's header and Global Constraints. Review each result against the spec before moving on.

## What is already done

- Repo: `V:\tarot_game` (also `\\gato_nas\Web_App_Dev_Projects\tarot_game`), branch `main`,
  remote `https://github.com/Glenn-castshadow/tarot-deck-gallery.git`. Tree is clean at `f10921a`.
- All prior uncommitted website work (divination room, newsletter, consent, VPS deploy docs) was
  committed and pushed today as `1d26ec8`. Nothing is pending.
- Live site: https://ishtarinsights.com served from `/opt/tarot-game/current` on the VPS
  (SSH alias `vps`, 129.121.126.72, Ubuntu 24.04, Python 3.12, no system pip, `python3-venv`
  works). The old stdlib newsletter service `ishtar-newsletter` is still running on 8137 and is
  replaced by the Django app in Task 6 and cut over in Task 13.
- Pre-checked facts the plan relies on: allauth headless endpoint shapes, anymail Resend
  settings, the exact newsletter contract in `server/newsletter.py`, frontend state locations in
  `app.js` and `divination.js`, the nginx site file layout. Task 2 has a fallback step in case the
  installed allauth does not create users for unknown emails on code login.

## Local environment

- Windows. Python is `py -3` (3.11) and `uv` is on PATH; Node is v24. Plain `python` is a
  Microsoft Store stub and fails. The plan's commands use
  `server/ishtar/.venv/Scripts/python.exe` after `uv venv --python 3.11 .venv`.
- Existing tests: `node --test tests/*.test.cjs` (74 pass at handoff). Running `node --test tests/`
  on the directory fails because it picks up non-test files; always pass the glob.
- Bash tool is Git Bash. CRLF warnings on commit are normal; use `git -c core.safecrlf=false`.

## Resend: DONE (was "Waiting on Glenn", Task 13)

Completed 2026-09-09. Task 13 is no longer blocked on Glenn; nothing is outstanding here.

- Resend account exists (team `castshadow`, glenn@castshadow.com, GitHub sign-in).
- Sending domain `ishtarinsights.com` is **Verified** (id b754ed9e-a723-41a0-9a68-2f16530a6bd5,
  region us-east-1). DKIM TXT, the two sending CNAMEs and a monitoring DMARC record are live in
  the Bluehost zone. Resend's inbound MX was deliberately not added.
- `/etc/ishtar-app.env` already exists on the VPS, mode 600 root-owned, holding `RESEND_API_KEY`
  (sending-only key `ishtar-app-vps`, scoped to the domain) and `DJANGO_FROM_EMAIL`. Task 12/13
  should ADD the remaining variables to this file rather than overwriting it. Keep values with
  spaces quoted so the file can be sourced by a shell as well as read by systemd.
- End-to-end proven: a live send from the VPS returned HTTP 200 and Resend recorded Delivered.

Correction to the old note: the SPF/DKIM records are NOT reachable through Bluehost cPanel UAPI.
Both candidate accounts return "You do not possess permission to read the zone for
ishtarinsights.com". The zone is edited only in the Bluehost account panel under
Domains > ishtarinsights.com > Manage Advanced DNS Records. Full details in docs/deployment.md.

Tasks 1 through 12 never needed any of this. Still true: never type the key into a page or a log.

## Conventions to keep

- Every commit ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (or the
  trailer your own harness specifies).
- Open-source maintained libraries only; no hand-rolled auth, sessions, or mail (Glenn's global
  rule, already reflected in the stack: Django, django-allauth headless, django-anymail, whitenoise,
  gunicorn).
- No subscriber or account data in Git, Honcho, or logs.
- Frontend stays vanilla JS with `?v=` cache keys on script and stylesheet tags; bump them when
  you change a file (Task 11 lists the bumps).
- Deploy the static site as a new dated release directory and swap the `current` symlink; keep
  the previous release (see `docs/deployment.md`).
- Log durable outcomes to Honcho workspace `wiskey-journal` as peer `Claude` when the tools are
  loaded; skip silently if they are not.

## Done means

All 13 tasks committed and pushed, Django and node suites green, live checks in Task 13 step 6
passed on https://ishtarinsights.com, docs updated, and Glenn given the one-time superuser
password with a request to change it in the admin.
