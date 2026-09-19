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

## Weekly reading (piece 2, 2026-09-18)

Spec: `docs/superpowers/specs/2026-09-18-newsletter-weekly-reading-design.md`. Measurements:
`docs/superpowers/plans/2026-09-18-newsletter-weekly-reading-probe.md`. Nothing here sends email or calls
Mailchimp; piece 3 reads the file this produces.

- **Facts.** `weekSheet(monday)` in `daily-horoscope-engine.js`: Monday 00:00 UTC to the next Monday. Headline
  events only (lunar quarters, planets changing sign, stations, eclipses) plus an always-present backdrop: the
  Moon waxing or waning, and where the Sun, Mercury, Venus, Mars and a Jupiter or Saturn ruler are as the week
  opens. A placement whose planet changes sign that week carries `until: <weekday>`.
- **Writer.** `node tools/write_weekly_prose.cjs [--week YYYY-MM-DD] [--force]`, only while llama.cpp serves
  `muse-glimmer-30b-local`. Twelve sign readings (two paragraphs, 150 to 200 words), one overview, three
  subject lines and a preview. Three attempts a block; a block that fails is left out; a re-run fills only what
  is missing; `--force` rewrites everything and drops the proof. Exit 0 = ten or more signs and the overview,
  1 = not a Monday, 2 = wrong model loaded, 3 = a weak week.
- **Proofreader.** `node tools/proof_weekly_prose.cjs [--week YYYY-MM-DD]`, only while llama.cpp serves
  `qwen3.8-27b-local`. Judges each block against the facts it was written from. A fail moves the text to
  `rejected` and out of the issue. A pass may come with a correction, which is kept only if it passes the
  block's validator, leaves every fact word (weekdays, planets, signs, sectors, phase and direction words,
  numbers) in place and in order, and changes at most 8% of the words; the writer's text is then kept under
  `originals`. Same exit codes, counting blocks that hold a current pass.
- **Both default `--week` to the next Monday on or after today (UTC)**, so on a Sunday they agree.
- **File.** `output/weekly-prose/<monday>.json` (git-ignored):
  `{week, generated, model, overview, signs: {aries: ...}, subjects: [3], preview, proof: {model, checked,
  blocks: {<key>: {verdict, reason, edited, sha}}}, originals, rejected}`. Keys are the lowercase signs,
  `overview` and `subjects`. **A block is fit to send only when its verdict is `pass` and its `sha` equals the
  sha256 of the block's current text** (for `subjects`: of `JSON.stringify({subjects, preview})`). Piece 3 must
  treat anything else as missing: a missing sign gets the overview only, a missing overview means no issue is
  drafted, missing subjects mean a plain dated subject.
- **Schedule.** Task `Ishtar-Weekly-Prose`, Sundays 04:30 local, after the nightly daily run. `wscript.exe`
  runs `C:\Users\glenn\Scripts\weekly-prose-hidden.vbs`, which runs `weekly-prose.ps1` hidden: check `N:` and
  `V:`, load Glimmer, write, load Qwen, proofread, and leave Qwen loaded whatever happened. Log:
  `C:\Users\glenn\Scripts\weekly-prose.log`. The task's result is the proofreader's exit code.
- **Repairing a weak week by hand.** Load Glimmer
  (`& "$env:LOCALAPPDATA\hermes\llama-server\start.ps1" -Quant glimmer -Force -WaitForReady`), run the writer
  (it fills only the gaps, including blocks the proofreader rejected), load Qwen (`-Quant iq3s`), run the
  proofreader (it judges only text it has not judged). Read `rejected` first: the reason names the sentence.
- **Measured 2026-09-18.** Writer: 39 of 42 blocks pass the code checks first time, 42 of 42 written, five to
  eight minutes a week. Proofreader: 6 of 6 seeded errors caught, 12 of 12 readings with a real error caught,
  0 of 49 clean blocks failed, six to eight minutes a week. The code checks exist because the first run passed
  every check while wrong in 24 readings; read the probe file before loosening one.
- **What the reader should be told** (piece 3): one model writes the newsletter and a second proofreads it.

## Building and drafting an issue (piece 3, 2026-09-18)

Spec: `docs/superpowers/specs/2026-09-18-newsletter-issue-and-campaign-design.md`. One campaign goes to the whole
audience; it carries every sign's section inside Mailchimp's `*|IF:SIGN=aries|* … *|ELSEIF:…|* … *|ELSE:|* … *|END:IF|*`
chain, so each reader sees their own, and a reader with no sign sees an invitation to choose one. **Nothing in
this repo can send or schedule a campaign. Glenn sends, in Mailchimp.**

The weekly routine, after the Sunday job has written and proofread `output/weekly-prose/<monday>.json`:

1. `node tools/review_weekly_prose.cjs` lists any correction Qwen offered and the guards refused, as a
   word-level before and after. Decide each: `--accept <key>` or `--reject <key>` (a key is a lowercase sign,
   `overview` or `subjects`). An accepted text must still pass the block's validator (exit 7 if not); Glimmer's
   text is kept under `originals`.
2. `node tools/build_newsletter.cjs [--week YYYY-MM-DD] [--subject 1|2|3] [--allow-missing] [--push]` writes
   `output/newsletter/<monday>/issue.html` (the campaign), `issue.json` (title, subject, preview, size, which
   signs are in, the HTML's sha256) and `preview.html`. Open the preview: it shows every reader's version at
   desktop and phone width, with the fallback fonts Gmail uses or the web fonts Apple Mail uses. Exit codes:
   0 built; 1 no file, not a Monday, or the file is for another week; 4 the overview is not fit to send (no
   issue); 5 a sign is not fit to send (repair the week, or pass `--allow-missing` and that sign's readers get
   a short "no reading this week" panel, never the invitation); 6 the HTML is over 90 KB (Gmail clips at about
   102 KB; a normal issue is about 40 KB). A block is fit only with a current `pass` whose `sha` matches its
   text. `--push` copies the two files to `/var/lib/ishtar-app/newsletter/<monday>/` on the VPS.
3. On the VPS, with the environment loaded as the `sync_mailchimp` cron line does:
   `manage.py draft_campaign <monday> [--test you@example.com] [--replace]`. It checks the pushed HTML against
   the manifest's sha256 before it calls Mailchimp; creates the draft titled `Ishtar Insights <monday>`, or
   updates it with `--replace` (a campaign already sent is never touched); prints every problem in Mailchimp's
   send checklist; prints the audience size against the free plan; with `--test` sends one test. If Mailchimp
   rejects something it prints Mailchimp's own words; if that happens after the draft was created, run again
   with `--replace`.
4. In Mailchimp, preview the draft **with live merge data** as a real subscriber of each sign you care about,
   then send.

What a test send can and cannot show: Mailchimp does not fill merge fields in a test, so **every test shows the
no-sign version**, whoever receives it. A test proves layout, images, dark mode and delivery. The sign branches
are proved by the in-app preview with live merge data, and by the send itself. Each test also costs one of the
month's sends (12 tests per campaign and 24 a day on the free plan).

Before a real send, check in Mailchimp that every member who chose a sign has `SIGN` filled in: a blank `SIGN`
shows the "Tell us your sign" invitation. Members the site synced always have it (the push skips Mailchimp's
merge validation for exactly this reason); a member added by hand in Mailchimp will not.

The free plan is 250 contacts and **500 sends a month**. A weekly issue is about 4.35 sends per subscriber per
month, so the free plan carries this newsletter to about **115 subscribers**; `draft_campaign` warns from 100.

The untrusted-text rule: everything Glimmer writes is escaped for HTML **and** for Mailchimp's template language
(`|` becomes `&#124;` in the email and is removed from the plain-text subject and preview), because a reading
containing `*|END:IF|*` would otherwise close the chain and show every reader every sign.

Images live under `assets/newsletter/` on the site and the email hot-links them: `masthead.jpg`,
`moon-arc.jpg`, `signs/<sign>.jpg` (1200×520, shown at 600×260) and `glyphs/<sign>.png`. They are JPG and PNG
because Outlook on Windows shows neither WebP nor CSS background images. To re-roll a banner:
`node tools/make_sign_art.cjs <sign> --force` (needs `OPENAI_API_KEY`; about one image's cost), then
`node tools/compose_sign_banners.cjs <sign>`, look at it, commit, and make a static release. Each banner carries
its sign's **true constellation**, drawn from `tools/data/zodiac-figures.json` (derived from d3-celestial,
BSD-3-Clause; rebuild with `tools/build_zodiac_figures.cjs` from the two source files kept, untracked, in
`output/imagegen/newsletter/`). Masters stay local; `prompts.json` is tracked.

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
