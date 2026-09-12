# VPS deployment

## 2026-09-12 Birth-detail saving fix and account preference

Deployed `480e650` as `/opt/tarot-game/releases/20260912-birth-saving-480e650`, retaining
`20260912-newsletter-6dfc54a` for frontend rollback. Updated accounts/models.py, views.py,
urls.py and migration `0004_user_save_birth_details` in `/opt/ishtar-app/app` and restarted
the account service. Migration applied successfully. Verified database backup and previous
backend modules are in `/opt/ishtar-app/rollback/20260912-birth-saving-480e650` (private).
Backend rollback can restore the three old modules and restart; the additive column may remain.
Do not restore the database snapshot over subsequent user activity for a code-only rollback.

Fixes: `returnLocation` from the current birth form was rejected by the account profile API;
guest details held only in memory were skipped when reconciling after sign-in. Both now save.
Added a persistent account-saving switch, immediate-save button, edit link, and account-area
browser-preference control. Turning account saving off deletes the cloud profile and blocks
new saves server-side; it does not turn off account sessions or subscribe/unsubscribe emails.
Saving defaults to on to retain existing account behavior. Details rejected before this fix
must be entered again if they are no longer on the reader's open page.

Validation: 317 JS tests and 60 Django tests pass; migrations check clean. Browser with an
isolated local Django database exercised decline browser saving → guest birth date/time and
confirmed Portland birthplace → account creation → reload with all fields restored, saving
off → reload empty with toggle off, then saving on → newly entered details restored. Mobile
390px had no overflow; the browser-saving prompt can be reopened from the account area.
Both HTTPS hostnames match all seven committed frontend files; all four backend files match;
live health returns 200 and the page loads without console errors. No real account details or
subscription preferences were changed by testing.

## 2026-09-12 Newsletter signup visibility

Deployed `6dfc54a` to `/opt/tarot-game/releases/20260912-newsletter-6dfc54a`; previous
`20260912-daily-horoscope-fc1a2bd` retained for rollback. Seven runtime files updated.
The signup fieldset hides and disables for subscribed accounts or after a successful signup.
Account preference changes restore it when unsubscribed. Guest signup success stores only
`arcana-newsletter-subscribed-v1` through the consent-aware IshtarStorage wrapper. Turning off
optional saving removes the persisted flag; the unsubscribe page clears it after success.
Existing anonymous subscribers from before this change need to sign in or complete the
idempotent signup again for the browser to recognize them. Account preferences remain authoritative.

Validation: 315 JS tests pass; local browser with mock account API verified already subscribed,
unsubscribe, and resubscribe flows, with the confirmation outside the hidden form. Both live
hostnames serve all seven files matching the commit; API health 200 and no live console errors.
No actual subscriptions were created or removed during testing. No backend changes.

## 2026-09-12 Daily horoscope deployment

Deployed frontend commit `fc1a2bd` as `/opt/tarot-game/releases/20260912-daily-horoscope-fc1a2bd`.
Previous release `/opt/tarot-game/releases/20260912-chart-colours` is retained for rollback.
The six changed runtime files were archived from the commit and overlaid on a hardlink copy
using `tar --unlink-first`, preserving the old release's files. Baseline hashes were checked
before deployment, and `current` was replaced atomically. No backend or nginx changes.

New section `#daily-horoscope` offers all twelve signs, a dated daily reading, lunar theme,
relationships/work/growth prompts, and a reflection question. It follows the birth-profile
sign unless manually overridden, refreshes at local midnight, and works in mobile disclosures.
See `docs/DAILY-HOROSCOPE.md` for calculation and repeat-theme conventions.

Validation: 310 JavaScript tests pass. Browser checks covered automatic sign selection,
manual override across profile changes, restoring the birth sign, and no horizontal overflow
at 390px. All six runtime files match the committed bytes on both HTTPS hostnames; account
health returns 200 with `{"ok":true}`. Live horoscope rendered without browser console errors.

Rollback: create a temporary symlink to `/opt/tarot-game/releases/20260912-chart-colours`,
then use `mv -Tf` to atomically replace `/opt/tarot-game/current`.

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

## 2026-09-11 Chart in time release

Current web root: /opt/tarot-game/releases/20260911-chart-in-time, a hardlink copy (`cp -al`) of
20260910-accounts with the committed runtime files from main 6701c14 extracted over it
(`git archive` of index.html, the root html pages, root js/css, vendor, assets, tarot-decks).
Previous release 20260910-accounts is retained for rollback (point the `current` symlink back at it).
New files: bi-wheel.js, chart-in-time-engine.js, chart-in-time-text.js, chart-in-time.js,
chart-in-time.css. Rekeyed: natal-engine.js?v=chart-in-time-1, app.js?v=chart-in-time-1,
celestial-extras.js?v=2, mobile-sections.js?v=divination-2. No server-side or account-service
change; the Django service and nginx are untouched. Validation: every new asset and the rekeyed
scripts return 200 over HTTPS, /api/health/ still answers, the section renders with the sample
chart, and the node suite is 134 passing. Conventions and independent validation are in
docs/CHART-IN-TIME.md.

## 2026-09-11 Chinese traditions release

Deployed 2026-09-11 from main f3461d7 as /opt/tarot-game/releases/20260911-chinese-traditions
(hardlink copy of 20260911-chart-in-time with the committed runtime files extracted over it);
previous release retained for rollback. Glenn ran `sh /tmp/deploy-app.sh` for the service step
(migration readings.0002_reading_kind_iching applied, ishtar-app restarted, /api/health/ ok), then
the frontend symlink was swapped. Live checks: all ten rekeyed files return 200 over HTTPS, the
divination room lists I Ching as the fifth practice, node suite 197 passing, Django 56 passing.
Originally planned on branch `chinese-traditions`, merged to main before deploy. Deepens the Four Pillars tab
(hidden stems, Ten Gods, luck pillars) and adds I Ching as a fifth divination practice.
Conventions and validation are in docs/EXTENDED-ATLAS.md ("BaZi conventions") and
docs/DIVINATION.md ("I Ching").

Ten rekeyed frontend files, cache-bust `?v=` bumped on each: `celestial-extras.css?v=2`,
`divination.css?v=iching-1`, `account.js?v=iching-1`, `celestial-extras-engine.js?v=2`,
`celestial-extras.js?v=3`, `divination-data.js?v=2`, `divination-engine.js?v=iching-1`,
`divination-art.js?v=iching-1`, `divination.js?v=iching-1`, `mobile-sections.js?v=iching-1`.
No other root JS/CSS files changed. New development-only files that do not ship:
`tools/build_bazi_fixtures.py`, `tests/fixtures/bazi-reference.json`, `tests/bazi.test.cjs`,
and the new cases in `tests/divination.test.cjs`.

Django change: `readings` app migration `0002_reading_kind_iching` adds `('iching', 'I Ching')`
to `Reading.KINDS`, which the view derives its allowed kinds from. Deploying this release
therefore needs, in addition to the usual frontend release copy, a `manage.py migrate` on the
VPS and a restart of the `ishtar-app` service to run the updated code (the existing
`server/deploy-app.sh` flow used for the accounts service handles both). Until that redeploy
happens, the live server is still running the old code and does not recognize `iching` as a
kind, so a signed-in reader who saves an I Ching reading gets the existing "Unknown reading
kind." error; this is expected and acceptable for the interval between merge and deploy, and
resolves itself once the service is redeployed. No other server-side or nginx change is needed.

## 2026-09-12 Jyotish (sidereal chart) release

Merged to main at f2b9c38 and deployed 2026-09-12 in the combined release described under
"2026-09-12 Jyotish + Horary deployment" below. Adds a fourth astrology section to the celestial atlas: a
sidereal (Lahiri) reading of the same calculated birth chart, with rashi/bhava placements,
nakshatras, Vimshottari dashas and a navamsa (D9) chart in South and North Indian formats.
Conventions and independent validation are in docs/JYOTISH.md, cross-linked from
docs/NATAL-CHART.md and docs/CHART-IN-TIME.md.

Five new frontend files, each starting at cache-bust `?v=1` per convention: `jyotish-engine.js`,
`jyotish-chart.js`, `jyotish-text.js`, `jyotish.js` and `jyotish.css`. Two rekeyed files:
`app.js?v=jyotish-1` (attaches the new section) and `mobile-sections.js?v=jyotish-1` (adds it to
the mobile fold). `index.html` gains the new nav link, section markup and script/style tags for
the five new files. No Django or nginx change; the section reads the existing saved birth
profile through `setBirthChart` and adds no storage keys.

Development-only files that do not ship: `tools/build_jyotish_fixtures.py`,
`tests/fixtures/jyotish-reference.json`, `tests/jyotish.test.cjs`, `tests/jyotish-text.test.cjs`
and `tests/jyotish-chart.test.cjs`.

Validation: `node --test tests/*.test.cjs` is 247 passing (43 + 2 + 5 = 50 of them Jyotish-
specific). Browser QA (DOM-verified): all four tabs render with the sample chart, both chart
formats produce all twelve `[data-sign]` house groups in both the rashi and navamsa charts,
dasha mahadasha selection updates the antardasha table, no console errors originate from the
section, no horizontal overflow at 390px, and neighbouring sections are unaffected. Signed-in
state was not exercised, since this section is read-only against the saved profile.

## 2026-09-12 Horary release

Merged to main at 1664713 and deployed 2026-09-12 in the combined release described below. Adds a fifth astrology section to the celestial atlas: a
chart cast for the moment a question is asked, judged by William Lilly's seventeenth-century
method (*Christian Astrology*, 1647) -- considerations before judgment, significators and their
dignities, perfection by aspect/reception/translation/collection, a planetary-hours table, and
a lightweight "Elect a moment" view. Presented throughout as historical practice, never as a
reading of the visitor's actual question. Conventions and independent validation are in
docs/HORARY.md, cross-linked from docs/NATAL-CHART.md (the new Regiomontanus house system,
which the natal chart itself does not default to).

Six new frontend files, each starting at cache-bust `?v=1`: `classical-engine.js`,
`horary-engine.js`, `horary-text.js`, `horary-chart.js`, `horary.js` and `horary.css`. Three
rekeyed files: `natal-engine.js?v=horary-1` (gains the Regiomontanus house system),
`app.js?v=horary-1` (attaches the new section) and `mobile-sections.js?v=horary-1` (adds it to
the mobile fold). `index.html` gains the new nav link, section markup and script/style tags for
the six new files. No Django or nginx change; the section reads the existing saved birth
profile only for its default place and writes nothing back -- the question text stays in page
memory and is never stored or sent.

Development-only files that do not ship: `tools/build_horary_fixtures.py`,
`tests/fixtures/horary-reference.json`, `tests/horary.test.cjs`, `tests/horary-text.test.cjs`
and `tests/horary-chart.test.cjs`.

Validation: `node --test tests/*.test.cjs` is 301 passing (26 classical + 3 horary + 2
horary-text + 8 horary-chart + 12 of `tests/natal-engine.test.cjs`'s 31 are Horary/Regiomontanus-
specific). Browser QA (DOM-verified): casting the default chart renders the wheel (12 cusp
groups, 9 planet groups), the considerations list and the hour line; all four tabs
(question/significators/hours/elect) switch correctly; the significators tab shows exactly 3
cards; the planetary-hours tab shows a 24-row table with exactly one current-hour row; the
elect tab shows a 7-row dignity table; no console errors originate from any horary asset (only
the expected `/api/account/` 404s, absent a running accounts backend); no horizontal overflow
at 390px; and neighbouring sections are unaffected. Signed-in state was not exercised, since
this section only reads the saved birth profile for its default place.

## 2026-09-12 Jyotish + Horary deployment

Deployed 2026-09-12 from main 1664713 as /opt/tarot-game/releases/20260912-jyotish-horary, a
hardlink copy (`cp -al`) of 20260911-chinese-traditions with the committed root html/js/css
extracted over it from `git archive HEAD` (53 files; assets, vendor and tarot-decks unchanged and
shared). Glenn ran `sh /tmp/deploy-20260912b.sh`, which created the release, stripped CRs from
the extracted text files, switched the `current` symlink and curl-checked the new URLs. Previous
release 20260911-chinese-traditions is retained for rollback
(`ln -sfn /opt/tarot-game/releases/20260911-chinese-traditions /opt/tarot-game/current`).

New files, all at `?v=1`: jyotish-engine.js, jyotish-text.js, jyotish-chart.js, jyotish.js,
jyotish.css, classical-engine.js, horary-engine.js, horary-text.js, horary-chart.js, horary.js,
horary.css. Rekeyed: natal-engine.js?v=horary-1 (Regiomontanus houses), app.js?v=horary-1,
mobile-sections.js?v=horary-1. No Django, nginx or storage change; /api/health/ unaffected.
Validation after the switch: every new and rekeyed URL above returned 200 over HTTPS, the current
symlink resolves to 20260912-jyotish-horary, and the node suite on the deployed commit is 302
passing. Conventions and independent validation: docs/JYOTISH.md and docs/HORARY.md.
