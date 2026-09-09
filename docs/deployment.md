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
