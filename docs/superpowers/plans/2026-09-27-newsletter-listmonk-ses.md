# Newsletter on listmonk + Amazon SES Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The weekly Ishtar Insights newsletter is delivered by a self-hosted listmonk on the VPS relaying through Amazon SES, replacing Mailchimp, with a Sunday job whose `rc=0` means SES accepted every message.

**Architecture:** The site's Django `newsletter` app stays the source of truth. `newsletter/listmonk.py` replaces `mailchimp.py` behind the same `configured / push / remove / members` surface; `sync_listmonk` and `draft_campaign` talk to listmonk's REST API on `127.0.0.1:9000`. listmonk runs in Docker Compose with its own Postgres; nginx exposes only the reader-facing paths on `news.ishtarinsights.com`. The issue builder emits Go-template conditionals instead of Mailchimp merge tags.

**Tech Stack:** Django (stdlib `urllib`, no new Python dependency), listmonk v6.2.0 (AGPL-3.0) + postgres:17-alpine in Docker Compose, Amazon SES SMTP (us-east-1), nginx + certbot, Node `node:test` for the builder.

**Spec:** `docs/superpowers/specs/2026-09-27-newsletter-listmonk-ses-design.md` (approved by Glenn 2026-09-27). Read it before any task.

## Global Constraints

| Constraint | Source |
|---|---|
| Dependencies are open source; no new Python package (stdlib `urllib` only) | Glenn's global instructions; the no-SDK choice is existing (`NEWSLETTER.md`, Mailchimp SDK dropped) |
| Subscriber addresses never appear in Git, Honcho, logs or command output; output prints counts | Existing `NEWSLETTER.md` rule |
| A delivery-side failure never fails a signup (`views.safely`) | Existing |
| Every email carries a working unsubscribe link | Existing `NEWSLETTER.md` rule |
| No postal address in the email | Glenn, 2026-09-27 |
| Secrets (SES SMTP user and password, listmonk API user and token) are entered on the VPS by Glenn through `set-newsletter-env.sh`, never typed or printed by Claude, never committed | Claude's operating rules, following the Mailchimp precedent (`/root/set-mailchimp-key.sh`) |
| `LISTMONK_LIST_ID` is the switch: it is not put into `/etc/ishtar-app.env` until AWS has granted SES production access | Spec, cutover order |
| listmonk admin UI and API are never reachable from the internet | Spec (Claude's judgement) |
| `draft_campaign --send` returns 0 only when listmonk reports the campaign `finished` with `sent == to_send` | Spec (Claude's judgement, from the 2026-09-27 failure) |
| Model text can never close or open a template tag: braces are escaped in the HTML and stripped from the subject | Existing untrusted-text rule, re-targeted by the spec |
| Consent version `2026-09-27-v3`; consent text exactly: `Yes, email me the Ishtar Insights newsletter and occasional updates about new readings and features. Emails are sent from our own server through Amazon Web Services.` | Spec |
| Work on branch `newsletter-listmonk` in the main checkout `V:\tarot_game` (no worktree), and be back on `main` before 03:30 | Claude's memory (NAS worktrees need `safe.directory`; nightly job at 03:30) |
| Every new test must fail with the code it protects removed (RED evidence) | Claude's memory (`fix-round-tests-need-red-evidence`) |

**Plan deviations from the spec, decided while planning (Claude's judgement; Task 1 records them in the spec):**
1. listmonk's campaign preview renders with a dummy subscriber and cannot be pointed at a chosen one, so the per-sign live check sends a **test** to twelve throwaway subscribers at `@ishtarinsights.com` addresses (the domain's ImprovMX catch-all forwards them to Glenn) on a separate `Checks` list, and Glenn looks at them.
2. `setup_listmonk` sets `app.max_send_errors` to 1, so a single SMTP failure pauses the campaign. Without it listmonk's default (1000) would let a campaign with every message rejected still report `finished`.
3. The Mailchimp code is deleted in the same change that adds listmonk (Task 8), not after go-live: sending through Mailchimp is already suspended and nothing depends on it.
4. listmonk requires a subscriber `name`; every subscriber is created with the name `Reader` so no personal data beyond the address is stored.

**Commands used throughout** (run from `V:\tarot_game`):
- Django tests: `server/ishtar/.venv/Scripts/python.exe server/ishtar/manage.py test newsletter` with working directory `server/ishtar` — i.e. `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter`
- Builder tests: `node --test tests/newsletter-build.test.cjs`
- Page tests: `node --test tests/pages.test.cjs tests/newsletter-ui.test.cjs`
- VPS: `ssh vps` (root). Multi-line remote work goes through a heredoc from the **Bash** tool (`ssh vps 'bash -s' <<'EOF' … EOF`), never through PowerShell quoting: on 2026-09-27 PowerShell stripped quotes from an ssh command and the remote shell ran a bare `nginx`.

---

### Task 1: Glenn's AWS and DNS steps (starts first; AWS review takes about a day)

**Files:**
- Create: `docs/newsletter-aws-setup.md`
- Modify: `docs/superpowers/specs/2026-09-27-newsletter-listmonk-ses-design.md` (append the four plan deviations)

**Interfaces:**
- Produces: Glenn's checklist. Later tasks wait on: the `news` A record (Task 12), SMTP credentials (Task 12), production access (Task 13), the SNS subscription (Task 12).

- [ ] **Step 1: Create the branch**

```bash
cd /v/tarot_game && git switch -c newsletter-listmonk
```

- [ ] **Step 2: Write `docs/newsletter-aws-setup.md`**

```markdown
# Newsletter: AWS and DNS steps for Glenn

Part of the move from Mailchimp to listmonk + Amazon SES
(`docs/superpowers/specs/2026-09-27-newsletter-listmonk-ses-design.md`). Steps 1 to 5 can be done now;
step 6 waits until Claude says `news.ishtarinsights.com` is live.

## 1. Create the AWS account
Sign up at https://aws.amazon.com. Turn on MFA for the root user. In the region menu (top right) pick
**US East (N. Virginia) us-east-1** and keep it there for every step below.

## 2. Verify the sending domain in SES
Amazon SES → Configuration → **Identities** → Create identity → **Domain** → `ishtarinsights.com`.
Leave "Use a custom MAIL FROM domain" off. Under Advanced DKIM settings keep **Easy DKIM**, RSA 2048-bit,
and leave "Publish DNS records to Route53" off. Create.
SES shows three CNAME records. In Bluehost → Domains → ishtarinsights.com → **Advanced DNS**, add each one:
type CNAME, host = the part of the name **before** `.ishtarinsights.com` (it looks like
`abcdef123._domainkey`), points to = the value ending in `.dkim.amazonses.com`. SES marks the identity
Verified once DNS has spread (minutes to a few hours).
Nothing else in DNS changes: the SPF record stays `v=spf1 include:spf.improvmx.com ~all` and DMARC stays
`p=none`. DKIM alone lets SES mail pass DMARC.

## 3. Add the `news` subdomain
Same Bluehost screen: type **A**, host `news`, points to `129.121.126.72`. Tell Claude when it is saved.

## 4. Create SMTP credentials
SES → **SMTP settings** → Create SMTP credentials → Create user. Download the credentials file (it is shown
once). Then put them on the VPS yourself, one prompt each, nothing is echoed:

    ssh -t vps sudo sh /root/set-newsletter-env.sh SES_SMTP_USER
    ssh -t vps sudo sh /root/set-newsletter-env.sh SES_SMTP_PASSWORD

(The script exists once Claude has finished Task 2; if it is not there yet, keep the file safe and do this
later.)

## 5. Request production access
A new account can only send to addresses it has verified (the "sandbox"). SES → **Account dashboard** →
Request production access. Mail type **Marketing**. Website URL `https://ishtarinsights.com`. Use case
description (edit freely, keep it true):

> Ishtar Insights (ishtarinsights.com) sends one weekly newsletter: a short astrology column with a section
> for the reader's chosen sun sign. Recipients are only people who signed up on our website and confirmed
> through a double opt-in email. The list is under 10 people today and we expect well under 1,000 within a
> year, so fewer than 5,000 emails a month. Every email has a one-click unsubscribe (List-Unsubscribe header)
> and a link to our site's own unsubscribe page; unsubscribes take effect within ten minutes. Bounces and
> complaints return through SNS to our self-hosted list manager (listmonk), which blocklists an address
> after a hard bounce or a complaint. We never send to purchased or rented lists.

Tell Claude when AWS answers. **Nothing is sent to subscribers until it is granted.**

## 6. Bounce and complaint notifications (after Claude says `news.ishtarinsights.com` is live)
1. Amazon SNS → Topics → Create topic → **Standard**, name `ishtar-ses-feedback`. Create.
2. In the topic → Create subscription → protocol **HTTPS**, endpoint
   `https://news.ishtarinsights.com/webhooks/service/ses`. Create. listmonk confirms it by itself; the
   subscription shows **Confirmed** within a minute (refresh).
3. SES → Identities → `ishtarinsights.com` → **Notifications** → Feedback notifications → Edit: Bounce feedback
   and Complaint feedback both → `ishtar-ses-feedback`. Leave "Include original email headers" off. Save.
```

- [ ] **Step 3: Append the deviations to the spec**

Add at the end of `docs/superpowers/specs/2026-09-27-newsletter-listmonk-ses-design.md`:

```markdown
## Changes made while planning (2026-09-27, Claude's judgement)

1. listmonk's campaign preview renders with a dummy subscriber, so the per-sign live check sends a test to
   twelve throwaway `@ishtarinsights.com` subscribers on a separate `Checks` list (the catch-all forwards
   them to Glenn) instead of previewing.
2. `setup_listmonk` sets `app.max_send_errors` to 1 so one SMTP failure pauses the campaign; the default
   (1000) would let a fully rejected campaign report `finished`.
3. The Mailchimp code is removed in the same change that adds listmonk, not after go-live.
4. Subscribers are created with the name `Reader`; listmonk requires a name and no other personal data is
   stored.
5. Secrets are entered by Glenn through `/root/set-newsletter-env.sh`, the pattern of the Mailchimp key.
```

- [ ] **Step 4: Commit and tell Glenn**

```bash
git add docs/newsletter-aws-setup.md docs/superpowers/specs/2026-09-27-newsletter-listmonk-ses-design.md
git commit -m "docs(newsletter): AWS and DNS steps for the listmonk move"
```

Tell Glenn in chat: steps 1, 2, 3 and 5 of `docs/newsletter-aws-setup.md` can start now; step 4 needs Task 2's script; step 6 waits for Task 12.

---

### Task 2: listmonk on the VPS, loopback only

**Files:**
- Create: `server/listmonk/docker-compose.yml`, `server/listmonk/install-listmonk.sh`, `server/listmonk/backup-listmonk.sh`, `server/listmonk/set-newsletter-env.sh`

**Interfaces:**
- Produces: listmonk answering on `127.0.0.1:9000` on the VPS; admin user `glenn` with a generated password in `/opt/listmonk/.env` (mode 600); `/root/set-newsletter-env.sh KEY`.

- [ ] **Step 1: Check SES SMTP is reachable from the VPS before building anything**

```bash
ssh vps 'bash -s' <<'EOF'
timeout 8 bash -c 'exec 3<>/dev/tcp/email-smtp.us-east-1.amazonaws.com/587 && head -c 60 <&3' && echo ' <- 587 open'
EOF
```
Expected: a `220 email-smtp.amazonaws.com ESMTP` banner and `<- 587 open`. If it times out, stop and report: the host blocks 587 (SES also listens on 2587, which `setup_listmonk`'s `SMTP` constant would then use).

- [ ] **Step 2: Write `server/listmonk/docker-compose.yml`**

```yaml
# listmonk for the Ishtar Insights newsletter (docs/NEWSLETTER.md). Installed to /opt/listmonk by
# install-listmonk.sh. Secrets come from /opt/listmonk/.env, which that script writes once.
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: listmonk
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: listmonk
    volumes:
      - listmonk-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U listmonk"]
      interval: 10s
      timeout: 5s
      retries: 6
  app:
    image: listmonk/listmonk:v6.2.0
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "127.0.0.1:9000:9000"
    environment:
      LISTMONK_app__address: 0.0.0.0:9000
      LISTMONK_db__host: db
      LISTMONK_db__port: 5432
      LISTMONK_db__user: listmonk
      LISTMONK_db__password: ${DB_PASSWORD}
      LISTMONK_db__database: listmonk
      LISTMONK_db__ssl_mode: disable
      LISTMONK_ADMIN_USER: ${ADMIN_USER}
      LISTMONK_ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      TZ: Etc/UTC
    command: [sh, -c, "./listmonk --install --idempotent --yes --config '' && ./listmonk --upgrade --yes --config '' && ./listmonk --config ''"]
volumes:
  listmonk-db:
```

- [ ] **Step 3: Write `server/listmonk/backup-listmonk.sh`**

```sh
#!/bin/sh
# Nightly dump of the listmonk database, kept 14 days (docs/NEWSLETTER.md). dash has no pipefail,
# so the dump is written to a file first and a failed pg_dump stops the script before gzip.
set -eu
OUT=/var/backups/listmonk
STAMP=$(date -u +%Y%m%d)
install -d -m 700 "$OUT"
cd /opt/listmonk
docker compose exec -T db pg_dump -U listmonk listmonk > "$OUT/listmonk-$STAMP.sql.tmp"
mv "$OUT/listmonk-$STAMP.sql.tmp" "$OUT/listmonk-$STAMP.sql"
gzip -f "$OUT/listmonk-$STAMP.sql"
find "$OUT" -name 'listmonk-*.sql.gz' -mtime +14 -delete
```

- [ ] **Step 4: Write `server/listmonk/set-newsletter-env.sh`**

```sh
#!/bin/sh
# Sets one newsletter value in /etc/ishtar-app.env without echoing it (docs/NEWSLETTER.md).
#   ssh -t vps sudo sh /root/set-newsletter-env.sh SES_SMTP_PASSWORD
# The file stays root-owned, mode 600; every other line is kept as it was.
set -eu
case "${1:-}" in
    LISTMONK_API_USER|LISTMONK_API_TOKEN|LISTMONK_LIST_ID|SES_SMTP_USER|SES_SMTP_PASSWORD) ;;
    *) echo "usage: $0 LISTMONK_API_USER|LISTMONK_API_TOKEN|LISTMONK_LIST_ID|SES_SMTP_USER|SES_SMTP_PASSWORD" >&2; exit 2 ;;
esac
printf '%s: ' "$1"
stty -echo 2>/dev/null || true
read -r VALUE
stty echo 2>/dev/null || true
echo
[ -n "$VALUE" ] || { echo 'empty; nothing changed' >&2; exit 1; }
KEY="$1" VALUE="$VALUE" python3 - <<'PY'
import os
import re
from pathlib import Path

path = Path('/etc/ishtar-app.env')
key, value = os.environ['KEY'], os.environ['VALUE']
if re.search(r'[\s"\'`$\\]', value):
    raise SystemExit('the value has a space, quote, $ or backslash in it; nothing changed')
lines = [line for line in path.read_text().splitlines() if not line.startswith(key + '=')]
lines.append(f'{key}={value}')
tmp = path.with_name(path.name + '.tmp')
tmp.write_text('\n'.join(lines) + '\n')
os.chmod(tmp, 0o600)
os.replace(tmp, path)
print(f'{key} set in {path}')
PY
```

- [ ] **Step 5: Write `server/listmonk/install-listmonk.sh`**

```sh
#!/bin/sh
# Run as root on the VPS after copying server/listmonk/ to /tmp/listmonk-src. Safe to re-run: the .env
# with the generated secrets is written only when it does not exist, and everything else converges.
set -eu
DIR=/opt/listmonk
SRC=/tmp/listmonk-src
install -d -m 755 "$DIR"
install -m 644 "$SRC/docker-compose.yml" "$DIR/docker-compose.yml"
if [ ! -f "$DIR/.env" ]; then
    ( umask 077
      printf 'DB_PASSWORD=%s\nADMIN_USER=glenn\nADMIN_PASSWORD=%s\n' "$(openssl rand -hex 24)" "$(openssl rand -hex 16)" > "$DIR/.env" )
fi
chmod 600 "$DIR/.env"
install -o root -g root -m 755 "$SRC/backup-listmonk.sh" "$DIR/backup-listmonk.sh"
printf '41 3 * * * root %s/backup-listmonk.sh\n' "$DIR" > /etc/cron.d/listmonk-backup
chmod 644 /etc/cron.d/listmonk-backup
install -o root -g root -m 700 "$SRC/set-newsletter-env.sh" /root/set-newsletter-env.sh
cd "$DIR"
docker compose pull -q
docker compose up -d
for i in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9000/admin/login || true)
    [ "$code" = 200 ] && { echo 'listmonk is up on 127.0.0.1:9000'; exit 0; }
    sleep 2
done
echo "listmonk did not answer on 127.0.0.1:9000 (last HTTP $code)" >&2
docker compose logs --tail 40 app >&2
exit 1
```

- [ ] **Step 6: Install**

```bash
cd /v/tarot_game && tar -C server -cf - listmonk | ssh vps "rm -rf /tmp/listmonk-src && mkdir -p /tmp/listmonk-src && tar -C /tmp/listmonk-src --strip-components=1 -xf - && sed -i 's/\r\$//' /tmp/listmonk-src/* && sh /tmp/listmonk-src/install-listmonk.sh"
```
The `sed` strips CRLF: under `core.autocrlf=true` a checked-out copy of these files can carry `\r`, and `set -eu\r` breaks `sh`.
Expected: `listmonk is up on 127.0.0.1:9000`.

- [ ] **Step 7: Verify it is loopback-only and the backup runs**

```bash
ssh vps 'bash -s' <<'EOF'
ss -ltnp | grep ':9000 ' 
curl -s -o /dev/null -w 'public 9000: %{http_code}\n' --max-time 5 http://129.121.126.72:9000/ || echo 'public 9000: refused (good)'
/opt/listmonk/backup-listmonk.sh && ls -l /var/backups/listmonk/
stat -c '%a %U' /opt/listmonk/.env /root/set-newsletter-env.sh
EOF
```
Expected: the listener is `127.0.0.1:9000` only; the public probe is refused or times out; one `listmonk-YYYYMMDD.sql.gz` of non-zero size; `600 root` and `700 root`.

- [ ] **Step 8: Glenn creates the API user (his step; Claude asks in chat)**

Send Glenn:
1. Open a tunnel: `ssh -L 9000:127.0.0.1:9000 vps` and leave it open.
2. Get the admin password: `ssh vps sudo grep ADMIN_PASSWORD /opt/listmonk/.env`. Log in at http://127.0.0.1:9000/admin as `glenn`.
3. Admin → **Users** → New → type **API**, username `ishtar`, role Super Admin (the default role) → Save. Copy the token shown.
4. `ssh -t vps sudo sh /root/set-newsletter-env.sh LISTMONK_API_USER` (enter `ishtar`), then the same with `LISTMONK_API_TOKEN` (paste the token).
5. Also step 4 of `docs/newsletter-aws-setup.md` if the SMTP credentials exist yet.

Wait for Glenn to confirm before Task 3. Tasks 4–11 do not need the VPS and can proceed meanwhile.

- [ ] **Step 9: Commit**

```bash
git add server/listmonk
git commit -m "feat(newsletter): listmonk in Docker Compose on the VPS, loopback only"
```

---

### Task 3: Confirm listmonk's API behaves as the code assumes

The Django code in Tasks 4–7 is written against listmonk's documented API. This task proves the undocumented details on the running v6.2.0 **before** SMTP is configured, so no probe can send mail (the probe list is double opt-in, but listmonk has no working SMTP server yet). Run it after Glenn's Task 2 Step 8 and **before** Task 12 runs `setup_listmonk`.

**Files:**
- Create (scratch, not committed): `C:\Users\glenn\AppData\Local\Temp\claude\V--tarot-game\8929d21f-68fc-4b36-9103-f17485874ae3\scratchpad\probe_listmonk.py`

**Interfaces:**
- Produces: a pass/fail list. Every line must be `ok`. A `FAIL` line means the matching code in Tasks 4–7 must change before deploy; stop and report which.

- [ ] **Step 1: Write the probe**

```python
"""Probe the running listmonk for the behaviour newsletter/listmonk.py relies on. Uses reserved
example.com addresses on a throwaway list and deletes everything it made. Prints no secrets."""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

BASE = 'http://127.0.0.1:9000'
AUTH = f"token {os.environ['LISTMONK_API_USER']}:{os.environ['LISTMONK_API_TOKEN']}"


def call(method, path, body=None, params=None, raw=False):
    url = BASE + path + ('?' + urllib.parse.urlencode(params, doseq=True) if params else '')
    data = json.dumps(body).encode() if body is not None else None
    headers = {'Authorization': AUTH, **({'Content-Type': 'application/json'} if data else {})}
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers, method=method), timeout=10) as r:
        payload = r.read()
    return payload.decode() if raw else json.loads(payload)['data']


def check(name, condition):
    print(('ok   ' if condition else 'FAIL ') + name)


made_list = call('POST', '/api/lists', {'name': 'probe-delete-me', 'type': 'private', 'optin': 'double'})
L = made_list['id']
sub = call('POST', '/api/subscribers', {'email': 'probe@example.com', 'name': 'Reader', 'status': 'enabled',
                                         'lists': [L], 'attribs': {'sign': 'leo', 'siteunsub': 'https://x/#t'},
                                         'preconfirm_subscriptions': False})
S = sub['id']
try:
    call('POST', '/api/subscribers', {'email': 'probe@example.com', 'name': 'Reader', 'status': 'enabled', 'lists': [L]})
    check('duplicate create is refused', False)
except urllib.error.HTTPError as e:
    check(f'duplicate create is refused ({e.code})', e.code in (400, 409))

q = call('GET', '/api/subscribers', params={'query': "subscribers.email = 'probe@example.com'", 'per_page': 1})
check('lookup by query returns results[] with id and lists[]', q['results'][0]['id'] == S and isinstance(q['results'][0]['lists'], list))
state = lambda m: next((x['subscription_status'] for x in m['lists'] if x['id'] == L), None)
check('new member on a double opt-in list is unconfirmed', state(q['results'][0]) == 'unconfirmed')
try:
    call('GET', '/api/subscribers', params={'query': "subscribers.email = 'o''neil@example.com'", 'per_page': 1})
    check("a doubled quote in the query is accepted", True)
except urllib.error.HTTPError as e:
    check(f"a doubled quote in the query is accepted ({e.code})", False)

call('PATCH', f'/api/subscribers/{S}', {'attribs': {'sign': 'virgo', 'siteunsub': 'https://x/#t'}})
m = call('GET', f'/api/subscribers/{S}')
check('PATCH attribs updates them', m['attribs'].get('sign') == 'virgo')
check('PATCH attribs keeps the list membership', state(m) == 'unconfirmed')

call('PUT', '/api/subscribers/lists', {'ids': [S], 'action': 'unsubscribe', 'target_list_ids': [L]})
check('unsubscribe action leaves the membership as unsubscribed', state(call('GET', f'/api/subscribers/{S}')) == 'unsubscribed')
listed = call('GET', '/api/subscribers', params={'list_id': L, 'page': 1, 'per_page': 1000})
check('list_id listing includes unsubscribed members and has total', listed['total'] == 1 and len(listed['results']) == 1)

call('PUT', '/api/subscribers/lists', {'ids': [S], 'action': 'remove', 'target_list_ids': [L]})
call('PUT', '/api/subscribers/lists', {'ids': [S], 'action': 'add', 'target_list_ids': [L], 'status': 'unconfirmed'})
check('remove then add makes the member unconfirmed again', state(call('GET', f'/api/subscribers/{S}')) == 'unconfirmed')
try:
    call('POST', f'/api/subscribers/{S}/optin', {})
    check('optin endpoint accepts {} (the send itself fails: no SMTP yet)', True)
except urllib.error.HTTPError as e:
    check(f'optin endpoint accepts {{}} ({e.code})', False)

settings = call('GET', '/api/settings')
for key in ('app.root_url', 'app.from_email', 'app.enable_public_subscription_page', 'app.max_send_errors',
            'privacy.individual_tracking', 'privacy.unsubscribe_header', 'bounce.enabled',
            'bounce.webhooks_enabled', 'bounce.ses_enabled', 'smtp'):
    check(f'setting {key} exists', key in settings)
check('smtp[0] has host, port, auth_protocol, username, password, tls_type, enabled, max_conns',
      {'host', 'port', 'auth_protocol', 'username', 'password', 'tls_type', 'enabled', 'max_conns'} <= set(settings['smtp'][0]))

templates = call('GET', '/api/templates')
check('templates is a list of {id, name}', isinstance(templates, list) and {'id', 'name'} <= set(templates[0]))
t = call('POST', '/api/templates', {'name': 'probe-delete-me', 'type': 'campaign', 'body': '{{ template "content" . }}'})
body = ('{{ $sign := or .Subscriber.Attribs.sign "" }}{{ if eq $sign "leo" }}LEO{{ else if eq $sign "virgo" }}VIRGO'
        '{{ else }}NONE{{ end }} <a href="{{ UnsubscribeURL }}">u</a> <a href="{{ .Subscriber.Attribs.siteunsub }}">s</a>'
        ' <a href="{{ MessageURL }}">m</a> &#123;&#123; end &#125;&#125;')
c = call('POST', '/api/campaigns', {'name': 'probe-delete-me', 'subject': 'probe', 'lists': [L], 'type': 'regular',
                                    'content_type': 'html', 'body': body, 'template_id': t['id'], 'messenger': 'email',
                                    'from_email': 'Ishtar Insights <newsletter@ishtarinsights.com>'})
check('a new campaign is in draft status', c['status'] == 'draft')
found = call('GET', '/api/campaigns', params={'order_by': 'created_at', 'order': 'DESC', 'per_page': 50, 'no_body': 'true'})
check('campaign listing has results[] with name and status', any(x['name'] == 'probe-delete-me' and x['status'] == 'draft' for x in found['results']))
html = call('GET', f"/api/campaigns/{c['id']}/preview", raw=True)
check('preview is raw HTML with the no-sign branch', 'NONE' in html and 'LEO' not in html)
check('preview keeps the escaped braces as text', '&#123;&#123; end &#125;&#125;' in html or '{{ end }}' not in html)
got = call('GET', f"/api/campaigns/{c['id']}")
check('campaign has sent and to_send', 'sent' in got and 'to_send' in got)
try:
    call('POST', '/api/campaigns', {'name': 'probe-bad', 'subject': 'x', 'lists': [L], 'type': 'regular',
                                    'content_type': 'html', 'body': '{{ if }}', 'template_id': t['id'], 'messenger': 'email'})
    check('a broken template is refused at save', False)
except urllib.error.HTTPError as e:
    check(f'a broken template is refused at save ({e.code})', e.code == 400)

call('DELETE', f"/api/campaigns/{c['id']}")
call('DELETE', f"/api/templates/{t['id']}")
call('DELETE', f'/api/subscribers/{S}')
call('DELETE', f'/api/lists/{L}')
print('cleaned up')
```

- [ ] **Step 2: Run it on the VPS with the token from the environment file**

```bash
scp "C:/Users/glenn/AppData/Local/Temp/claude/V--tarot-game/8929d21f-68fc-4b36-9103-f17485874ae3/scratchpad/probe_listmonk.py" vps:/tmp/probe_listmonk.py
ssh vps 'bash -s' <<'EOF'
set -a; . /etc/ishtar-app.env; set +a
python3 /tmp/probe_listmonk.py; rm -f /tmp/probe_listmonk.py
EOF
```
Expected: every line `ok`, then `cleaned up`. If the probe dies mid-way, delete leftovers named `probe-delete-me` / `probe@example.com` in the admin UI (through the tunnel) or by API before re-running.

- [ ] **Step 3: Resolve any FAIL before Task 4 is merged**

For each `FAIL`, change the matching code and test in Tasks 4–7 to what listmonk actually does (for example: if `PATCH` drops list memberships, make `push` re-read the member and use `PUT /api/subscribers/lists` instead), note the change in the task's commit message, and re-run the probe until all lines pass. No commit in this task.

---

### Task 4: `newsletter/listmonk.py`

**Files:**
- Create: `server/ishtar/newsletter/listmonk.py`
- Create: `server/ishtar/newsletter/tests/test_listmonk.py`
- Modify: `server/ishtar/ishtar/settings.py:161-164` (add the listmonk settings; the Mailchimp lines are removed in Task 8)

**Interfaces:**
- Produces:
  - `SIGNS: tuple[str, ...]` — the twelve lowercase signs in zodiac order (moved from `mailchimp.py`).
  - `TEMPLATE_NAME = 'Ishtar issue (content only)'`, `LIST_NAME = 'Ishtar Insights'`, `SITE_UNSUBSCRIBE = 'https://ishtarinsights.com/unsubscribe.html#'`
  - `configured() -> bool` — true only when `LISTMONK_API_USER`, `LISTMONK_API_TOKEN` and `LISTMONK_LIST_ID` are all set.
  - `_request(method: str, path: str, body=None, params=None, raw=False)` — returns the parsed `data` of listmonk's envelope (`{}` for an empty body), or the body text when `raw=True`. Raises `urllib.error.HTTPError` / `URLError`.
  - `push(subscriber, resubscribe=False) -> None`, `remove(email: str) -> None`
  - `members()` — yields `(email_lowercase, 'live' | 'gone')`.
  - `template_id() -> int` — raises `LookupError` when the template is missing.

- [ ] **Step 1: Add the settings**

In `server/ishtar/ishtar/settings.py`, directly after the `MAILCHIMP_AUDIENCE_ID` line, insert:

```python
# Empty token or list id = every newsletter.listmonk call is a no-op, so dev and tests stay offline.
# LISTMONK_LIST_ID is the go-live switch: it is set only once SES production access is granted.
LISTMONK_URL = os.environ.get('LISTMONK_URL', 'http://127.0.0.1:9000')
LISTMONK_API_USER = os.environ.get('LISTMONK_API_USER', '')
LISTMONK_API_TOKEN = os.environ.get('LISTMONK_API_TOKEN', '')
LISTMONK_LIST_ID = os.environ.get('LISTMONK_LIST_ID', '')
# Read only by manage.py setup_listmonk, which writes them into listmonk's SMTP settings.
SES_SMTP_USER = os.environ.get('SES_SMTP_USER', '')
SES_SMTP_PASSWORD = os.environ.get('SES_SMTP_PASSWORD', '')
```

- [ ] **Step 2: Write the failing tests** — `server/ishtar/newsletter/tests/test_listmonk.py`

```python
import json
from unittest import mock
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse

from django.test import TestCase, override_settings
from django.utils import timezone

from newsletter import listmonk
from newsletter.models import Subscriber

CONFIG = dict(LISTMONK_URL='http://127.0.0.1:9000', LISTMONK_API_USER='ishtar', LISTMONK_API_TOKEN='tok',
              LISTMONK_LIST_ID='3')
LOOKUP = ('GET', '/api/subscribers', None, {'query': "subscribers.email = 'reader@example.com'", 'per_page': 1})


def subscriber(sign='leo', email='reader@example.com'):
    return Subscriber.objects.create(email=email, consent_at=timezone.now(), consent_version='v',
                                     consent_text='t', sun_sign=sign)


def member(state='confirmed', status='enabled'):
    return {'id': 7, 'email': 'Reader@Example.com', 'status': status,
            'lists': [{'id': 3, 'subscription_status': state}] if state else [{'id': 99, 'subscription_status': 'confirmed'}]}


class FakeRequest:
    """Records every call; the subscriber lookup finds `found`, listings pop `pages`, the rest answer {}."""
    def __init__(self, found=None, pages=(), templates=()):
        self.calls, self.found, self.pages, self.templates = [], found, list(pages), list(templates)

    def __call__(self, method, path, body=None, params=None, raw=False):
        self.calls.append((method, path, body, params))
        if (method, path) == ('GET', '/api/subscribers') and 'query' in (params or {}):
            return {'results': [self.found] if self.found else [], 'total': int(bool(self.found))}
        if (method, path) == ('GET', '/api/subscribers'):
            return self.pages.pop(0)
        if (method, path) == ('GET', '/api/templates'):
            return self.templates
        return {}

    def writes(self):
        return [c for c in self.calls if c[0] != 'GET']


class UnconfiguredTests(TestCase):
    def test_nothing_set_means_no_request(self):
        with mock.patch('newsletter.listmonk._request') as request:
            self.assertFalse(listmonk.configured())
            listmonk.push(subscriber())
            listmonk.remove('reader@example.com')
            self.assertEqual(list(listmonk.members()), [])
            request.assert_not_called()

    @override_settings(**dict(CONFIG, LISTMONK_LIST_ID=''))
    def test_a_token_without_the_list_id_is_not_live(self):
        # The list id is the go-live switch (set only after SES production access).
        with mock.patch('newsletter.listmonk._request') as request:
            self.assertFalse(listmonk.configured())
            listmonk.push(subscriber())
            request.assert_not_called()


@override_settings(**CONFIG)
class PushTests(TestCase):
    def run_push(self, found, **kwargs):
        row = subscriber(**{k: v for k, v in kwargs.items() if k in ('sign', 'email')})
        fake = FakeRequest(found=found)
        with mock.patch('newsletter.listmonk._request', fake):
            listmonk.push(row, resubscribe=kwargs.get('resubscribe', False))
        return row, fake

    def test_a_new_address_is_created_unconfirmed_with_its_sign_and_site_unsubscribe_link(self):
        row, fake = self.run_push(None)
        self.assertEqual(fake.calls[0], LOOKUP)
        self.assertEqual(fake.writes(), [('POST', '/api/subscribers', {
            'email': 'reader@example.com', 'name': 'Reader', 'status': 'enabled', 'lists': [3],
            'attribs': {'sign': 'leo', 'siteunsub': 'https://ishtarinsights.com/unsubscribe.html#' + row.unsubscribe_token},
            'preconfirm_subscriptions': False}, None)])

    def test_no_sign_is_sent_as_an_empty_sign(self):
        row, fake = self.run_push(None, sign='')
        self.assertEqual(fake.writes()[0][2]['attribs']['sign'], '')

    def test_an_existing_member_only_has_its_attributes_updated(self):
        row, fake = self.run_push(member('confirmed'), resubscribe=True)
        self.assertEqual(fake.writes(), [('PATCH', '/api/subscribers/7', {'attribs': {
            'sign': 'leo', 'siteunsub': 'https://ishtarinsights.com/unsubscribe.html#' + row.unsubscribe_token}}, None)])

    def test_the_reconcile_never_resubscribes_someone_who_left(self):
        row, fake = self.run_push(member('unsubscribed'))
        self.assertEqual([c[0] for c in fake.writes()], ['PATCH'])

    def test_a_fresh_signup_brings_someone_who_left_back_unconfirmed_with_a_new_opt_in_email(self):
        row, fake = self.run_push(member('unsubscribed'), resubscribe=True)
        self.assertEqual(fake.writes()[1:], [
            ('PUT', '/api/subscribers/lists', {'ids': [7], 'action': 'remove', 'target_list_ids': [3]}, None),
            ('PUT', '/api/subscribers/lists', {'ids': [7], 'action': 'add', 'target_list_ids': [3], 'status': 'unconfirmed'}, None),
            ('POST', '/api/subscribers/7/optin', {}, None)])

    def test_a_member_missing_from_the_list_is_added_back_without_a_remove(self):
        row, fake = self.run_push(member(None))
        self.assertEqual(fake.writes()[1:], [
            ('PUT', '/api/subscribers/lists', {'ids': [7], 'action': 'add', 'target_list_ids': [3], 'status': 'unconfirmed'}, None),
            ('POST', '/api/subscribers/7/optin', {}, None)])

    def test_a_blocklisted_address_is_never_added_back(self):
        # listmonk blocklists after a hard bounce or a spam complaint; a new signup does not override that.
        row, fake = self.run_push(member('unsubscribed', status='blocklisted'), resubscribe=True)
        self.assertEqual([c[0] for c in fake.writes()], ['PATCH'])

    def test_a_quote_in_the_address_is_doubled_in_the_lookup(self):
        row, fake = self.run_push(None, email="o'neil@example.com")
        self.assertEqual(fake.calls[0][3]['query'], "subscribers.email = 'o''neil@example.com'")


@override_settings(**CONFIG)
class RemoveTests(TestCase):
    def test_a_live_member_is_unsubscribed_from_the_list(self):
        fake = FakeRequest(found=member('confirmed'))
        with mock.patch('newsletter.listmonk._request', fake):
            listmonk.remove('Reader@Example.com')
        self.assertEqual(fake.calls[0], LOOKUP)
        self.assertEqual(fake.writes(), [('PUT', '/api/subscribers/lists', {'ids': [7], 'action': 'unsubscribe', 'target_list_ids': [3]}, None)])

    def test_unknown_or_already_gone_means_no_write(self):
        for found in (None, member('unsubscribed'), member(None)):
            fake = FakeRequest(found=found)
            with mock.patch('newsletter.listmonk._request', fake):
                listmonk.remove('reader@example.com')
            self.assertEqual(fake.writes(), [], found)


@override_settings(**CONFIG)
class MembersTests(TestCase):
    def test_pages_until_total_and_maps_each_state(self):
        page1 = {'total': 3, 'results': [dict(member('confirmed'), email='A@Example.com'),
                                          dict(member('unconfirmed'), email='b@example.com')]}
        page2 = {'total': 3, 'results': [dict(member('unsubscribed'), email='c@example.com')]}
        fake = FakeRequest(pages=[page1, page2])
        with mock.patch('newsletter.listmonk._request', fake), mock.patch('newsletter.listmonk.PAGE', 2):
            self.assertEqual(list(listmonk.members()), [('a@example.com', 'live'), ('b@example.com', 'live'), ('c@example.com', 'gone')])
        self.assertEqual([c[3] for c in fake.calls], [{'list_id': 3, 'page': 1, 'per_page': 2}, {'list_id': 3, 'page': 2, 'per_page': 2}])

    def test_a_blocklisted_member_is_gone_whatever_its_list_state(self):
        fake = FakeRequest(pages=[{'total': 1, 'results': [member('confirmed', status='blocklisted')]}])
        with mock.patch('newsletter.listmonk._request', fake):
            self.assertEqual(list(listmonk.members()), [('reader@example.com', 'gone')])


@override_settings(**CONFIG)
class TemplateTests(TestCase):
    def test_finds_the_content_only_template_by_name(self):
        fake = FakeRequest(templates=[{'id': 1, 'name': 'Default campaign template'}, {'id': 5, 'name': listmonk.TEMPLATE_NAME}])
        with mock.patch('newsletter.listmonk._request', fake):
            self.assertEqual(listmonk.template_id(), 5)

    def test_a_missing_template_names_the_fix(self):
        with mock.patch('newsletter.listmonk._request', FakeRequest(templates=[])), self.assertRaisesMessage(LookupError, 'setup_listmonk'):
            listmonk.template_id()


@override_settings(**CONFIG)
class RequestTests(TestCase):
    def reply(self, payload):
        response = mock.MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = payload
        return response

    def test_token_auth_five_second_timeout_repeated_params_and_the_data_envelope(self):
        with mock.patch('urllib.request.urlopen', return_value=self.reply(b'{"data": {"id": 4}}')) as urlopen:
            result = listmonk._request('POST', '/api/subscribers', {'email': 'x'}, params={'list_id': [3, 4]})
        request = urlopen.call_args.args[0]
        self.assertEqual(result, {'id': 4})
        self.assertEqual(urlopen.call_args.kwargs.get('timeout'), 5)
        self.assertEqual(request.get_header('Authorization'), 'token ishtar:tok')
        self.assertEqual(request.get_header('Content-type'), 'application/json')
        self.assertEqual(request.data, json.dumps({'email': 'x'}).encode())
        parsed = urlparse(request.full_url)
        self.assertEqual((parsed.hostname, parsed.port, parsed.path), ('127.0.0.1', 9000, '/api/subscribers'))
        self.assertEqual(parse_qs(parsed.query), {'list_id': ['3', '4']})

    def test_raw_returns_the_body_text_and_an_empty_body_is_an_empty_dict(self):
        with mock.patch('urllib.request.urlopen', return_value=self.reply(b'<html>hi</html>')):
            self.assertEqual(listmonk._request('GET', '/api/campaigns/1/preview', raw=True), '<html>hi</html>')
        with mock.patch('urllib.request.urlopen', return_value=self.reply(b'')):
            self.assertEqual(listmonk._request('POST', '/api/subscribers/7/optin', {}), {})

    def test_http_errors_propagate(self):
        with mock.patch('urllib.request.urlopen', side_effect=HTTPError('u', 409, 'exists', None, None)), self.assertRaises(HTTPError):
            listmonk._request('POST', '/api/subscribers', {})
```

- [ ] **Step 3: Run to see them fail**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_listmonk`
Expected: ERROR, `ImportError: cannot import name 'listmonk' from 'newsletter'`.

- [ ] **Step 4: Write `server/ishtar/newsletter/listmonk.py`**

```python
"""The only module that talks to listmonk. Every function is a no-op until the API user, its token and the
list id are all set; the list id is set only once Amazon SES has granted production access."""
import json
import urllib.parse
import urllib.request

from django.conf import settings

SIGNS = ('aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
         'sagittarius', 'capricorn', 'aquarius', 'pisces')
PAGE = 1000
LIST_NAME = 'Ishtar Insights'
TEMPLATE_NAME = 'Ishtar issue (content only)'
SITE_UNSUBSCRIBE = 'https://ishtarinsights.com/unsubscribe.html#'
LIVE_STATES = ('unconfirmed', 'confirmed')


def configured():
    return bool(settings.LISTMONK_API_USER and settings.LISTMONK_API_TOKEN and settings.LISTMONK_LIST_ID)


def _request(method, path, body=None, params=None, raw=False):
    url = settings.LISTMONK_URL.rstrip('/') + path
    if params:
        url += '?' + urllib.parse.urlencode(params, doseq=True)
    data = json.dumps(body).encode() if body is not None else None
    headers = {'Authorization': f'token {settings.LISTMONK_API_USER}:{settings.LISTMONK_API_TOKEN}'}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=5) as response:
        payload = response.read()
    if raw:
        return payload.decode('utf-8')
    return json.loads(payload)['data'] if payload.strip() else {}


def _list():
    return int(settings.LISTMONK_LIST_ID)


def _find(email):
    # listmonk looks a subscriber up by an SQL expression, and a quote is legal in an address.
    quoted = email.lower().replace("'", "''")
    found = _request('GET', '/api/subscribers', params={'query': f"subscribers.email = '{quoted}'", 'per_page': 1})
    results = found.get('results') or []
    return results[0] if results else None


def _state(member):
    """The member's subscription status on the newsletter list, or None when it is not on it."""
    for entry in member.get('lists') or []:
        if entry.get('id') == _list():
            return entry.get('subscription_status')
    return None


def _attribs(subscriber):
    return {'sign': subscriber.sun_sign, 'siteunsub': SITE_UNSUBSCRIBE + subscriber.unsubscribe_token}


def _add(member_id):
    _request('PUT', '/api/subscribers/lists', {'ids': [member_id], 'action': 'add', 'target_list_ids': [_list()],
                                               'status': 'unconfirmed'})
    # The list is double opt-in: this is the confirmation email.
    _request('POST', f'/api/subscribers/{member_id}/optin', {})


def push(subscriber, resubscribe=False):
    if not configured():
        return
    member = _find(subscriber.email)
    if member is None:
        # listmonk sends the double opt-in email itself when an unconfirmed member joins the list.
        _request('POST', '/api/subscribers', {'email': subscriber.email, 'name': 'Reader', 'status': 'enabled',
                                              'lists': [_list()], 'attribs': _attribs(subscriber),
                                              'preconfirm_subscriptions': False})
        return
    _request('PATCH', f"/api/subscribers/{member['id']}", {'attribs': _attribs(subscriber)})
    if member.get('status') == 'blocklisted':
        return   # a hard bounce or a spam complaint; a new signup does not override it
    state = _state(member)
    if state is None:
        _add(member['id'])
    elif state == 'unsubscribed' and resubscribe:
        # A fresh signup on the site is fresh consent. The reconcile (resubscribe=False) never does this.
        _request('PUT', '/api/subscribers/lists', {'ids': [member['id']], 'action': 'remove', 'target_list_ids': [_list()]})
        _add(member['id'])


def remove(email):
    if not configured():
        return
    member = _find(email)
    if member is None or _state(member) in (None, 'unsubscribed'):
        return
    _request('PUT', '/api/subscribers/lists', {'ids': [member['id']], 'action': 'unsubscribe', 'target_list_ids': [_list()]})


def members():
    """(email, 'live' | 'gone') for everyone on the newsletter list. Gone = unsubscribed, or blocklisted
    by listmonk after a hard bounce or a complaint."""
    if not configured():
        return
    page = 1
    while True:
        found = _request('GET', '/api/subscribers', params={'list_id': _list(), 'page': page, 'per_page': PAGE})
        for member in found.get('results') or []:
            live = member.get('status') != 'blocklisted' and _state(member) in LIVE_STATES
            yield member['email'].lower(), 'live' if live else 'gone'
        if page * PAGE >= found.get('total', 0):
            return
        page += 1


def template_id():
    for template in _request('GET', '/api/templates'):
        if template.get('name') == TEMPLATE_NAME:
            return template['id']
    raise LookupError(f'listmonk has no template named {TEMPLATE_NAME!r}; run manage.py setup_listmonk')
```

- [ ] **Step 5: Run the tests**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_listmonk`
Expected: all pass.

- [ ] **Step 6: RED evidence for the guards**

One at a time, make each change, run the file, confirm the named test fails, and restore:
- delete the `.replace("'", "''")` → `test_a_quote_in_the_address_is_doubled_in_the_lookup` fails
- delete the `if member.get('status') == 'blocklisted': return` lines → `test_a_blocklisted_address_is_never_added_back` fails
- change `elif state == 'unsubscribed' and resubscribe:` to `elif state == 'unsubscribed':` → `test_the_reconcile_never_resubscribes_someone_who_left` fails
- change `configured()` to drop `settings.LISTMONK_LIST_ID` → `test_a_token_without_the_list_id_is_not_live` fails

- [ ] **Step 7: Commit**

```bash
git add server/ishtar/newsletter/listmonk.py server/ishtar/newsletter/tests/test_listmonk.py server/ishtar/ishtar/settings.py
git commit -m "feat(newsletter): listmonk client with the Mailchimp module's interface"
```

---

### Task 5: `sync_listmonk`

**Files:**
- Create: `server/ishtar/newsletter/management/commands/sync_listmonk.py`
- Modify: `server/ishtar/newsletter/tests/test_sync.py` (whole file rewritten below)

**Interfaces:**
- Consumes: `listmonk.configured()`, `listmonk.members()` yielding `(email, 'live'|'gone')`, `listmonk.push(row)`, `listmonk.remove(email)`.
- Produces: `manage.py sync_listmonk`, printing `pushed=N removed=N deleted=N failed=N`.

- [ ] **Step 1: Rewrite `server/ishtar/newsletter/tests/test_sync.py`**

```python
import io
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from newsletter.models import Subscriber


def row(email):
    return Subscriber.objects.create(email=email, consent_at=timezone.now(), consent_version='v', consent_text='t')


def patched(members, configured=True, push=None):
    return (mock.patch('newsletter.listmonk.configured', return_value=configured),
            mock.patch('newsletter.listmonk.members', **({'side_effect': members} if isinstance(members, Exception) else {'return_value': iter(members)})),
            mock.patch('newsletter.listmonk.push', **({'side_effect': push} if push else {})),
            mock.patch('newsletter.listmonk.remove'))


def run(members, configured=True):
    out = io.StringIO()
    a, b, c, d = patched(members, configured)
    with a, b, c as push, d as remove:
        call_command('sync_listmonk', stdout=out)
    return push, remove, out.getvalue()


class SyncTests(TestCase):
    def test_database_only_row_is_pushed_without_resubscribe(self):
        new = row('new@example.com')
        push, remove, out = run([])
        push.assert_called_once_with(new)
        remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=1 removed=0 deleted=0 failed=0')

    def test_live_list_member_missing_from_database_is_removed(self):
        row('stays@example.com')
        push, remove, out = run([('gone@example.com', 'live'), ('waiting@example.com', 'live'), ('stays@example.com', 'live')])
        self.assertEqual(sorted(c.args[0] for c in remove.call_args_list), ['gone@example.com', 'waiting@example.com'])
        self.assertEqual(out.strip(), 'pushed=0 removed=2 deleted=0 failed=0')

    def test_member_who_left_bounced_or_complained_is_deleted_here(self):
        row('left@example.com'); row('stays@example.com')
        push, remove, out = run([('left@example.com', 'gone'), ('stays@example.com', 'live')])
        self.assertEqual(list(Subscriber.objects.values_list('email', flat=True)), ['stays@example.com'])
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=0 removed=0 deleted=1 failed=0')

    def test_gone_on_both_sides_and_in_step_on_both_sides_do_nothing(self):
        row('both@example.com')
        push, remove, out = run([('both@example.com', 'live'), ('old@example.com', 'gone')])
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(out.strip(), 'pushed=0 removed=0 deleted=0 failed=0')

    def test_unconfigured_run_touches_nothing(self):
        row('keep@example.com')
        push, remove, out = run([], configured=False)
        push.assert_not_called()
        self.assertIn('not configured', out)

    def test_output_never_contains_an_address(self):
        row('secret@example.com')
        self.assertNotIn('secret', run([('other@example.com', 'live')])[2])

    def test_no_subscribers_but_a_live_list_refuses_to_unsubscribe_everyone(self):
        a, b, c, d = patched([('a@example.com', 'live'), ('b@example.com', 'live')])
        with a, b, c as push, d as remove, self.assertRaises(CommandError):
            call_command('sync_listmonk', stdout=io.StringIO())
        remove.assert_not_called(); push.assert_not_called()

    def test_a_rejected_push_does_not_stop_the_run_but_still_fails_the_command(self):
        row('bad@example.com'); row('ok@example.com'); row('gone@example.com')

        def flaky(subscriber):
            if subscriber.email == 'bad@example.com':
                raise RuntimeError('400 invalid address')

        out = io.StringIO()
        a, b, c, d = patched([('gone@example.com', 'gone')], push=flaky)
        with a, b, c as push, d as remove:
            with self.assertRaises(CommandError):
                call_command('sync_listmonk', stdout=out)
        self.assertEqual(out.getvalue().strip(), 'pushed=1 removed=0 deleted=1 failed=1')
        self.assertEqual(push.call_count, 2)
        remaining = list(Subscriber.objects.values_list('email', flat=True))
        self.assertIn('bad@example.com', remaining); self.assertNotIn('gone@example.com', remaining)

    def test_a_failing_members_call_aborts_before_any_action(self):
        row('keep@example.com')
        a, b, c, d = patched(RuntimeError('down'))
        with a, b, c as push, d as remove, self.assertRaises(RuntimeError):
            call_command('sync_listmonk', stdout=io.StringIO())
        push.assert_not_called(); remove.assert_not_called()
        self.assertEqual(list(Subscriber.objects.values_list('email', flat=True)), ['keep@example.com'])
```

- [ ] **Step 2: Run to see them fail**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_sync`
Expected: ERROR, `Unknown command: 'sync_listmonk'`.

- [ ] **Step 3: Write `server/ishtar/newsletter/management/commands/sync_listmonk.py`**

```python
from django.core.management.base import BaseCommand, CommandError

from newsletter import listmonk
from newsletter.models import Subscriber


class Command(BaseCommand):
    help = 'Two-way reconcile of the subscriber table with the listmonk list. Prints counts, never addresses.'

    def handle(self, **options):
        if not listmonk.configured():
            self.stdout.write('listmonk not configured; nothing to do.')
            return
        # ponytail: full diff each run, fine to a few thousand members; filter on updated_at when a run
        # takes more than a few seconds.
        on_list = dict(listmonk.members())
        rows = {row.email: row for row in Subscriber.objects.all()}
        if on_list and not rows:
            raise CommandError('no subscribers in the database but %d on the list; '
                               'refusing to unsubscribe everyone' % len(on_list))
        pushed = removed = failed = 0
        for email, row in rows.items():
            if email not in on_list:
                try:
                    listmonk.push(row)
                    pushed += 1
                except Exception:
                    failed += 1
        for email, state in on_list.items():
            if state == 'live' and email not in rows:
                try:
                    listmonk.remove(email)
                    removed += 1
                except Exception:
                    failed += 1
        left = [email for email, state in on_list.items() if state == 'gone' and email in rows]
        Subscriber.objects.filter(email__in=left).delete()
        self.stdout.write(f'pushed={pushed} removed={removed} deleted={len(left)} failed={failed}')
        if failed:
            raise CommandError('%d listmonk calls failed' % failed)
```

- [ ] **Step 4: Run the tests**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_sync`
Expected: all pass.

- [ ] **Step 5: RED evidence** — delete the `if on_list and not rows:` guard, confirm `test_no_subscribers_but_a_live_list_refuses_to_unsubscribe_everyone` fails, restore.

- [ ] **Step 6: Commit**

```bash
git add server/ishtar/newsletter/management/commands/sync_listmonk.py server/ishtar/newsletter/tests/test_sync.py
git commit -m "feat(newsletter): sync_listmonk reconcile"
```

---

### Task 6: `setup_listmonk`

**Files:**
- Create: `server/ishtar/newsletter/management/commands/setup_listmonk.py`
- Create: `server/ishtar/newsletter/tests/test_setup_listmonk.py`

**Interfaces:**
- Consumes: `listmonk._request`, `listmonk.LIST_NAME`, `listmonk.TEMPLATE_NAME`, settings `LISTMONK_API_USER`, `LISTMONK_API_TOKEN`, `SES_SMTP_USER`, `SES_SMTP_PASSWORD`.
- Produces: `manage.py setup_listmonk`, idempotent; prints `list: <name> id=<n>` and `template: <name> id=<n>` and `settings: written`; never prints the password.

- [ ] **Step 1: Write the failing tests** — `server/ishtar/newsletter/tests/test_setup_listmonk.py`

```python
import io
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from newsletter import listmonk

CONFIG = dict(LISTMONK_API_USER='ishtar', LISTMONK_API_TOKEN='tok', SES_SMTP_USER='AKIAEXAMPLE', SES_SMTP_PASSWORD='s3cret+pw/x')
KEYS = ('app.root_url', 'app.from_email', 'app.enable_public_subscription_page', 'app.max_send_errors',
        'privacy.individual_tracking', 'privacy.unsubscribe_header', 'bounce.enabled', 'bounce.webhooks_enabled',
        'bounce.ses_enabled')


def current_settings(drop=None):
    found = {key: None for key in KEYS if key != drop}
    found['app.site_name'] = 'listmonk'
    found['smtp'] = [{'enabled': True, 'host': 'localhost', 'port': 25, 'auth_protocol': 'none', 'username': '',
                      'password': '', 'tls_type': 'none', 'max_conns': 10, 'uuid': 'a'},
                     {'enabled': True, 'host': 'other', 'port': 25, 'uuid': 'b'}]
    return found


class Fake:
    def __init__(self, lists=(), templates=(), settings=None):
        self.calls, self.lists, self.templates = [], list(lists), list(templates)
        self.settings = settings if settings is not None else current_settings()

    def __call__(self, method, path, body=None, params=None, raw=False):
        self.calls.append((method, path, body, params))
        if (method, path) == ('GET', '/api/lists'):
            return {'results': self.lists}
        if (method, path) == ('POST', '/api/lists'):
            return {'id': 3}
        if (method, path) == ('GET', '/api/templates'):
            return self.templates
        if (method, path) == ('POST', '/api/templates'):
            return {'id': 5}
        if (method, path) == ('GET', '/api/settings'):
            return self.settings
        return {}

    def call(self, method, path):
        return [c for c in self.calls if c[:2] == (method, path)]


@override_settings(**CONFIG)
class SetupTests(TestCase):
    def run_setup(self, fake):
        out = io.StringIO()
        with mock.patch('newsletter.listmonk._request', fake):
            call_command('setup_listmonk', stdout=out)
        return out.getvalue()

    def test_creates_a_private_double_opt_in_list_and_a_content_only_template(self):
        fake = Fake()
        out = self.run_setup(fake)
        self.assertEqual(fake.call('POST', '/api/lists')[0][2], {'name': listmonk.LIST_NAME, 'type': 'private', 'optin': 'double'})
        self.assertEqual(fake.call('POST', '/api/templates')[0][2],
                         {'name': listmonk.TEMPLATE_NAME, 'type': 'campaign', 'body': '{{ template "content" . }}'})
        self.assertIn(f'list: {listmonk.LIST_NAME} id=3', out)
        self.assertIn(f'template: {listmonk.TEMPLATE_NAME} id=5', out)

    def test_existing_list_and_template_are_reused(self):
        fake = Fake(lists=[{'id': 8, 'name': listmonk.LIST_NAME}], templates=[{'id': 9, 'name': listmonk.TEMPLATE_NAME}])
        out = self.run_setup(fake)
        self.assertEqual(fake.call('POST', '/api/lists') + fake.call('POST', '/api/templates'), [])
        self.assertIn('id=8', out); self.assertIn('id=9', out)

    def test_writes_every_setting_keeps_unrelated_ones_and_uses_ses_on_the_first_smtp_server_only(self):
        fake = Fake()
        self.run_setup(fake)
        written = fake.call('PUT', '/api/settings')[0][2]
        self.assertEqual({k: written[k] for k in KEYS}, {
            'app.root_url': 'https://news.ishtarinsights.com',
            'app.from_email': 'Ishtar Insights <newsletter@ishtarinsights.com>',
            'app.enable_public_subscription_page': False, 'app.max_send_errors': 1,
            'privacy.individual_tracking': False, 'privacy.unsubscribe_header': True,
            'bounce.enabled': True, 'bounce.webhooks_enabled': True, 'bounce.ses_enabled': True})
        self.assertEqual(written['app.site_name'], 'listmonk')
        self.assertEqual(written['smtp'][0], {'enabled': True, 'host': 'email-smtp.us-east-1.amazonaws.com', 'port': 587,
                                              'auth_protocol': 'login', 'username': 'AKIAEXAMPLE', 'password': 's3cret+pw/x',
                                              'tls_type': 'STARTTLS', 'max_conns': 10, 'uuid': 'a'})
        self.assertEqual(written['smtp'][1]['enabled'], False)

    def test_a_setting_listmonk_does_not_have_stops_before_anything_is_written(self):
        fake = Fake(settings=current_settings(drop='bounce.ses_enabled'))
        with self.assertRaisesMessage(CommandError, 'bounce.ses_enabled'):
            self.run_setup(fake)
        self.assertEqual(fake.call('PUT', '/api/settings'), [])

    @override_settings(SES_SMTP_PASSWORD='')
    def test_refuses_without_the_ses_credentials(self):
        fake = Fake()
        with self.assertRaisesMessage(CommandError, 'SES_SMTP_PASSWORD'):
            self.run_setup(fake)
        self.assertEqual(fake.calls, [])

    @override_settings(LISTMONK_API_TOKEN='')
    def test_refuses_without_the_api_token(self):
        with self.assertRaisesMessage(CommandError, 'LISTMONK_API_TOKEN'):
            self.run_setup(Fake())

    def test_never_prints_the_password(self):
        self.assertNotIn('s3cret', self.run_setup(Fake()))
```

- [ ] **Step 2: Run to see them fail**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_setup_listmonk`
Expected: ERROR, `Unknown command: 'setup_listmonk'`.

- [ ] **Step 3: Write `server/ishtar/newsletter/management/commands/setup_listmonk.py`**

```python
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from newsletter import listmonk

# listmonk's settings, kept in code so a rebuilt instance needs no clicking (docs/NEWSLETTER.md).
SETTINGS = {
    'app.root_url': 'https://news.ishtarinsights.com',
    'app.from_email': 'Ishtar Insights <newsletter@ishtarinsights.com>',
    'app.enable_public_subscription_page': False,   # signups come only through the site's consent form
    'app.max_send_errors': 1,   # one SMTP failure pauses the campaign, so draft_campaign --send fails loudly
    'privacy.individual_tracking': False,
    'privacy.unsubscribe_header': True,   # List-Unsubscribe and one-click, which Gmail and Yahoo require
    'bounce.enabled': True,
    'bounce.webhooks_enabled': True,
    'bounce.ses_enabled': True,
}
SMTP = {'enabled': True, 'host': 'email-smtp.us-east-1.amazonaws.com', 'port': 587, 'auth_protocol': 'login',
        'tls_type': 'STARTTLS', 'max_conns': 10}
TEMPLATE_BODY = '{{ template "content" . }}'


class Command(BaseCommand):
    help = ("Create the newsletter list and the content-only campaign template if missing, and write listmonk's "
            'settings (root URL, sender, SES SMTP, bounces, privacy). Safe to re-run. Prints the list id for '
            'LISTMONK_LIST_ID.')

    def handle(self, **options):
        for name in ('LISTMONK_API_USER', 'LISTMONK_API_TOKEN', 'SES_SMTP_USER', 'SES_SMTP_PASSWORD'):
            if not getattr(settings, name):
                raise CommandError(f'{name} is not set in the environment; see docs/newsletter-aws-setup.md')

        lists = listmonk._request('GET', '/api/lists', params={'per_page': 100}).get('results') or []
        found = next((l for l in lists if l.get('name') == listmonk.LIST_NAME), None)
        list_id = found['id'] if found else listmonk._request(
            'POST', '/api/lists', {'name': listmonk.LIST_NAME, 'type': 'private', 'optin': 'double'})['id']
        self.stdout.write(f'list: {listmonk.LIST_NAME} id={list_id}')

        templates = listmonk._request('GET', '/api/templates')
        found = next((t for t in templates if t.get('name') == listmonk.TEMPLATE_NAME), None)
        template = found['id'] if found else listmonk._request(
            'POST', '/api/templates', {'name': listmonk.TEMPLATE_NAME, 'type': 'campaign', 'body': TEMPLATE_BODY})['id']
        self.stdout.write(f'template: {listmonk.TEMPLATE_NAME} id={template}')

        current = listmonk._request('GET', '/api/settings')
        missing = [key for key in [*SETTINGS, 'smtp'] if key not in current]
        if missing or not current.get('smtp'):
            raise CommandError(f"listmonk has no setting {', '.join(missing) or 'smtp[0]'}; "
                               'check the listmonk version against this command')
        smtp = [dict(current['smtp'][0], **SMTP, username=settings.SES_SMTP_USER, password=settings.SES_SMTP_PASSWORD)]
        smtp += [dict(server, enabled=False) for server in current['smtp'][1:]]
        listmonk._request('PUT', '/api/settings', {**current, **SETTINGS, 'smtp': smtp})
        self.stdout.write('settings: written (listmonk reloads itself)')
```

- [ ] **Step 4: Run the tests**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_setup_listmonk`
Expected: all pass.

- [ ] **Step 5: RED evidence** — replace the `missing` check with `missing = []`, confirm `test_a_setting_listmonk_does_not_have_stops_before_anything_is_written` fails (a PUT is recorded), restore.

- [ ] **Step 6: Commit**

```bash
git add server/ishtar/newsletter/management/commands/setup_listmonk.py server/ishtar/newsletter/tests/test_setup_listmonk.py
git commit -m "feat(newsletter): setup_listmonk writes listmonk's list, template and settings"
```

---

### Task 7: `draft_campaign` on listmonk, with a send that waits for the truth

**Files:**
- Modify: `server/ishtar/newsletter/management/commands/draft_campaign.py` (whole file replaced)
- Modify: `server/ishtar/newsletter/tests/test_draft_campaign.py` (whole file replaced)

**Interfaces:**
- Consumes: `listmonk.configured()`, `listmonk._request(..., raw=True)`, `listmonk.template_id()`, `settings.LISTMONK_LIST_ID`, `settings.NEWSLETTER_ISSUE_DIR`; the manifest keys `title, subject, preview, from_name, reply_to, bytes, signs_included, signs_missing, html_sha256` written by `tools/build_newsletter.cjs`.
- Produces: `manage.py draft_campaign <monday> [--test ADDRESS] [--replace] [--send]` — same arguments as today; exit 0 with `--send` only when listmonk reports `finished` and `sent == to_send`. Module constants `POLL_SECONDS = 10`, `WAIT_SECONDS = 900`.

- [ ] **Step 1: Replace `server/ishtar/newsletter/tests/test_draft_campaign.py`**

```python
import hashlib
import io
import json
import tempfile
import urllib.error
from pathlib import Path
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

WEEK = '2026-09-21'
HTML = '<html><body>{{ $sign := or .Subscriber.Attribs.sign "" }}{{ if eq $sign "aries" }}ram{{ else }}none{{ end }}</body></html>'
TITLE = f'Ishtar Insights {WEEK}'
COMMAND = 'newsletter.management.commands.draft_campaign'


class FakeListmonk:
    """Records every call and answers like listmonk's API for the endpoints the command uses."""
    def __init__(self, campaigns=(), statuses=('finished',), sent=2, to_send=2, fail=None):
        self.calls, self.campaigns, self.statuses = [], list(campaigns), list(statuses)
        self.sent, self.to_send, self.fail = sent, to_send, fail

    def __call__(self, method, path, body=None, params=None, raw=False):
        self.calls.append((method, path, body, params))
        if self.fail and method == self.fail[0] and path.endswith(self.fail[1]):
            raise self.fail[2]
        if (method, path) == ('GET', '/api/campaigns'):
            return {'results': self.campaigns}
        if (method, path) == ('POST', '/api/campaigns'):
            return {'id': 11, 'status': 'draft'}
        if (method, path) == ('GET', '/api/templates'):
            return [{'id': 5, 'name': 'Ishtar issue (content only)'}]
        if path.endswith('/preview'):
            return '<html>rendered</html>'
        if method == 'GET' and path.startswith('/api/campaigns/'):
            status = self.statuses.pop(0) if len(self.statuses) > 1 else self.statuses[0]
            return {'id': 11, 'status': status, 'sent': self.sent, 'to_send': self.to_send}
        return {}

    def started(self):
        return [c for c in self.calls if c[1].endswith('/status')]


def http_error(code, body):
    return urllib.error.HTTPError('http://127.0.0.1:9000', code, 'Bad Request', {}, io.BytesIO(body))


class DraftCampaignTests(TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        (Path(self.tmp.name) / WEEK).mkdir()
        (Path(self.tmp.name) / WEEK / 'issue.html').write_text(HTML, encoding='utf-8')
        self.manifest = {'week': WEEK, 'title': TITLE, 'subject': 'Start the week tidy', 'preview': 'A waxing Moon.',
                         'from_name': 'Ishtar Insights', 'reply_to': 'newsletter@ishtarinsights.com', 'bytes': len(HTML),
                         'signs_included': ['aries'] * 12, 'signs_missing': [],
                         'html_sha256': hashlib.sha256(HTML.encode()).hexdigest()}
        self.write_manifest()

    def write_manifest(self):
        (Path(self.tmp.name) / WEEK / 'issue.json').write_text(json.dumps(self.manifest), encoding='utf-8')

    def run_command(self, fake, *args, configured=True, clock=None):
        out = io.StringIO()
        clock = clock or iter(range(0, 100000, 10))
        with override_settings(NEWSLETTER_ISSUE_DIR=self.tmp.name, LISTMONK_LIST_ID='3'), \
                mock.patch('newsletter.listmonk.configured', return_value=configured), \
                mock.patch('newsletter.listmonk._request', fake), \
                mock.patch(f'{COMMAND}.time.sleep') as sleep, \
                mock.patch(f'{COMMAND}.time.monotonic', side_effect=lambda: next(clock)):
            call_command('draft_campaign', WEEK, *args, stdout=out)
        self.sleep = sleep
        return out.getvalue()

    def body(self):
        return {'name': TITLE, 'subject': 'Start the week tidy', 'lists': [3], 'type': 'regular',
                'from_email': 'Ishtar Insights <newsletter@ishtarinsights.com>', 'content_type': 'html',
                'body': HTML, 'template_id': 5, 'messenger': 'email'}

    def test_creates_the_draft_renders_its_preview_and_does_not_start_it(self):
        fake = FakeListmonk()
        out = self.run_command(fake)
        self.assertIn(('POST', '/api/campaigns', self.body(), None), fake.calls)
        self.assertIn(('GET', '/api/campaigns/11/preview', None, None), fake.calls)
        self.assertEqual(fake.started(), [])
        self.assertIn('draft ready', out)
        self.assertIn('preview rendered', out)
        self.assertIn('/admin/campaigns/11', out)

    def test_nothing_but_send_ever_starts_a_campaign(self):
        for args in ([], ['--test', 'owner@example.com'], ['--replace']):
            draft = [{'id': 4, 'name': TITLE, 'status': 'draft'}] if args == ['--replace'] else []
            fake = FakeListmonk(campaigns=draft)
            self.run_command(fake, *args)
            self.assertEqual(fake.started(), [], args)

    def test_an_existing_draft_is_left_alone_without_replace_and_updated_with_it(self):
        draft = [{'id': 4, 'name': 'Ishtar Insights 2026-09-14', 'status': 'finished'}, {'id': 6, 'name': TITLE, 'status': 'draft'}]
        with self.assertRaisesMessage(CommandError, '--replace'):
            self.run_command(FakeListmonk(campaigns=draft))
        fake = FakeListmonk(campaigns=draft)
        self.run_command(fake, '--replace')
        self.assertEqual([c for c in fake.calls if c[:2] == ('POST', '/api/campaigns')], [])
        self.assertIn(('PUT', '/api/campaigns/6', self.body(), None), fake.calls)

    def test_a_campaign_that_is_not_a_draft_is_never_touched(self):
        for status in ('running', 'paused', 'finished', 'cancelled', 'scheduled'):
            fake = FakeListmonk(campaigns=[{'id': 6, 'name': TITLE, 'status': status}])
            with self.assertRaisesMessage(CommandError, f'already {status}'):
                self.run_command(fake, '--replace', '--send')
            self.assertEqual([c[0] for c in fake.calls], ['GET'], status)

    def test_a_template_listmonk_cannot_render_stops_before_any_send(self):
        fake = FakeListmonk(fail=('GET', '/preview', http_error(400, b'{"message": "template: content:1: unexpected EOF"}')))
        with self.assertRaises(CommandError) as caught:
            self.run_command(fake, '--send')
        self.assertIn('unexpected EOF', str(caught.exception))
        self.assertEqual(fake.started(), [])

    def test_test_send_goes_to_the_one_address_before_any_send_and_is_not_echoed(self):
        fake = FakeListmonk()
        out = self.run_command(fake, '--test', 'owner@example.com', '--send')
        test = next(c for c in fake.calls if c[1] == '/api/campaigns/11/test')
        self.assertEqual(test[2], dict(self.body(), subscribers=['owner@example.com']))
        self.assertLess(fake.calls.index(test), fake.calls.index(fake.started()[0]))
        self.assertIn('sign of the subscriber', out)
        self.assertNotIn('owner@example.com', out)

    def test_a_rejected_test_send_never_echoes_the_address(self):
        fake = FakeListmonk(fail=('POST', '/test', http_error(400, b'{"message": "owner@example.com is not a subscriber"}')))
        with self.assertRaises(CommandError) as caught:
            self.run_command(fake, '--test', 'owner@example.com')
        self.assertNotIn('owner@example.com', str(caught.exception))
        self.assertIn('test send', str(caught.exception))

    def test_send_starts_the_campaign_and_waits_until_listmonk_reports_it_finished(self):
        fake = FakeListmonk(statuses=('running', 'running', 'finished'))
        out = self.run_command(fake, '--send')
        self.assertEqual(fake.started(), [('PUT', '/api/campaigns/11/status', {'status': 'running'}, None)])
        self.assertLess(fake.calls.index(('GET', '/api/campaigns/11/preview', None, None)), fake.calls.index(fake.started()[0]))
        self.assertEqual(self.sleep.call_count, 2)
        self.assertIn(f'SENT: {TITLE} to 2', out)

    def test_send_fails_when_listmonk_pauses_or_cancels_the_campaign(self):
        for status in ('paused', 'cancelled'):
            fake = FakeListmonk(statuses=('running', status), sent=1, to_send=2)
            # 'listmonk paused', not just 'paused': the timeout message says 'still paused'.
            with self.assertRaisesMessage(CommandError, f'listmonk {status}'):
                self.run_command(fake, '--send')

    def test_send_fails_when_fewer_were_sent_than_queued(self):
        fake = FakeListmonk(statuses=('finished',), sent=1, to_send=2)
        with self.assertRaisesMessage(CommandError, '1 of 2'):
            self.run_command(fake, '--send')

    def test_send_fails_when_the_campaign_is_still_running_after_the_wait(self):
        fake = FakeListmonk(statuses=('running',), sent=1, to_send=2)
        with self.assertRaisesMessage(CommandError, 'still running'):
            self.run_command(fake, '--send', clock=iter([0, 300, 600, 901]))

    def test_send_refuses_when_a_sign_has_no_reading(self):
        self.manifest.update(signs_included=['aries'] * 11, signs_missing=['gemini'])
        self.write_manifest()
        fake = FakeListmonk()
        with self.assertRaisesMessage(CommandError, 'gemini'):
            self.run_command(fake, '--send')
        self.assertEqual(fake.started(), [])

    def test_missing_signs_are_named_on_a_draft(self):
        self.manifest.update(signs_included=['aries'] * 11, signs_missing=['gemini'])
        self.write_manifest()
        self.assertIn('missing-reading panel: gemini', self.run_command(FakeListmonk()))

    def test_a_listmonk_rejection_is_reported_in_its_words_without_a_traceback(self):
        fake = FakeListmonk(fail=('POST', '/api/campaigns', http_error(400, b'{"message": "invalid from_email"}')))
        with self.assertRaises(CommandError) as caught:
            self.run_command(fake)
        self.assertIn('400', str(caught.exception))
        self.assertIn('invalid from_email', str(caught.exception))
        self.assertIn('--replace', str(caught.exception))

    def test_a_listmonk_that_does_not_answer_is_reported(self):
        fake = FakeListmonk(fail=('GET', '/api/campaigns', urllib.error.URLError('refused')))
        with self.assertRaisesMessage(CommandError, 'did not answer'):
            self.run_command(fake)

    def test_a_tampered_or_missing_issue_stops_before_any_call(self):
        self.manifest['html_sha256'] = '0' * 64
        self.write_manifest()
        fake = FakeListmonk()
        with self.assertRaisesMessage(CommandError, 'sha256'):
            self.run_command(fake)
        self.assertEqual(fake.calls, [])
        with self.assertRaisesMessage(CommandError, 'no pushed issue'):
            with override_settings(NEWSLETTER_ISSUE_DIR=self.tmp.name), \
                    mock.patch('newsletter.listmonk.configured', return_value=True), mock.patch('newsletter.listmonk._request', fake):
                call_command('draft_campaign', '2026-09-28', stdout=io.StringIO())
        with self.assertRaisesMessage(CommandError, 'YYYY-MM-DD'):
            call_command('draft_campaign', '../etc', stdout=io.StringIO())

    def test_without_configuration_it_does_nothing(self):
        fake = FakeListmonk()
        self.assertIn('not configured', self.run_command(fake, configured=False))
        self.assertEqual(fake.calls, [])

    def test_a_truncated_manifest_or_a_missing_key_is_caught_before_any_call(self):
        (Path(self.tmp.name) / WEEK / 'issue.json').write_text('{"week":', encoding='utf-8')
        fake = FakeListmonk()
        with self.assertRaisesMessage(CommandError, 'no pushed issue'):
            self.run_command(fake)
        del self.manifest['signs_missing']
        self.write_manifest()
        with self.assertRaisesMessage(CommandError, 'signs_missing'):
            self.run_command(fake)
        self.assertEqual(fake.calls, [])

    def test_hashes_the_pushed_bytes_and_preserves_crlf(self):
        crlf = '<html><body>line1\r\nline2</body></html>'
        (Path(self.tmp.name) / WEEK / 'issue.html').write_bytes(crlf.encode('utf-8'))
        self.manifest.update(html_sha256=hashlib.sha256(crlf.encode('utf-8')).hexdigest(), bytes=len(crlf.encode('utf-8')))
        self.write_manifest()
        fake = FakeListmonk()
        self.run_command(fake)
        self.assertEqual(next(c for c in fake.calls if c[:2] == ('POST', '/api/campaigns'))[2]['body'], crlf)
```

- [ ] **Step 2: Run to see them fail**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_draft_campaign`
Expected: failures and errors (the command still imports `mailchimp`, has no `time` module attribute, calls Mailchimp paths).

- [ ] **Step 3: Replace `server/ishtar/newsletter/management/commands/draft_campaign.py`**

```python
import hashlib
import json
import re
import time
import urllib.error
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from newsletter import listmonk

POLL_SECONDS = 10
WAIT_SECONDS = 15 * 60


class Command(BaseCommand):
    help = ('Create or update the DRAFT listmonk campaign for a week from the files pushed by '
            'tools/build_newsletter.cjs, render its preview, and optionally send one test. It sends the campaign '
            'to the whole list only with --send, which the unattended Sunday job passes, and then waits until '
            'listmonk reports every message handed to SES.')

    def add_arguments(self, parser):
        parser.add_argument('week', help='The Monday the issue is for, YYYY-MM-DD.')
        parser.add_argument('--test', metavar='ADDRESS', help='Send one test email to this subscriber.')
        parser.add_argument('--replace', action='store_true', help='Overwrite an existing draft for this week.')
        parser.add_argument('--send', action='store_true',
                            help='Send the campaign to the whole list once every gate below passes. '
                                 'This is not reversible.')

    def handle(self, week, test=None, replace=False, send=False, **options):
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', week):
            raise CommandError('week must be YYYY-MM-DD')
        if not listmonk.configured():
            self.stdout.write('listmonk not configured; nothing to do.')
            return
        folder = Path(settings.NEWSLETTER_ISSUE_DIR) / week
        try:
            manifest = json.loads((folder / 'issue.json').read_text(encoding='utf-8'))
            data = (folder / 'issue.html').read_bytes()
        except (OSError, ValueError) as error:
            raise CommandError(f'no pushed issue for {week}: {error}')
        for key in ('title', 'subject', 'preview', 'from_name', 'reply_to', 'bytes', 'signs_included', 'signs_missing', 'html_sha256'):
            if key not in manifest:
                raise CommandError(f'issue.json has no {key!r}; build and push the issue again')
        if hashlib.sha256(data).hexdigest() != manifest['html_sha256']:
            raise CommandError('issue.html does not match the sha256 in issue.json; push the issue again')

        try:
            self.draft(manifest, data.decode('utf-8'), test, replace, send)
        except urllib.error.HTTPError as error:
            said = error.read().decode('utf-8', 'replace')[:600]
            raise CommandError(f'listmonk rejected the request ({error.code}): {said}\n'
                               f'If a draft was created it may be incomplete; run again with --replace.')
        except urllib.error.URLError as error:
            raise CommandError(f'listmonk did not answer: {error.reason}. '
                               f'If a draft now exists, run again with --replace.')

    def draft(self, manifest, html, test, replace, send):
        title = manifest['title']
        campaign = self.existing(title)
        if campaign and campaign['status'] != 'draft':
            raise CommandError(f"a campaign named {title!r} is already {campaign['status']}; not touching it")
        if campaign and not replace:
            raise CommandError(f'a draft named {title!r} exists; pass --replace to overwrite it')
        body = {'name': title, 'subject': manifest['subject'], 'lists': [int(settings.LISTMONK_LIST_ID)],
                'type': 'regular', 'from_email': f"{manifest['from_name']} <{manifest['reply_to']}>",
                'content_type': 'html', 'body': html, 'template_id': listmonk.template_id(), 'messenger': 'email'}
        if campaign:
            listmonk._request('PUT', f"/api/campaigns/{campaign['id']}", body)
        else:
            campaign = listmonk._request('POST', '/api/campaigns', body)
        cid = campaign['id']
        self.stdout.write(f"draft ready: {title} ({manifest['bytes']} bytes, {len(manifest['signs_included'])}/12 signs)")
        if manifest['signs_missing']:
            self.stdout.write('  readers of these signs get the missing-reading panel: ' + ', '.join(manifest['signs_missing']))

        try:
            listmonk._request('GET', f'/api/campaigns/{cid}/preview', raw=True)
        except urllib.error.HTTPError as error:
            said = error.read().decode('utf-8', 'replace')[:600]
            raise CommandError(f'listmonk could not render the campaign ({error.code}): {said}\n'
                               'The draft is in place and was NOT sent.')
        self.stdout.write('listmonk preview rendered')

        if test:
            try:
                listmonk._request('POST', f'/api/campaigns/{cid}/test', dict(body, subscribers=[test]))
            except urllib.error.HTTPError as error:
                raise CommandError(f'listmonk rejected the test send ({error.code}). The draft itself is in place. '
                                   'The address must belong to a subscriber; it is not repeated here.')
            self.stdout.write('test sent. listmonk fills attributes in a test, so it shows the sign of the '
                              'subscriber it went to.')

        if send:
            # The build refuses a week with a missing sign unless --allow-missing, which the Sunday job never
            # passes, so this is belt and braces.
            if manifest['signs_missing']:
                raise CommandError('not sending: no reading for ' + ', '.join(manifest['signs_missing'])
                                   + '. The draft is in place; repair the week and send it yourself.')
            listmonk._request('PUT', f'/api/campaigns/{cid}/status', {'status': 'running'})
            self.wait(cid, title)

        self.stdout.write(f'see it in listmonk: http://127.0.0.1:9000/admin/campaigns/{cid} '
                          '(through ssh -L 9000:127.0.0.1:9000 vps)')

    def wait(self, cid, title):
        """Return only when listmonk has handed every message to SES. setup_listmonk sets max_send_errors to 1,
        so one SMTP failure pauses the campaign and lands here as an error."""
        deadline = time.monotonic() + WAIT_SECONDS
        while True:
            state = listmonk._request('GET', f'/api/campaigns/{cid}')
            status, sent, to_send = state.get('status'), state.get('sent', 0), state.get('to_send', 0)
            if status == 'finished':
                if sent < to_send:
                    raise CommandError(f'listmonk finished {title!r} with {sent} of {to_send} sent')
                self.stdout.write(f'SENT: {title} to {sent} subscribed')
                return
            if status in ('paused', 'cancelled'):
                raise CommandError(f'listmonk {status} {title!r} after {sent} of {to_send}: an SMTP send failed. '
                                   'See `docker compose -f /opt/listmonk/docker-compose.yml logs app`.')
            if time.monotonic() >= deadline:
                raise CommandError(f'{title!r} still {status} after {WAIT_SECONDS // 60} minutes ({sent} of {to_send} sent)')
            time.sleep(POLL_SECONDS)

    def existing(self, title):
        found = listmonk._request('GET', '/api/campaigns', params={
            'order_by': 'created_at', 'order': 'DESC', 'per_page': 50, 'no_body': 'true'})
        for campaign in found.get('results') or []:
            if campaign.get('name') == title:
                return campaign
        return None
```

- [ ] **Step 4: Run the tests**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_draft_campaign`
Expected: all pass.

- [ ] **Step 5: RED evidence for each gate** — one at a time, confirm the named test fails, restore:
- delete the `if manifest['signs_missing']:` block under `if send:` → `test_send_refuses_when_a_sign_has_no_reading` fails
- replace the preview `try/except` with a bare `pass` → `test_a_template_listmonk_cannot_render_stops_before_any_send` fails
- delete `if sent < to_send:` and its raise → `test_send_fails_when_fewer_were_sent_than_queued` fails
- change `('paused', 'cancelled')` to `()` → `test_send_fails_when_listmonk_pauses_or_cancels_the_campaign` fails (it runs to the clock deadline and raises `… still paused …`, which lacks `listmonk paused`)
- change `campaign['status'] != 'draft'` to `False` → `test_a_campaign_that_is_not_a_draft_is_never_touched` fails

- [ ] **Step 6: Commit**

```bash
git add server/ishtar/newsletter/management/commands/draft_campaign.py server/ishtar/newsletter/tests/test_draft_campaign.py
git commit -m "feat(newsletter): draft_campaign on listmonk; --send waits for finished"
```

---

### Task 8: Switch the app to listmonk, consent v3, remove Mailchimp

**Files:**
- Modify: `server/ishtar/newsletter/views.py:13,33,38,42,58,63`
- Modify: `server/ishtar/newsletter/models.py:5`
- Modify: `server/ishtar/ishtar/settings.py:159-164`
- Modify: `server/ishtar/newsletter/tests/test_newsletter.py`
- Delete: `server/ishtar/newsletter/mailchimp.py`, `server/ishtar/newsletter/management/commands/sync_mailchimp.py`, `server/ishtar/newsletter/tests/test_mailchimp.py`

**Interfaces:**
- Consumes: `newsletter.listmonk.{SIGNS, push, remove}`.
- Produces: `settings.NEWSLETTER_CONSENT_VERSION == '2026-09-27-v3'`; no module imports `mailchimp`.

- [ ] **Step 1: Update the tests first**

In `server/ishtar/newsletter/tests/test_newsletter.py` make these exact replacements across the whole file:
- `newsletter.mailchimp.` → `newsletter.listmonk.`
- `class MailchimpHookTests` → `class ListmonkHookTests`
- `test_signup_survives_a_mailchimp_failure_and_logs_no_address` → `test_signup_survives_a_listmonk_failure_and_logs_no_address`
- `test_unsubscribe_survives_a_mailchimp_failure` → `test_unsubscribe_survives_a_listmonk_failure`
- `test_an_unknown_token_makes_no_mailchimp_call` → `test_an_unknown_token_makes_no_listmonk_call`
- `'2026-09-18-v2'` → `'2026-09-27-v3'` (two places: `PAYLOAD` and the `consent_version` assertion)

Then add to `ListmonkHookTests`:

```python
    def test_the_old_consent_version_is_refused(self):
        # v2 named Mailchimp; a signup must carry the wording the reader actually saw.
        with mock.patch('newsletter.listmonk.push') as push:
            self.assertEqual(self.post('/api/newsletter/subscribe', dict(PAYLOAD, consentVersion='2026-09-18-v2')).status_code, 400)
        push.assert_not_called()

    def test_the_stored_consent_text_names_amazon_not_mailchimp(self):
        with mock.patch('newsletter.listmonk.push'):
            self.post('/api/newsletter/subscribe', PAYLOAD)
        text = Subscriber.objects.get().consent_text
        self.assertIn('Amazon Web Services', text)
        self.assertNotIn('Mailchimp', text)
```

- [ ] **Step 2: Run to see them fail**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter.tests.test_newsletter`
Expected: failures (the view still calls `mailchimp.push`, so the listmonk mocks are never called; consent v3 is refused with 400).

- [ ] **Step 3: Switch the code**

`server/ishtar/newsletter/views.py`:
- line 13 `from . import mailchimp` → `from . import listmonk`
- line 33 docstring → `"""A listmonk failure must never fail a signup; sync_listmonk repairs whatever this drops."""`
- line 38 → `logger.warning('listmonk %s failed: %s', getattr(call, '__name__', 'call'), type(error).__name__)` (and the comment above it → `# The exception type only: error text can carry the address.`)
- line 42 `mailchimp.SIGNS` → `listmonk.SIGNS`
- line 58 `mailchimp.push` → `listmonk.push`; line 63 `mailchimp.remove` → `listmonk.remove`

`server/ishtar/newsletter/models.py` line 5: `from .mailchimp import SIGNS` → `from .listmonk import SIGNS` (the model's `choices` are unchanged, so no migration).

`server/ishtar/ishtar/settings.py`: replace the two consent lines with

```python
NEWSLETTER_CONSENT_VERSION = '2026-09-27-v3'
NEWSLETTER_CONSENT_TEXT = 'Yes, email me the Ishtar Insights newsletter and occasional updates about new readings and features. Emails are sent from our own server through Amazon Web Services.'
```
and delete the comment `# Empty key = every newsletter.mailchimp call is a no-op, …` and the three `MAILCHIMP_*` lines. The listmonk block added in Task 4 (with its own comment) and the `NEWSLETTER_ISSUE_DIR` lines stay as they are.

Delete the Mailchimp files:

```bash
git rm server/ishtar/newsletter/mailchimp.py server/ishtar/newsletter/management/commands/sync_mailchimp.py server/ishtar/newsletter/tests/test_mailchimp.py
```

- [ ] **Step 4: Run the whole newsletter suite and check nothing still names Mailchimp**

Run: `cd server/ishtar; .venv/Scripts/python.exe manage.py test newsletter accounts`
Expected: all pass.
Run: `git grep -n -i mailchimp -- server/ishtar`
Expected: no output. (A migration file naming Mailchimp in a help text would be the one allowed exception; there is none today.)

- [ ] **Step 5: Commit**

```bash
git add -A server/ishtar
git commit -m "feat(newsletter): signups push to listmonk; consent v3 names AWS; Mailchimp code removed"
```

---

### Task 9: The issue builder speaks listmonk

**Files:**
- Modify: `tools/build_newsletter.cjs:2-10,42,129-139,141-147,148-151,172,182-184,252`
- Modify: `tests/newsletter-build.test.cjs:39-50,67-92,117-124,140-152` (plus one new test)

**Interfaces:**
- Consumes: nothing new.
- Produces: `renderEmail(fit, {subject, preview = '', only, fonts})` — the campaign HTML now starts the body with a hidden preheader carrying `preview`, and its sign chain is `{{ $sign := or .Subscriber.Attribs.sign "" }}` + `{{ if eq $sign "aries" }} … {{ else if eq $sign "<sign>" }} … {{ else }} … {{ end }}`. The manifest is unchanged in shape.

- [ ] **Step 1: Rewrite the Mailchimp-specific tests**

In `tests/newsletter-build.test.cjs`, add after the `campaign` helper (line 23):

```js
const CHAIN = /\{\{ (?:if eq \$sign "[a-z]+"|else if eq \$sign "[a-z]+"|else|end) \}\}/g;
```

Replace the test at lines 39–50 with:

```js
test('the campaign carries every sign inside one if / else if chain, in zodiac order', () => {
  const html = campaign(makeWeek());
  assert.ok(html.includes('{{ $sign := or .Subscriber.Attribs.sign "" }}'), 'a reader with no sign attribute compares as ""');
  assert.deepEqual(html.match(CHAIN), ['{{ if eq $sign "aries" }}', ...KEYS.slice(1).map(k => `{{ else if eq $sign "${k}" }}`), '{{ else }}', '{{ end }}']);
  const branches = html.split(CHAIN).slice(1, 14);   // 12 signs + the else branch
  KEYS.forEach((key, i) => {
    assert.ok(branches[i].includes(`the ${key} week, plainly said`), `${key} text is in its own branch`);
    assert.ok(branches[i].includes(`${B.ASSETS}/signs/${key}.jpg`) && branches[i].includes(`${B.ASSETS}/glyphs/${key}.png`));
    for (const other of KEYS) if (other !== key) assert.equal(branches[i].includes(`the ${other} week`), false, `${other} leaked into ${key}`);
  });
  assert.match(branches[12], /Tell us your sign/);
});
```

Replace the three tests at lines 67–92 with:

```js
test('model text cannot speak listmonk\'s template language', () => {
  const html = campaign(makeWeek(w => {
    w.signs.aries = 'A calm week. {{ end }} and {{ UnsubscribeURL }} and {{ else }} appear in this sentence.\n\nNext {{ if eq $sign "leo" }} paragraph.';
    w.overview = 'The week builds slowly {{ MessageURL }} and then opens. The Sun is in Virgo.\n\nOn Saturday the Full moon arrives.';
  }));
  assert.equal(html.match(CHAIN).length, 14, 'the chain is exactly if, eleven else if, else and end');
  assert.equal((html.match(/\{\{/g) || []).length, 14 + 1 + 3, 'the chain, the $sign line and three footer links open a tag; nothing else');
  assert.equal((html.match(/\{\{ UnsubscribeURL \}\}/g) || []).length, 1, 'only the footer\'s own unsubscribe tag');
  assert.ok(html.includes('&#123;&#123; end &#125;&#125;'), 'the text still shows, with the braces as entities');
});

test('the subject and preview that leave as plain text carry no template braces', () => {
  const fit = B.fitBlocks(makeWeek(w => { w.subjects[0] = 'Your week, {{ .Subscriber.Name }}, ahead'; w.preview = 'A waxing Moon {{ MessageURL }} for most of the week.'; }));
  const {subject, preview} = B.headline(fit);
  assert.equal(/[{}]/.test(subject), false);
  assert.equal(/[{}]/.test(preview), false);
  assert.equal(subject, 'Your week,  .Subscriber.Name , ahead');
});

test('the footer holds what listmonk, the law and our own specs require, and no Mailchimp tag', () => {
  const html = campaign(makeWeek());
  for (const tag of ['href="{{ UnsubscribeURL }}"', 'href="{{ .Subscriber.Attribs.siteunsub }}"', 'href="{{ MessageURL }}"']) assert.ok(html.includes(tag), tag);
  assert.equal(html.includes('*|'), false, 'no Mailchimp merge tag survives');
  assert.match(html, /One language model writes each issue[^<]*a second one proofreads it/);
  assert.ok(html.includes('https://ishtarinsights.com/newsletter-privacy.html'));
});

test('the preview text travels as a hidden preheader, since listmonk has no preview field', () => {
  const html = B.renderEmail(B.fitBlocks(makeWeek()), {subject: 's', preview: 'A waxing Moon & a Full one.'});
  assert.match(html, /<body[^>]*>\n<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">A waxing Moon &amp; a Full one\.<\/div>/);
  assert.equal(B.renderEmail(B.fitBlocks(makeWeek()), {subject: 's'}).includes('display:none'), false, 'no empty preheader');
});
```

In the missing-sign test (line 120) replace the split line with:

```js
  const scorpio = html.split('{{ else if eq $sign "scorpio" }}')[1].split('{{ else if eq $sign "sagittarius" }}')[0];
```

In the `main writes the campaign…` test replace line 150 with:

```js
  assert.equal(preview.includes('{{'), false, 'the preview shows one reader at a time, with no template tags');
  assert.ok(html.includes(`mso-hide:all;">${manifest.preview}</div>`), 'the campaign carries the manifest preview as its preheader');
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test tests/newsletter-build.test.cjs`
Expected: the five rewritten/new tests fail (the builder still writes `*|IF:SIGN=…|*`).

- [ ] **Step 3: Change the builder**

`tools/build_newsletter.cjs`:

Header comment, lines 2–10: replace "Mailchimp's merge tags" with "listmonk's template tags", "Mailchimp shows each reader the section for their SIGN" with "listmonk shows each reader the section for their sign attribute", and "Nothing here talks to Mailchimp" with "Nothing here talks to listmonk".

Line 42:

```js
// listmonk reads {{ }} as template code in the body and the subject, so model text never carries a brace.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
```

`footer()`, lines 135–137 become one paragraph (the address and referral-badge paragraphs go):

```js
  <p style="margin:0;">${link('{{ UnsubscribeURL }}', 'Unsubscribe')} &nbsp;&middot;&nbsp; ${link('{{ .Subscriber.Attribs.siteunsub }}', 'Unsubscribe on the site')} &nbsp;&middot;&nbsp; ${link('{{ MessageURL }}', 'View in your browser')} &nbsp;&middot;&nbsp; ${link(`${SITE}/newsletter-privacy.html`, 'Privacy')}</p>
```

`renderEmail`, lines 141–151:

```js
// `only`: render one reader's email with no conditional tags (the preview). Otherwise the campaign:
// every sign's section inside one Go-template if / else if chain, the no-sign invitation in else.
// `or … ""` makes a subscriber with no sign attribute (a test recipient) compare as the empty string.
function renderEmail(fit, {subject, preview = '', only, fonts = false} = {}) {
  const section = sign => fit.signs[sign.key] ? signSection(sign, fit.signs[sign.key]) : missingSignSection(sign);
  const middle = only === 'none' ? noSignSection()
    : only ? section(SIGNS.find(s => s.key === only))
    : '{{ $sign := or .Subscriber.Attribs.sign "" }}\n'
      + SIGNS.map((sign, i) => `{{ ${i ? 'else if' : 'if'} eq $sign "${sign.key}" }}\n${section(sign)}`).join('\n')
      + `\n{{ else }}\n${noSignSection()}\n{{ end }}`;
  // listmonk has no preview-text field; mail apps show the first text in the body instead.
  const preheader = preview ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preview)}</div>\n` : '';
  return lockColours(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(subject)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
${fonts ? '<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">' : ''}
</head><body style="margin:0;padding:0;background:#160c20;">
${preheader}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#160c20" style="background:#160c20;"><tr><td align="center" bgcolor="#160c20" style="background:#160c20;padding:24px 10px;">
```
(the rest of the function is unchanged).

`headline`, line 172: `const plain = s => s.replace(/[{}]/g, '');`

`previewPage`, lines 182–184:

```js
  const local = html => html.split(ASSETS).join(localAssets).replace(/href="\{\{[^"]*\}\}"/g, 'href="#"');
```

`main`, line 252: `const html = renderEmail(fit, {subject, preview});`

- [ ] **Step 4: Run the builder tests**

Run: `node --test tests/newsletter-build.test.cjs`
Expected: all pass, including the unchanged dark-mode, size and mail-client tests.

- [ ] **Step 5: RED evidence** — remove the two brace `.replace` calls from `esc`, confirm `model text cannot speak listmonk's template language` fails, restore.

- [ ] **Step 6: Build a real week and look at it**

Run: `node tools/build_newsletter.cjs --week 2026-09-28` (the proofread file from this morning is in `output/weekly-prose/`). Expected: exit 0, about 43 KB. Open `output/newsletter/2026-09-28/preview.html` in the browser pane (it is a local file) and check one sign and the no-sign view render as before, with the footer showing three links and no address line. Then `grep -c '{{' output/newsletter/2026-09-28/issue.html` → `18`.

- [ ] **Step 7: Commit**

```bash
git add tools/build_newsletter.cjs tests/newsletter-build.test.cjs
git commit -m "feat(newsletter): the issue speaks listmonk's template language"
```

---

### Task 10: Site copy — consent v3 and the privacy pages

**Files:**
- Modify: `newsletter.js:70`
- Modify: `charts/index.html:71,113`, `eastern/index.html:62,94`, `numerology/index.html:62,93`
- Modify: `newsletter-privacy.html` (one line)
- Modify: `privacy.html:36,42`
- Modify: `tests/newsletter-ui.test.cjs:66`, `tests/pages.test.cjs:206-211`

**Interfaces:**
- Consumes: the consent version and text in Global Constraints (they must equal `settings.py`, Task 8).
- Produces: pages that send `consentVersion: '2026-09-27-v3'` and load `/newsletter.js?v=5`.

- [ ] **Step 1: Update the tests first**

`tests/newsletter-ui.test.cjs:66`: `'2026-09-18-v2'` → `'2026-09-27-v3'`.

`tests/pages.test.cjs`: in the test `newsletter privacy names the delivery provider and what is shared`, replace `assert.match(html, /Mailchimp/);` with:

```js
  assert.match(html, /Amazon Simple Email Service/);
  assert.match(html, /listmonk/);
  assert.match(html, /do not track whether you open/i);
```

and append a new test at the end of the file:

```js
test('no page still says the newsletter goes through Mailchimp', () => {
  const root = path.join(__dirname, '..');
  for (const file of ['newsletter-privacy.html', 'privacy.html', 'charts/index.html', 'eastern/index.html', 'numerology/index.html', 'newsletter.js']) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(text, /Mailchimp|2026-09-18-v2/, file);
  }
  for (const file of ['charts/index.html', 'eastern/index.html', 'numerology/index.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(html.includes('Emails are sent from our own server through Amazon Web Services.</span>'), file);
    assert.ok(html.includes('/newsletter.js?v=5'), file);
  }
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test tests/pages.test.cjs tests/newsletter-ui.test.cjs`
Expected: the three changed/new assertions fail.

- [ ] **Step 3: Change the copy**

`newsletter.js:70`: `consentVersion: '2026-09-18-v2'` → `consentVersion: '2026-09-27-v3'`.

In each of `charts/index.html`, `eastern/index.html`, `numerology/index.html`: in the consent `<span>` replace `Emails are sent through Mailchimp.` with `Emails are sent from our own server through Amazon Web Services.`, and `/newsletter.js?v=4` → `/newsletter.js?v=5`. Then `git grep -n "newsletter.js?v=4"` must print nothing; if another page loads it, bump that page too.

`newsletter-privacy.html` (a single line; use exact-string edits):
- `Updated September 18, 2026` → `Updated September 27, 2026`
- Replace the paragraph starting `<p>We use your permission as the basis for newsletter signup.` through `Please use your own email address.</p>` with:
  `<p>We use your permission as the basis for newsletter signup. The mailing list runs on our own server, using the open-source list manager listmonk, and Amazon Simple Email Service (part of Amazon Web Services, in the United States) relays each email to your inbox. Our list holds three things about you: your email address, the sign you chose if you chose one, and your personal unsubscribe link. Amazon handles each email as it is sent, including your address. Birth details are never part of the list. Please use your own email address.</p>`
- `<p>After you sign up, Mailchimp sends one confirmation email.` → `<p>After you sign up, we send one confirmation email.`
- `removes you from both our database and Mailchimp within ten minutes.` → `removes you from both our database and the mailing list within ten minutes.`
- Replace `<p>Mailchimp's privacy policy is at <a href="https://www.intuit.com/privacy/statement/">https://www.intuit.com/privacy/statement/</a>.</p>` with `<p>Amazon's privacy notice is at <a href="https://aws.amazon.com/privacy/">https://aws.amazon.com/privacy/</a>.</p>`
- Replace `The subscriber database is stored outside the public website directory and is accessible only to the signup service and authorized server administrators. Mailchimp receives only those three details from us, acting on our behalf for delivery. Mailchimp also records its own delivery data, such as whether an email was opened, under its privacy policy. We do not sell this list.` with `The subscriber database and the mailing list are stored outside the public website directory and are accessible only to the signup service, the list manager and authorized server administrators. We do not track whether you open an email or which links you click. Amazon keeps its own delivery records, such as whether a message was delivered, bounced or reported as spam, under its privacy notice. We do not sell this list.`

`privacy.html:36`: replace `Mailchimp delivers the emails and receives your address, that sign and your unsubscribe link. Birth details are never sent to Mailchimp. Unsubscribing deletes your signup from our database and removes you from Mailchimp within ten minutes.` with `Our own server keeps the mailing list, and Amazon Simple Email Service relays each email, so Amazon handles your address when an issue is sent. Birth details are never part of the list. Unsubscribing deletes your signup from our database and removes you from the mailing list within ten minutes.`

`privacy.html:42`: replace the Mailchimp `<li>` with `<li><strong>Amazon Web Services</strong> (Simple Email Service) relays the newsletter. It handles your email address as each email is sent.</li>`. If `privacy.html` carries an "Updated" date, set it to September 27, 2026.

- [ ] **Step 4: Run the page tests and the full JS suite**

Run: `node --test tests/pages.test.cjs tests/newsletter-ui.test.cjs tests/newsletter-build.test.cjs`
Expected: all pass. Then run the whole suite, `node --test tests/ 2>&1 | tail -8`, on this branch and on `main` (`git switch main`, run, `git switch newsletter-listmonk`) and compare the fail counts: this branch may not add a failure; one already failing on `main` is reported, not fixed here.

- [ ] **Step 5: Look at one page**

Start the static preview from `.claude/launch.json`, open `/charts/` at 390px wide, and confirm the consent line reads the new sentence and wraps inside the form without overflow; the console shows no errors.

- [ ] **Step 6: Commit**

```bash
git add newsletter.js charts/index.html eastern/index.html numerology/index.html newsletter-privacy.html privacy.html tests/pages.test.cjs tests/newsletter-ui.test.cjs
git commit -m "feat(site): newsletter consent v3 and privacy copy name our server and Amazon SES"
```

---

### Task 11: Deploy tooling, nginx site, docs

**Files:**
- Modify: `server/deploy-app.sh:95-99`
- Modify: `server/ishtar-app.env.example:40-44`
- Create: `server/listmonk/nginx-news.conf`
- Modify: `docs/NEWSLETTER.md` (top section rewritten; the Mailchimp sections kept as history)

**Interfaces:**
- Produces: `/etc/cron.d/ishtar-app-listmonk` on the next deploy; `/etc/cron.d/ishtar-app-mailchimp` removed; `nginx-news.conf` for Task 12.

- [ ] **Step 1: `server/deploy-app.sh` — replace lines 95–99 with**

```sh
# listmonk reconcile every 10 minutes (docs/NEWSLETTER.md). Written whole on every run like the backup
# entry above, so re-deploying converges. The command is a no-op until LISTMONK_LIST_ID is in
# /etc/ishtar-app.env, which is set only after SES grants production access. The Mailchimp entry it
# replaces is removed: its command no longer exists.
rm -f /etc/cron.d/ishtar-app-mailchimp
printf '*/10 * * * * root cd %s/app && set -a && . /etc/ishtar-app.env && set +a && DJANGO_SETTINGS_MODULE=ishtar.settings DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3 sudo -u ishtar-app -E %s/venv/bin/python manage.py sync_listmonk >/dev/null 2>>/var/log/ishtar-listmonk.err\n' "$APP" "$APP" > /etc/cron.d/ishtar-app-listmonk
chmod 644 /etc/cron.d/ishtar-app-listmonk
```

- [ ] **Step 2: `server/ishtar-app.env.example` — replace the Mailchimp block (lines 40–44) with**

```sh
# Newsletter on listmonk + Amazon SES (docs/NEWSLETTER.md). Glenn sets each one with
#   ssh -t vps sudo sh /root/set-newsletter-env.sh <NAME>
# LISTMONK_LIST_ID is the go-live switch: leave it unset until SES production access is granted.
#   LISTMONK_API_USER=ishtar
#   LISTMONK_API_TOKEN=<token from listmonk Admin > Users>
#   LISTMONK_LIST_ID=<printed by manage.py setup_listmonk>
#   SES_SMTP_USER=<from the SES SMTP credentials file>
#   SES_SMTP_PASSWORD=<from the SES SMTP credentials file>
```

- [ ] **Step 3: Write `server/listmonk/nginx-news.conf`**

```nginx
# news.ishtarinsights.com: only the listmonk pages a reader or Amazon SNS needs (docs/NEWSLETTER.md).
# The admin UI and the API stay on 127.0.0.1:9000; reach them with ssh -L 9000:127.0.0.1:9000 vps.
# certbot --nginx adds the 443 server and the redirect to this file.
server {
    listen 80;
    listen [::]:80;
    server_name news.ishtarinsights.com;

    location ~ ^/(subscription|campaign|link|public)/ {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location = /webhooks/service/ses {
        client_max_body_size 256k;
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        return 404;
    }
}
```

- [ ] **Step 4: `docs/NEWSLETTER.md`** — insert a new top section above `## Mailchimp audience sync (2026-09-18)`, and rename that heading to `## Mailchimp audience sync (2026-09-18, retired 2026-09-27)`:

```markdown
## Delivery: listmonk + Amazon SES (2026-09-27)

Spec: `docs/superpowers/specs/2026-09-27-newsletter-listmonk-ses-design.md`. Plan:
`docs/superpowers/plans/2026-09-27-newsletter-listmonk-ses.md`. Glenn's AWS steps: `docs/newsletter-aws-setup.md`.

- **Why.** Mailchimp's abuse review disabled the 2026-09-28 issue: its Acceptable Use Policy prohibits astrology
  predictions. Do not send the per-sign reading through Mailchimp again.
- **listmonk** runs from `/opt/listmonk` (Docker Compose, `listmonk/listmonk:v6.2.0` + `postgres:17-alpine`), on
  `127.0.0.1:9000` only. Secrets are in `/opt/listmonk/.env` (600): the DB password and the admin user `glenn`'s
  password. Nightly dump to `/var/backups/listmonk` at 03:41, 14 kept. Upgrade: change the tag in
  `server/listmonk/docker-compose.yml`, re-run `install-listmonk.sh` (it runs `--upgrade`).
- **Admin UI:** `ssh -L 9000:127.0.0.1:9000 vps`, then http://127.0.0.1:9000/admin.
- **Public paths** on `https://news.ishtarinsights.com` (`server/listmonk/nginx-news.conf`): `/subscription/`,
  `/campaign/`, `/link/`, `/public/`, `/webhooks/service/ses`. Everything else is 404.
- **Settings live in code:** `manage.py setup_listmonk` writes the root URL, sender, SES SMTP (us-east-1, 587
  STARTTLS), bounce handling with the SES webhook, no per-subscriber tracking, the List-Unsubscribe header, no
  public subscription page, and `max_send_errors = 1`. It creates the private double opt-in list
  `Ishtar Insights` and the template `Ishtar issue (content only)` if missing. Re-run it after any change there.
- **Django** (`newsletter/listmonk.py`): same surface as the old Mailchimp module. A subscriber carries the
  attributes `sign` and `siteunsub`, and the name `Reader`. The reconcile `sync_listmonk` runs from
  `/etc/cron.d/ishtar-app-listmonk` every 10 minutes (errors to `/var/log/ishtar-listmonk.err`); unsubscribes,
  hard bounces and complaints in listmonk delete the row here.
- **The switch** is `LISTMONK_LIST_ID` in `/etc/ishtar-app.env`: without it every call is a no-op. Set values with
  `ssh -t vps sudo sh /root/set-newsletter-env.sh <NAME>`, then `systemctl restart ishtar-app`.
- **Sending.** `ishtar-draft-campaign <monday> [--test addr] [--replace] [--send]` as before. `--test` must name a
  subscriber, and listmonk fills attributes in tests, so a test shows that subscriber's sign. `--send` returns
  0 only after listmonk reports the campaign `finished` with every message handed to SES; `paused` (one SMTP
  failure), `cancelled`, a shortfall or 15 minutes still running are non-zero. Bounces arrive later and are not
  in the exit code; they show in the listmonk admin under Bounces.
- **Template language.** The issue body is a Go template: `{{ $sign := or .Subscriber.Attribs.sign "" }}` then
  `{{ if eq $sign "aries" }} … {{ else if … }} … {{ else }}` invitation `{{ end }}`. Model text has `{` and `}`
  escaped to `&#123;` `&#125;`, and the subject has them removed, because listmonk templates the subject too.
- **No postal address** in the footer (Glenn, 2026-09-27). If one is ever wanted, a PO box is a one-line change
  in `footer()` in `tools/build_newsletter.cjs`.
```

Also update the `Sending is suspended since 2026-09-27` paragraph written this morning to end with: `Delivery moved to listmonk + Amazon SES; see the section above.`

- [ ] **Step 5: Commit**

```bash
git add server/deploy-app.sh server/ishtar-app.env.example server/listmonk/nginx-news.conf docs/NEWSLETTER.md
git commit -m "chore(newsletter): deploy tooling and docs for listmonk + SES"
```

---

### Task 12: Deploy (needs: Task 3 all `ok`, Glenn's `news` A record, SES SMTP credentials in the env file)

**Files:** none new; `docs/deployment.md` gets the release record.

- [ ] **Step 1: Pre-flight**

```bash
cd /v/tarot_game && git status --short && git log --oneline main..newsletter-listmonk
cd server/ishtar && .venv/Scripts/python.exe manage.py test newsletter accounts && cd ../.. && node --test tests/newsletter-build.test.cjs tests/pages.test.cjs tests/newsletter-ui.test.cjs
nslookup news.ishtarinsights.com
ssh vps 'bash -s' <<'EOF'
for k in LISTMONK_API_USER LISTMONK_API_TOKEN SES_SMTP_USER SES_SMTP_PASSWORD LISTMONK_LIST_ID; do
  grep -q "^$k=." /etc/ishtar-app.env && echo "$k set" || echo "$k NOT set"
done
EOF
```
Expected: clean tree; tests pass; `news.ishtarinsights.com` → `129.121.126.72`; the first four `set`, **`LISTMONK_LIST_ID NOT set`**. If `LISTMONK_LIST_ID` is set, stop: the deploy would go live before SES production access.

- [ ] **Step 2: Merge to main and deploy the backend**

```bash
git switch main && git merge --no-ff newsletter-listmonk -m "Merge branch 'newsletter-listmonk': newsletter on listmonk + Amazon SES"
```
Then deploy exactly as the most recent backend release in `docs/deployment.md` did ("The documented `git archive` path and `sh /tmp/deploy-app.sh`", section "Accounts service"): `server/ishtar` as `/tmp/ishtar-app-src`, plus `server/deploy-app.sh`, `server/ishtar-app.service`, `server/nginx-ishtar-app.conf` and `server/backup-ishtar-app.sh` in `/tmp`, then `sh /tmp/deploy-app.sh`. Expected: the health check prints `{"ok": true}`.

Verify:

```bash
ssh vps 'bash -s' <<'EOF'
ls /etc/cron.d/ | grep ishtar-app
cd /opt/ishtar-app/app && set -a && . /etc/ishtar-app.env && set +a && export DJANGO_SETTINGS_MODULE=ishtar.settings DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3
sudo -u ishtar-app -E /opt/ishtar-app/venv/bin/python manage.py sync_listmonk
EOF
```
Expected: `ishtar-app-backup` and `ishtar-app-listmonk`, no `ishtar-app-mailchimp`; `listmonk not configured; nothing to do.`

- [ ] **Step 3: Static release**

Release the six changed site files (`newsletter.js`, `charts/index.html`, `eastern/index.html`, `numerology/index.html`, `newsletter-privacy.html`, `privacy.html`) with the procedure of the most recent static release in `docs/deployment.md`: a `cp -al` hardlink copy of the current release named `20260927-newsletter-listmonk-<short sha>`, a delta tar built from `git show` blobs (not `git archive`, which CRLF-converts under autocrlf), each target `rm -f`'d before extraction (never `tar --unlink-first` onto existing directories), a self-verifying `/tmp` script whose gates are: `current` is the expected previous release, the sha256 of all six files equals the commit's blobs, and the previous release's `newsletter.js` still carries `2026-09-18-v2`. Before running it, check each gate passes on the correct path, and `rm -rf` any half-made release directory before a re-run. Do the static release within a minute of Step 2: until it lands, the live pages send consent v2 and signups get a 400.

Verify: `curl -s https://ishtarinsights.com/newsletter.js?v=5 | grep -c 2026-09-27-v3` → `1`; `curl -s https://ishtarinsights.com/newsletter-privacy.html | grep -c Mailchimp` → `0`; `/`, `/charts/`, `/newsletter-privacy.html`, `/privacy.html` return 200.

- [ ] **Step 4: nginx site and certificate for `news`**

```bash
scp server/listmonk/nginx-news.conf vps:/tmp/nginx-news.conf
ssh vps 'bash -s' <<'EOF'
set -eu
install -m 644 /tmp/nginx-news.conf /etc/nginx/sites-available/news.ishtarinsights.com
ln -sfn /etc/nginx/sites-available/news.ishtarinsights.com /etc/nginx/sites-enabled/news.ishtarinsights.com
nginx -t && systemctl reload nginx
certbot --nginx -d news.ishtarinsights.com --non-interactive --redirect
nginx -t && systemctl reload nginx
EOF
```
Expected: certbot reports the certificate deployed. Re-running the `install` line later would drop certbot's 443 block, so after this step edit `/etc/nginx/sites-available/news.ishtarinsights.com` in place only.

- [ ] **Step 5: `setup_listmonk`, then the outside checks**

```bash
ssh vps 'bash -s' <<'EOF'
cd /opt/ishtar-app/app && set -a && . /etc/ishtar-app.env && set +a && export DJANGO_SETTINGS_MODULE=ishtar.settings DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3
sudo -u ishtar-app -E /opt/ishtar-app/venv/bin/python manage.py setup_listmonk
EOF
```
Expected: `list: Ishtar Insights id=N`, `template: … id=M`, `settings: written`. Note N for Task 13.

From this machine:

```bash
for p in /admin /admin/login /api/lists /api/health / /subscription/form /webhooks/service/ses; do printf '%-26s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://news.ishtarinsights.com$p)"; done
curl -s https://news.ishtarinsights.com/subscription/form | grep -ci 'subscribe' || true
```
Expected: `/admin`, `/admin/login`, `/api/lists`, `/api/health` and `/` are `404`; `/subscription/form` shows no signup form (listmonk answers it with 404 or a "disabled" page because the public subscription page is off; either is correct, a working form is not); `/webhooks/service/ses` is **not** 404 (listmonk refuses a GET with 405, which proves nginx passes it through).

- [ ] **Step 6: Glenn wires SES feedback**

Tell Glenn step 6 of `docs/newsletter-aws-setup.md` is ready. Wait until he reports the SNS subscription **Confirmed**. If it stays Pending, check `docker compose -f /opt/listmonk/docker-compose.yml logs app | grep -i sns`.

- [ ] **Step 7: Record the release**

Add a section at the top of `docs/deployment.md` (`## 2026-09-27 Newsletter on listmonk + Amazon SES`) with: the merge commit, the backend deploy, the release name and its rollback line, the cron change, the nginx site and certificate, the `setup_listmonk` output (ids only), the outside check results, and "Not live: `LISTMONK_LIST_ID` unset until SES production access". Rollback note: rolling back the static release alone breaks signups (the old page sends consent v2), so roll the backend back with it. Commit on `main`:

```bash
git add docs/deployment.md && git commit -m "docs: record listmonk newsletter deploy"
```

---

### Task 13: Go live (needs: AWS has granted SES production access)

- [ ] **Step 1: Confirm production access, then flip the switch (Glenn)**

Ask Glenn to confirm the SES account dashboard no longer says "sandbox". Then Glenn runs
`ssh -t vps sudo sh /root/set-newsletter-env.sh LISTMONK_LIST_ID` with the id from Task 12 Step 5 (not a secret; it is Glenn's step because only `set-newsletter-env.sh` writes that file). Then:

```bash
ssh vps 'systemctl restart ishtar-app && sleep 2 && systemctl is-active ishtar-app'
```

- [ ] **Step 2: First reconcile — the existing subscribers get their opt-in email**

```bash
ssh vps 'bash -s' <<'EOF'
cd /opt/ishtar-app/app && set -a && . /etc/ishtar-app.env && set +a && export DJANGO_SETTINGS_MODULE=ishtar.settings DJANGO_DB_PATH=/var/lib/ishtar-app/db.sqlite3
sudo -u ishtar-app -E /opt/ishtar-app/venv/bin/python manage.py sync_listmonk
tail -5 /var/log/ishtar-listmonk.err 2>/dev/null || true
docker compose -f /opt/listmonk/docker-compose.yml logs --since 5m app | grep -iE 'error|smtp' || echo 'no SMTP errors'
EOF
```
Expected: `pushed=2 removed=0 deleted=0 failed=0` (or the current row count) and `no SMTP errors`. Ask Glenn to confirm his opt-in email arrived, looks acceptable (listmonk's stock opt-in page and email; if he wants them branded, that is a follow-up using listmonk's `--static-dir` override), and to click it. The next reconcile prints `pushed=0`.

- [ ] **Step 3: The per-sign check (twelve test emails to Glenn's inbox)**

Build and push the current week (`node tools/build_newsletter.cjs --push`; it prints the Monday). Save this as `sign_checks.py` in the scratchpad:

```python
"""Twelve throwaway subscribers, one per sign, on a private 'Checks' list that is NOT the newsletter list.
  python3 sign_checks.py make   -> creates them (preconfirmed, so no opt-in email)
  python3 sign_checks.py clean  -> deletes them and the list"""
import json
import os
import sys
import urllib.parse
import urllib.request

SIGNS = ('aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
         'sagittarius', 'capricorn', 'aquarius', 'pisces')
AUTH = f"token {os.environ['LISTMONK_API_USER']}:{os.environ['LISTMONK_API_TOKEN']}"


def call(method, path, body=None, params=None):
    url = 'http://127.0.0.1:9000' + path + ('?' + urllib.parse.urlencode(params) if params else '')
    data = json.dumps(body).encode() if body is not None else None
    headers = {'Authorization': AUTH, **({'Content-Type': 'application/json'} if data else {})}
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers, method=method), timeout=10) as r:
        return json.loads(r.read())['data']


checks = next((l for l in call('GET', '/api/lists', params={'per_page': 100})['results'] if l['name'] == 'Checks'), None)
if sys.argv[1] == 'make':
    checks = checks or call('POST', '/api/lists', {'name': 'Checks', 'type': 'private', 'optin': 'single'})
    for sign in SIGNS:
        call('POST', '/api/subscribers', {'email': f'sign-check-{sign}@ishtarinsights.com', 'name': 'Reader',
                                          'status': 'enabled', 'lists': [checks['id']], 'preconfirm_subscriptions': True,
                                          'attribs': {'sign': sign, 'siteunsub': 'https://ishtarinsights.com/unsubscribe.html'}})
    print('made 12 on list', checks['id'])
else:
    found = call('GET', '/api/subscribers', params={'query': "subscribers.email LIKE 'sign-check-%@ishtarinsights.com'", 'per_page': 100})
    for member in found['results']:
        call('DELETE', f"/api/subscribers/{member['id']}")
    if checks:
        call('DELETE', f"/api/lists/{checks['id']}")
    print('deleted', len(found['results']))
```

Then (Bash tool; replace `2026-10-05` with the Monday the build printed):

```bash
scp "C:/Users/glenn/AppData/Local/Temp/claude/V--tarot-game/8929d21f-68fc-4b36-9103-f17485874ae3/scratchpad/sign_checks.py" vps:/tmp/sign_checks.py
ssh vps 'bash -s' <<'EOF'
set -a; . /etc/ishtar-app.env; set +a
python3 /tmp/sign_checks.py make
for s in aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces; do
  ishtar-draft-campaign 2026-10-05 --replace --test sign-check-$s@ishtarinsights.com | grep -E 'test sent|rejected'
done
EOF
```
`--replace` on a week with no draft yet simply creates it. Twelve SES messages, about $0.0012. ImprovMX forwards all twelve to Glenn. Ask Glenn to confirm each shows its own sign's banner and reading, the footer links work (Unsubscribe opens listmonk's page on `news.ishtarinsights.com`; "View in your browser" opens the issue), and the inbox preview line shows the preheader. Then clean up:

```bash
ssh vps 'bash -s' <<'EOF'
set -a; . /etc/ishtar-app.env; set +a
python3 /tmp/sign_checks.py clean && rm -f /tmp/sign_checks.py
EOF
```
Expected: `deleted 12`.

- [ ] **Step 4: First real send, by hand**

```bash
ssh vps "ishtar-draft-campaign <monday> --replace --test <Glenn's own subscribed address>"
```
Glenn looks at it (his sign's section). On his go-ahead:

```bash
ssh vps "ishtar-draft-campaign <monday> --send"
```
Expected: `SENT: Ishtar Insights <monday> to N subscribed`, exit 0.

- [ ] **Step 5: Restore the unattended send**

In `C:\Users\glenn\Scripts\weekly-prose.ps1`, replace the three-line block written on 2026-09-27 (the comment and the `cmd /c "ssh vps ishtar-draft-campaign $week 2>&1"` call and the `draft rc=` line) with:

```powershell
            cmd /c "ssh vps ishtar-draft-campaign $week --send 2>&1" | Out-File $log -Append -Encoding utf8
            $rc = $LASTEXITCODE
            "send rc=$rc week=$week" | Out-File $log -Append -Encoding utf8
```
and in the script's header comment note that `rc=0` now means listmonk reported every message handed to SES.

- [ ] **Step 6: Tidy the VPS env file, record, remember**

Ask Glenn whether to delete the three `MAILCHIMP_*` lines from `/etc/ishtar-app.env` (they are read by nothing now) and whether to close the Mailchimp account. Add a `## 2026-MM-DD Newsletter live on listmonk` section to `docs/deployment.md` with the reconcile result, the check-send and first-send outcome, commit on `main`, and log the go-live to Honcho (`wiskey-journal`, peer `Claude`, `source: claude`).
