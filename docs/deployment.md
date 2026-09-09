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
