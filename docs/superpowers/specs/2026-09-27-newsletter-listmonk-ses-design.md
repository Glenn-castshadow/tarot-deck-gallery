# Newsletter delivery moves from Mailchimp to listmonk + Amazon SES

**Date:** 2026-09-27. **Status:** design approved by Glenn in chat 2026-09-27; spec awaiting his review.

## Why

Mailchimp's abuse review disabled `Ishtar Insights 2026-09-28`, the first unattended issue, under its Acceptable
Use Policy: "Content promising to solve personal issues based on astrological signs or predictions is prohibited."
Only educational astrology is allowed, and repeat violations can suspend the account. A per-sign weekly reading is
the prohibited category itself, so rewording cannot fix it. `--send` was removed from the Sunday job the same day;
the job still builds and drafts.

The API call to send returned success before the review ran, so the job logged `SENT … rc=0` for mail that never
went out. Its health signal lied, and the replacement must not repeat that.

## Decisions taken with Glenn

1. **listmonk, self-hosted on the VPS, relaying through Amazon SES.** (Glenn, 2026-09-27, after a comparison of
   free tiers.) listmonk is AGPL-3.0. The AWS Acceptable Use Policy has no clause on astrology content (checked
   2026-09-27).
2. **The site's database stays the source of truth** (Glenn chose option A). listmonk is a pushed copy, exactly
   as Mailchimp was, so the views, model, account toggle and consent record keep their shape.
3. **Glenn has no AWS account.** He creates it and does the four steps only he can (below).
4. **No postal address in the email.** (Glenn.) Mailchimp forced one into the footer; nothing here does. CAN-SPAM
   requires one only in commercial email; Glenn was told the consent text's "updates about new readings and
   features" is the part that could read as commercial, and that a PO box is a one-line footer change later.
5. listmonk runs in **Docker Compose with its own Postgres**, the pattern Umami already uses on the VPS. (Claude's
   recommendation; Glenn did not object.)
6. Everything else below is Claude's design, approved section by section.

## Constraints

| Constraint | Source |
|---|---|
| Dependencies are open source | Glenn's global instructions |
| A delivery failure never fails or delays a signup beyond the timeout | Existing (`views.safely`, Mailchimp spec) |
| Subscriber data stays out of Git, Honcho and logs; output prints counts, never addresses | Existing `NEWSLETTER.md` rule |
| Every email carries a working unsubscribe link | Existing `NEWSLETTER.md` rule |
| No birth details are stored; the sign is a value the subscriber picks | Existing `NEWSLETTER.md` rule |
| Secrets (SES SMTP password, listmonk admin password, API token) go on the VPS only, never committed | Claude's operating rules |
| listmonk's admin UI and API are never reachable from the internet | Claude's judgement |
| No mail is sent through SES until AWS has granted production access | Claude's judgement (sandbox mail to unverified addresses fails) |
| `rc=0` from the Sunday job means SES accepted every message, not that an API call returned | Claude's judgement, from the 2026-09-27 failure |
| Nothing Glimmer writes can alter the template's control flow | Existing untrusted-text rule, re-targeted |

## Architecture

### VPS

- **`/opt/listmonk`**: `docker-compose.yml` with `listmonk/listmonk:v6.2.0` and `postgres:17-alpine`, both
  pinned. listmonk publishes `127.0.0.1:9000` only; Postgres publishes nothing. Credentials in
  `/opt/listmonk/.env` (0600, root). A nightly cron `pg_dump` writes to `/var/backups/listmonk`, keeping 14.
- **nginx site `news.ishtarinsights.com`**, certbot TLS. It proxies only what a reader or SES needs:
  `/subscription/` (confirm, unsubscribe, manage), `/campaign/` (view in browser), `/link/` (click redirects),
  `/public/` (listmonk's static files for those pages), `/webhooks/service/ses`. Every other path, including
  `/admin` and `/api`, returns 404. Glenn reaches the admin through `ssh -L 9000:127.0.0.1:9000 vps`.
- **listmonk settings live in code.** `manage.py setup_listmonk` writes them through the API and is safe to re-run:
  root URL `https://news.ishtarinsights.com`; from `Ishtar Insights <newsletter@ishtarinsights.com>`; one SMTP
  server, `email-smtp.us-east-1.amazonaws.com:587` STARTTLS with SES SMTP credentials read from the environment;
  bounce processing and the SES webhook on; individual open and click tracking off; the public subscription
  page off (signups come only through the site); one private **double opt-in** list "Ishtar Insights". It prints
  the list id for `LISTMONK_LIST_ID`.
- The one-time admin user and the API user (whose token Django uses) are created by hand in the admin UI at install,
  the only clicks in the design.

### Django (`server/ishtar/newsletter`)

- **`listmonk.py` replaces `mailchimp.py`** with the same public surface: `SIGNS`, `configured()`, `push(subscriber,
  resubscribe=False)`, `remove(email)`, `members()` yielding `(email, status)`. It calls the listmonk REST API with
  stdlib `urllib`, `Authorization: token <user>:<token>`, 5 s timeout. `configured()` is false while
  `LISTMONK_API_TOKEN` is unset, and every call is then a no-op, as today.
  - `push` creates the subscriber on the list as **unconfirmed** with attributes `{sign, siteunsub}` (listmonk then
    sends its opt-in email), or updates the attributes if they exist. It never re-adds someone who unsubscribed,
    except when `resubscribe=True` (a fresh signup on the site), which re-adds them unconfirmed and requests a new
    opt-in email.
  - `members()` maps listmonk's state to the reconcile's two sets: list subscription `unconfirmed` or `confirmed`
    on an enabled subscriber is **live**; subscription `unsubscribed`, or a `blocklisted` subscriber (listmonk
    blocklists on hard bounce and complaint) is **gone**.
- **`sync_listmonk` replaces `sync_mailchimp`**, same logic and guards: refuse when the database is empty but the
  list is not; push rows missing from listmonk; remove live members with no row; delete rows whose member is gone;
  keep going past individual failures and report `failed=N`. Cron `/etc/cron.d/ishtar-app-listmonk`, every 10
  minutes, errors to `/var/log/ishtar-listmonk.err`.
- **`draft_campaign` keeps its name, arguments and the `ishtar-draft-campaign` wrapper.** Inside:
  1. Check the pushed HTML against the manifest sha256 (unchanged).
  2. Find the campaign named `Ishtar Insights <monday>`. A campaign in any status but `draft` is never touched; a
     draft is overwritten only with `--replace`.
  3. Create or update it: list, subject, from, `content_type: html`, the body, and a template that is only
     `{{ template "content" . }}`, so the issue HTML is the whole email.
  4. Render listmonk's own preview of the campaign; a template error stops here.
  5. `--test addr` sends a test to that address, which must be a subscriber. listmonk fills attributes in tests, so
     the test shows that subscriber's sign.
  6. `--send` refuses unless `signs_missing` is empty and the preview rendered. It then sets the status to
     `running` and **waits** (polling, up to 15 minutes) until listmonk reports `finished` with `sent` equal to
     `to_send`. `paused` (listmonk pauses a campaign when SMTP errors pass its threshold), `cancelled`, a shortfall,
     or the timeout raise, so the job's result is non-zero.
- New settings from the environment: `LISTMONK_URL` (default `http://127.0.0.1:9000`), `LISTMONK_API_USER`,
  `LISTMONK_API_TOKEN`, `LISTMONK_LIST_ID`; `setup_listmonk` also reads `SES_SMTP_USER`, `SES_SMTP_PASSWORD`.

### Builder (`tools/build_newsletter.cjs`)

- The sign chain becomes Go template syntax:
  `{{ if eq .Subscriber.Attribs.sign "aries" }} … {{ else if eq .Subscriber.Attribs.sign "taurus" }} … {{ else }}`
  invitation `{{ end }}`.
- The footer: `{{ UnsubscribeURL }}` (Unsubscribe), `{{ .Subscriber.Attribs.siteunsub }}` (Unsubscribe on the
  site), `{{ MessageURL }}` (View in your browser), the privacy link. The Mailchimp address and referral badge tags
  go, and no postal address replaces them.
- **Preview text** moves into the HTML as a hidden preheader at the top of the body, since listmonk has no
  preview-text field. The manifest keeps `preview` for the local preview page.
- **Untrusted text:** `esc` escapes `{` and `}` (`&#123;` `&#125;`) instead of `|`, and `plain()` strips braces from
  the subject. A reading containing `{{ end }}` renders as text.
- `preview.html` substitutes listmonk's tags instead of Mailchimp's.

### Copy

- Consent version `2026-09-27-v3`; `NEWSLETTER_CONSENT_TEXT` ends "Emails are sent from our own server through
  Amazon Web Services." instead of naming Mailchimp.
- `newsletter-privacy.html` and `privacy.html`: Mailchimp is replaced by the self-hosted list and Amazon SES
  (US region) as the processor that relays mail. What is stored is unchanged: email, sign, consent record.

### Removed at the end

`mailchimp.py`, `sync_mailchimp`, `test_mailchimp.py`, the `MAILCHIMP_*` settings and env lines, the
`ishtar-app-mailchimp` cron file and its log. The Mailchimp account is Glenn's to close; nothing depends on it.

## Existing subscribers

The two current rows are pushed like any new signup, so each receives one listmonk opt-in email: their consent to
the new sender, as the v1 to v2 move worked. Mailchimp's confirmation is not carried across providers.

## Cutover order

1. **Glenn:** create the AWS account; in SES (us-east-1) verify the domain `ishtarinsights.com` and add its three
   DKIM CNAMEs in Bluehost; add an A record `news` → `129.121.126.72`; create an SNS topic for bounces and
   complaints; request production access; create SMTP credentials. Claude writes the exact values and wording.
2. **Claude:** install listmonk, the nginx site and certbot; deploy the Django code with the listmonk variables
   unset (every call a no-op); run `setup_listmonk`; subscribe the SNS topic to the webhook.
3. **After AWS grants production access, and not before:** the listmonk variables go into `/etc/ishtar-app.env`.
   The next reconcile pushes the two subscribers and they get their opt-in emails.
4. The first issue is sent by hand: `ishtar-draft-campaign <monday> --test <Glenn's address>`, look, then
   `--send`. Then `--send` goes back into `weekly-prose.ps1`.
5. Remove the Mailchimp code and settings; delete the Mailchimp DKIM/SPF records from DNS if Glenn closes the
   account.

## Testing

- **Django:** port the newsletter tests to a stubbed `listmonk._request`. New: `push` with and without a sign;
  `resubscribe` re-adds an unsubscribed member and nothing else does; `members()` maps
  confirmed/unconfirmed/unsubscribed/blocklisted correctly; each `--send` gate refuses; the wait raises on
  `paused`, `cancelled`, shortfall and timeout and returns on `finished`. Every new test must fail with its fix
  removed (the RED-evidence rule).
- **Builder:** `tests/newsletter-build.test.cjs` moves to the new syntax, plus: a reading containing `{{ end }}` comes
  out escaped and the chain still has 12 `eq` branches and one `{{ end }}`; no `*|` survives in the output.
- **Live, on the VPS:** create one throwaway subscriber per sign, render the real campaign's preview for each, and
  check each shows only its own sign, then delete them. From outside: `/admin` and `/api/` are 404,
  `/subscription/form` does not offer a signup, and a static file under `/public/` is 200. One test email to Glenn before the first send.

## Out of scope

Open and click statistics, listmonk's public subscription form, a postal address, and moving other sites' mail to
listmonk.
