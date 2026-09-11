# Newsletter signup operations

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
- No email is sent. Address ownership is NOT verified: this is single opt-in capture.
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
