# VPS deployment

Live URLs: https://ishtarinsights.com/ and https://www.ishtarinsights.com/

Deployed 2026-09-09 from clean commit e11196f. SSH alias: `vps` (129.121.126.72).
Hover is the registrar; authoritative DNS is ns1.bluehost.com / ns2.bluehost.com.
Both hostnames have A records pointing to the VPS.

Nginx site: `/etc/nginx/sites-available/ishtarinsights.com`.
Web root: `/opt/tarot-game/current`, symlink to `/opt/tarot-game/releases/20260909-e11196f`.
The release contains index.html, root JavaScript/CSS, assets, tarot-decks, and vendor from Git.
No build step or application service is needed.

TLS is managed by Certbot for both names, with HTTP redirected to HTTPS.
Initial certificate expires 2026-12-08; certbot.timer is active for renewal.

For updates, archive the runtime paths from the desired clean Git commit, upload and extract
into a new release directory, then atomically replace the current symlink. Retain the previous
release for rollback. Never deploy the repository metadata, secrets, or source art directory.
Nginx configuration changes require `nginx -t` before reload.

Validation: both HTTPS hostnames return 200; all local assets referenced by the homepage,
the city index, and sample deck front/back images return 200. HTTP redirects to HTTPS.

## 2026-09-09 divination release

Current web root now points to `/opt/tarot-game/releases/20260909-divination`.
This release copies the prior live runtime (including consent and newsletter UI) and adds
Lenormand/oracle/runes/geomancy. Previous runtime is retained at
`/opt/tarot-game/releases/20260909-e11196f` for rollback. The Python newsletter service and
private subscriber database are outside both releases and were not changed by this update.

## 2026-09-09 GPT Image 2 artwork release

Current web root: /opt/tarot-game/releases/20260909-divination-art-v2.
Previous release /opt/tarot-game/releases/20260909-divination is retained for rollback.
Overlaid index.html, styles.css, divination.js/css, divination-art.js and
assets/divination-v2 (206 WebP files: 103 thumbnails and 103 detail images).
Generated masters and prompt files remain local. No newsletter service/database changes.
Validation: all 210 checked live page/script/art URLs returned successful responses;
all 206 WebP files decoded at expected dimensions. 72 existing tests pass.
Browser QA: reveals, artwork Face/Back dialog, rune symbols, geomancy shield,
and 320/390px responsive layouts. Removed the root 320px minimum width to avoid
scrollbar-induced overflow at a 320px viewport. Changes deployed from the working tree;
not committed or pushed by this release operation.

## 2026-09-09 Resend transactional email

Login codes for the accounts service (docs/superpowers/plans/2026-09-09-accounts.md) are sent
through Resend. Account team `castshadow`, owner glenn@castshadow.com, signed up via GitHub.
Free tier: 3,000 emails/month, 100/day, 3 domains. The 100/day cap is the limit that would
force a Pro upgrade; nothing else about the tier constrains this project.

Sending domain is the apex `ishtarinsights.com` (Resend domain id
b754ed9e-a723-41a0-9a68-2f16530a6bd5, region us-east-1 to match the Ashburn VPS). The apex was
chosen over a `send.` subdomain because the domain carried no existing mail at all, so there was
no sending reputation or SPF conflict to isolate, and `hello@ishtarinsights.com` is a better
sender for a login code. Verified 2026-09-09 16:19.

DNS is edited only through the Bluehost account panel: My Account > Domains > ishtarinsights.com
> Manage Advanced DNS Records. Neither shared cPanel account can reach this zone -- `cpapi2
ZoneEdit fetchzone` from both box2042 (vegbycmy) and box5508 (gkdesig2) returns "You do not
possess permission to read the zone". The zone lives at Bluehost account level. Records added:

    TXT    resend._domainkey   p=MIGfMA0G...lPiQIDAQAB   (DKIM)
    CNAME  rsend               rsend.forge.rmta.net      (sending)
    CNAME  send                send.forge.rmta.net       (sending)
    TXT    _dmarc              v=DMARC1; p=none;         (monitoring only)

Both A records for @ and www were left untouched. There is no classic `v=spf1` TXT record --
Resend delegates sending through the two CNAMEs, so adding a mail provider later will not
collide. Resend's "Enable Receiving" MX record (inbound-smtp.us-east-1.amazonaws.com) was
deliberately NOT added: it would route all inbound mail for the domain into Resend and block
real mailboxes on the domain. Add it only if inbound mail is ever wanted.

Credentials live in `/etc/ishtar-app.env`, mode 600, owned by root, holding `RESEND_API_KEY` and
`DJANGO_FROM_EMAIL`. The remaining variables from the accounts plan (DJANGO_SECRET_KEY,
DJANGO_ALLOWED_HOSTS, DJANGO_CSRF_TRUSTED_ORIGINS, NEWSLETTER_ORIGINS) are added when the
Django service is deployed. Values containing spaces must stay quoted so the file can be sourced
by a shell as well as read by systemd `EnvironmentFile`. The key is a sending-only key scoped to
ishtarinsights.com named `ishtar-app-vps`; it cannot create domains or read account data.

Validation: a live message was sent from the VPS with
`set -a; . /etc/ishtar-app.env; set +a` and a curl POST to https://api.resend.com/emails,
returning HTTP 200 and id 7cb8ee77-8c69-48c8-97d1-d2cf7a14e226, which Resend recorded as Sent
and then Delivered at 16:22.

## 2026-09-10 Accounts service

Django account service at /opt/ishtar-app (unit `ishtar-app`, gunicorn on 127.0.0.1:8138, SQLite at
/var/lib/ishtar-app/db.sqlite3, env /etc/ishtar-app.env with all six variables). Nginx proxies
/api/account/, /api/readings/, /api/health/, /_allauth/, /admin/ and /static/ to it; the pre-change
site file is kept at /etc/nginx/sites-available/ishtarinsights.com.before-accounts. Nightly backups
run from /etc/cron.d/ishtar-app-backup at 03:17 into /var/backups/ishtar-app (first backup taken
by hand on deploy day: 18 tables, integrity ok). Superuser glenn@castshadow.com was created with a
one-time password handed over in chat; change it in /admin/.

Deploy path from Windows (no local rsync): ship the committed tree with `git archive`, then strip
CRLF on the VPS because this repo stores CRLF blobs and `sh` rejects them:

```bash
ssh vps 'rm -rf /tmp/ishtar-app-src && mkdir -p /tmp/ishtar-app-src'
git archive --format=tar HEAD server/ishtar | ssh vps 'tar -xf - -C /tmp/ishtar-app-src --strip-components=2'
git archive --format=tar HEAD server/ishtar-app.service server/deploy-app.sh server/nginx-ishtar-app.conf server/backup-ishtar-app.sh | ssh vps 'tar -xf - -C /tmp --strip-components=1'
ssh vps 'sed -i "s/$//" /tmp/deploy-app.sh /tmp/backup-ishtar-app.sh /tmp/ishtar-app.service /tmp/nginx-ishtar-app.conf && find /tmp/ishtar-app-src -type f -exec sed -i "s/$//" {} +'
ssh vps 'sh /tmp/deploy-app.sh'
```

The deploy's final health check must send the real Host header (fixed in deploy-app.sh); Django
answers 400 DisallowedHost to a bare `127.0.0.1:8138` request, which is not a service failure.

Newsletter cutover: the existing subscriber row was imported with `manage.py import_subscribers`
(idempotent; re-run it after the nginx switch to catch signups that landed in the old database in
between). The nginx `/api/newsletter/` block is switched to `location ^~ /api/newsletter/` proxying
8138 (see docs/ACCOUNTS.md, "Newsletter cutover"); the pre-cutover site file is saved as
ishtarinsights.com.before-cutover. After a live 200/403/200 contract check the old unit is stopped
with `systemctl disable --now ishtar-newsletter`; its database stays at
/var/lib/ishtar-newsletter/subscribers.sqlite3 for rollback.

Frontend release for this change: /opt/tarot-game/releases/20260910-accounts, created as a
hardlink copy (`cp -al`) of 20260909-divination-art-v2 with the committed runtime files extracted
over it from `git archive HEAD` (index.html, the four root html pages, root js/css, vendor, assets,
tarot-decks). Cache keys: styles.css?v=accounts-2, account.js/app.js/tarot-readings.js/
divination-engine.js/divination.js ?v=accounts-3, storage-preferences.js ?v=accounts-1.

Rollback: `systemctl stop ishtar-app`, restore the nginx site from
ishtarinsights.com.before-accounts (or .before-cutover to undo only the newsletter switch),
`nginx -t && systemctl reload nginx`, `systemctl start ishtar-newsletter`, and point
/opt/tarot-game/current at /opt/tarot-game/releases/20260909-divination-art-v2.
