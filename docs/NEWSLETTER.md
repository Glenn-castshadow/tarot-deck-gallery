# Newsletter signup operations

## Mailchimp audience sync (2026-09-18)

Design: `docs/superpowers/specs/2026-09-18-newsletter-mailchimp-sync-design.md`.

- The VPS table stays the source of truth. `newsletter/mailchimp.py` is the only code that talks
  to Mailchimp and does nothing while `MAILCHIMP_API_KEY` is unset.
- Signup, sign change and unsubscribe push inline (5 s timeout, failures swallowed and logged
  without the address). `manage.py sync_mailchimp` runs from `/etc/cron.d/ishtar-app-mailchimp`
  every 10 minutes and repairs any difference, including unsubscribes and bounces that happened
  inside Mailchimp. It prints counts only.
- New members enter Mailchimp as `pending`; Mailchimp's confirmation email is the double opt-in.
  Rows recorded under consent v1 are pushed the same way, so the confirmation is their fresh opt-in.
- Merge fields: `SIGN` (the chosen sun sign or empty) and `SITEUNSUB` (the VPS unsubscribe URL).
  Every campaign template must link `*|SITEUNSUB|*` or Mailchimp's own unsubscribe tag.
- Consent version `2026-09-18-v2` names Mailchimp. `Subscriber.sun_sign` is the only new stored field.
- `newsletter/mailchimp.py` calls the Mailchimp Marketing REST API directly with stdlib `urllib`
  (HTTP Basic auth, 5 s timeout). `mailchimp-marketing`, Mailchimp's official SDK, was tried and
  dropped: its licence (Mailchimp's own "Client Library License Agreement") is not open source.
- Glenn's manual setup: audience with double opt-in on, the two merge fields, sending-domain
  authentication, and the three `MAILCHIMP_*` lines in `/etc/ishtar-app.env`.
- Deployed 2026-09-18 at `8a638d9` (docs/deployment.md). Account: Mailchimp data centre `us12`, audience
  "Ishtar Insights" `4b20600701`, from-address `newsletter@ishtarinsights.com`. Mail to the domain is
  forwarded by ImprovMX (catch-all to Glenn's inbox); the MX, SPF and DKIM records are in the Bluehost
  portal under Domains, Advanced DNS.
- Order: finish Glenn's four manual steps above before the site release that carries the new
  signup copy, because that copy promises a confirmation email that is only sent once the key is
  set. Do sending-domain authentication before the key goes into `/etc/ishtar-app.env`: the first
  configured reconcile pushes every existing subscriber as `pending`, and Mailchimp sends them all
  a confirmation email at once.
- Reconcile errors append to `/var/log/ishtar-mailchimp.err` on the VPS; the file holds counts and
  tracebacks with md5 member hashes, never addresses.
- In Mailchimp, unsubscribe contacts, do not archive them. Archived contacts are invisible to the
  reconcile, which would push them again as `pending`.
- Known and accepted: someone who unsubscribes inside Mailchimp and signs up again on the site
  within the same ten-minute window is removed once more by the next run and has to sign up again.
- The reconcile refuses to run when the database has no subscribers but the audience does, and it
  keeps going past individual rejected addresses, reporting `failed=N`.

Deployed 2026-09-09 as a stdlib service; moved into the Django account service on 2026-09-10
(server/ishtar, `newsletter` app) with the same public contract. Glenn chose private VPS storage
for export later.

Current service (2026-09-10 onward):

- Service: `ishtar-app`, user `ishtar-app`, loopback `127.0.0.1:8138`, same `/api/newsletter/`
  paths and responses as before (200 `{"ok": true}`, 400, 403 foreign Origin, 413, 415).
- Database: `/var/lib/ishtar-app/db.sqlite3` (table `newsletter_subscriber`), nightly backup to
  `/var/backups/ishtar-app`. Signed-in members can toggle the same subscription from the account panel.
- Retired: unit `ishtar-newsletter` on 8137 is disabled after cutover; its database stays in place
  for rollback. `server/newsletter.py` is kept only as the import fixture reference.

Original notes (2026-09-09):


- Service: `ishtar-newsletter`, user `ishtar-newsletter`, loopback `127.0.0.1:8137`.
- Source on server: `/opt/ishtar-newsletter/newsletter.py`.
- Database: `/var/lib/ishtar-newsletter/subscribers.sqlite3` (directory 0700, file 0600).
- Nginx proxies only `/api/newsletter/`; request limit 1 KB, 10/minute/IP with burst 10.
- Validated same-site Origin, explicit consent and fixed consent text version required.
- Only email, consent timestamp/version/text and unsubscribe token are retained. No birth details.
- Subscriber DB and export are never served as website files. No public list endpoint.
- Until 2026-09-18: No email is sent. Address ownership is NOT verified: this is single opt-in capture.
- Before importing/sending, select a delivery provider, update newsletter privacy with that provider,
  and configure sender identity, sending-domain authentication and unsubscribe handling.
- `unsubscribe.html` removes by address or by per-subscriber token in URL fragment.
  Every future email must carry a working unsubscribe link. Re-export immediately before
  importing a list so previous removals are respected; after migration sync removals with provider.
- Do not create public exports or put subscriber data in Git/Honcho/logs.

## Private export

From an authorized shell, stream CSV over SSH to a private local destination:

```powershell
ssh vps 'cd /opt/ishtar-app/app && set -a && . /etc/ishtar-app.env && set +a && DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3 sudo -u ishtar-app -E /opt/ishtar-app/venv/bin/python manage.py export_subscribers' > C:/Users/glenn/ishtar-newsletter-private.csv
```

CSV includes an unsubscribe URL. Spreadsheet formula-leading email addresses are prefixed
with an apostrophe for spreadsheet safety; handle that prefix when importing such addresses.
No export was generated during setup. This is not an automated backup service.

## Checks

`cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter` (the contract tests now live in
`server/ishtar/newsletter/tests`; `tests/test_newsletter.py` covers only the retired stdlib service).

Live API checks: signup and duplicate both 200, decline rejected 400, foreign Origin 403,
unsubscribe 200. Synthetic fixture addresses removed after testing. Browser verified unchecked
consent and invalid optional email not blocking birth readings. Full browser signup test was
blocked by unrelated Chrome extension UI; API path was verified directly instead.

Deploy helper assumes the source and unit are staged at `/tmp/ishtar-newsletter.py` and
`/tmp/ishtar-newsletter.service`; run `server/deploy-newsletter.sh` on VPS. Public runtime files
are newsletter.js, newsletter-privacy.html, unsubscribe.html and unsubscribe.js, plus updated
index.html/styles.css/cookie-policy.html. Keep server/ outside the public release.
