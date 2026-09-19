# Newsletter issue builder and draft campaign

**Date:** 2026-09-18. **Status:** look and feel approved in chat from live mockups ("B, with per-sign
illustrations", "draw the true constellation in code, keep this look", "yes, write the piece 3 spec"); awaiting
Glenn's review of this file.

## Purpose

Piece 3 of 3. Piece 1 keeps a Mailchimp audience in step with the site's subscribers, each with a `SIGN` and a
`SITEUNSUB` merge field. Piece 2 leaves one proofread JSON file a week on Glenn's PC. This piece turns that file
into an email, puts it in Mailchimp as a **draft** campaign, and lets Glenn send himself a test. It never sends
a campaign: Glenn does that in Mailchimp. The first use is a sample issue to the audience as it stands today,
which holds only Glenn's own addresses.

## Decisions taken with Glenn

| Decision | Source |
|---|---|
| Design B, "Night Sky": dark plum throughout, the celestial hero as masthead, the hero's moon-phase arc as the divider, the reader's sign in the teal-black panel of the `/sky/` page, the reading's first sentence pulled out in gold italic | Glenn, from the mockups, 2026-09-18 |
| A wide illustrated banner for each sign, above that sign's panel | Glenn, 2026-09-18 |
| The banners use the site's image model (`gpt-image-2`) in the realistic painted look of the Aries pilot, made once and reused every week | Glenn, 2026-09-18 |
| Each banner carries its sign's true constellation, drawn in code from real star positions, with stars sized by real brightness | Glenn, 2026-09-18 |
| Campaigns are drafted by script and sent by Glenn; the newsletter is weekly and goes out on Monday morning | Glenn, recorded in the piece 1 and 2 specs |
| Dependencies are open source | Glenn's global instructions |

## Constraints

| Constraint | Source |
|---|---|
| The script never calls Mailchimp's send or schedule endpoints | Glenn's decision that he sends; also Claude's operating rules |
| A block goes into an issue only when `proof.blocks[key].verdict` is `pass` and its `sha` matches the block's current text | Piece 2 spec, "Output contract" |
| Every email links Mailchimp's own `*|UNSUB|*` and the site's `*|SITEUNSUB|*`, and carries the postal address tag | `docs/NEWSLETTER.md`; Mailchimp's terms; CAN-SPAM |
| The footer says that one model writes each issue and a second proofreads it | Piece 2 spec |
| Mailchimp's referral badge `*|REWARDS|*` is in the footer | Mailchimp free plan (it is added anyway; placing it keeps the layout ours) |
| The Mailchimp API key stays where it is, in `/etc/ishtar-app.env` on the VPS, and nowhere else | Claude's judgement: one key, one place, already handled without Claude seeing it |
| The Mailchimp calls reuse `newsletter/mailchimp.py`'s `_request` (stdlib `urllib`); no SDK | Piece 1 decision (the official SDK's licence is not open source) |
| Email HTML: one 600px table, all styles inline, no CSS background images, no WebP or SVG, explicit colours on every cell, under 90 KB | Claude's judgement from the research below |
| Generated masters and the star catalogue stay out of git; prompts, the small derived star file and the finished banners are tracked | Existing repo practice for generated art (`.gitignore`, `docs/DIVINATION.md`) |
| Subscriber addresses never appear in a log, a file in the repo, or a test | `docs/NEWSLETTER.md` |

## What the research established (2026-09-18, Mailchimp's own documentation)

- **One campaign, not thirteen.** Conditional merge tags work in custom HTML on any plan:
  `*|IF:SIGN=aries|* … *|ELSEIF:SIGN=taurus|* … *|ELSE:|* … *|END:IF|*`. One draft, one checklist, one thing for
  Glenn to review. The full twelve-section email built for the mockup is 39.3 KB; Gmail clips at about 102 KB.
- **The free plan is 250 contacts and 500 sends a month.** A weekly issue costs about 4.35 sends per subscriber
  per month, so the free plan carries about **115 subscribers**. The draft command reports the audience size and
  warns from 100.
- **A test send does not render merge data.** Every test shows the `ELSE` branch whoever receives it. So a test
  send proves layout and delivery; the sign branches are proved by Mailchimp's in-app preview with live merge
  data, and by the first real send to the audience, which is ours.
- **Scheduling is a paid feature**, and the script would not use it anyway.
- **Rendering.** Gmail and desktop Outlook ignore web fonts, so every font stack ends in a real fallback
  (Georgia; Helvetica, Arial; Courier New). Outlook on Windows shows neither WebP nor CSS background images.
  Many clients hide images by default, so every image has styled alt text and the email reads complete without
  them. The Gmail and Outlook apps recolour in dark mode; a design that is already dark, with a colour on every
  cell and `color-scheme: dark light` declared, is the least affected.

## Architecture

Four units. The PC holds the text and builds the email; the VPS holds the key and talks to Mailchimp; the site
serves the images.

```
PC:   output/weekly-prose/<monday>.json ──> tools/build_newsletter.cjs ──> output/newsletter/<monday>/{issue.html, issue.json}
                                                                               │  --push (ssh, as the daily writer does)
VPS:  /var/lib/ishtar-app/newsletter/<monday>/ ──> manage.py draft_campaign ──> Mailchimp draft (+ checklist, + optional test)
Site: /assets/newsletter/…  (masthead, moon arc, twelve banners, twelve glyphs)  <── hot-linked by the email
```

### 1. Art and assets (made once)

`tools/make_sign_art.cjs` generates the twelve masters (1536×1024, `gpt-image-2`, medium) from one shared
preamble and twelve subjects, reading `OPENAI_API_KEY` from the environment and never printing it. It skips a
sign whose master exists. `tools/compose_sign_banners.cjs` crops each master to a 1200×520 banner (a 666-row
window of the master, centred, with a per-sign shift where the centred window clipped the subject) and draws
the constellation: stereographic projection about the figure's own centre, north up, east to the left, fitted to
the same box in the upper right of every banner, a 1.6 px gold line, and a disc per star whose radius falls
about a pixel per magnitude (7 px at magnitude 0, 2 px at 5), with a soft halo.

Star data: d3-celestial (`github.com/ofrohn/d3-celestial`, BSD-3-Clause). `tools/data/zodiac-figures.json` holds
only what is used, the twelve figures' vertices with each vertex's magnitude, plus the attribution; it is built
once by `tools/build_zodiac_figures.cjs` from `constellations.lines.json` and `stars.6.json`, which stay in the
git-ignored `output/imagegen/newsletter/` with the masters. Every vertex matches a catalogued star to within
0.01°; the build fails if one does not.

`tools/build_newsletter_assets.ps1` (ImageMagick, like `export_divination_art.ps1`) writes, under
`assets/newsletter/`:

| File | What |
|---|---|
| `masthead.jpg` 1200×520 | the celestial hero with the lotus logo composited in its empty centre: one image, so no background image is needed |
| `moon-arc.jpg` 1200×168 | the moon-phase arc cropped from the foot of the hero |
| `signs/<sign>.jpg` 1200×520 ×12 | the banners, 89 to 129 KB each |
| `glyphs/<sign>.png` 136×136 ×12 | each sign's glyph in gold on the panel colour, because live zodiac glyphs render unreliably in mail clients |

All are shown at half size for sharpness. They ship to the site in an ordinary static delta release, so the
email hot-links `https://ishtarinsights.com/assets/newsletter/…`. Mailchimp does not proxy image URLs, and each
reader fetches one banner.

### 2. `tools/build_newsletter.cjs`

`node tools/build_newsletter.cjs [--week YYYY-MM-DD] [--subject 1|2|3] [--allow-missing] [--push]`.

Reads the week's file and keeps only blocks that are fit to send. Then:

- overview not fit: exit 4, nothing written. There is no issue without it.
- a sign not fit: exit 5 naming the signs, unless `--allow-missing`, in which case that sign's branch is a short
  panel ("No Scorpio reading this week") with the link to today's sky. It never falls through to the no-sign
  invitation, which would tell a reader who chose a sign that they had not.
- subjects not fit: the subject is `Your week ahead: 21 September` and the preview is the overview's first
  sentence, cut at 110 characters.

Writes `output/newsletter/<monday>/issue.html` (the campaign HTML with Mailchimp's tags in place),
`issue.json` (`{week, title, subject, preview, from_name, reply_to, bytes, signs_included, signs_missing,
html_sha256}`) and `preview.html`, a local page that shows the email as each sign and as no sign, at desktop and
phone width, with web fonts on or off: the mockup page, generated from the real builder so what Glenn previews
is what is sent. `--push` copies `issue.html` and `issue.json` to `/var/lib/ishtar-app/newsletter/<monday>/` on the VPS over
`ssh vps`, as the daily writer pushes its files, after checking the date's shape; the directory is 755 and the
files 644, so the `ishtar-app` service account that runs the command can read them and cannot change them.
`from_name` is `Ishtar Insights` and `reply_to` is `newsletter@ishtarinsights.com`, the audience's defaults.

The HTML is pure functions of the issue: `renderEmail(issue, options)`, `signSection(sign, text)`,
`noSignSection()`, `missingSignSection(sign)`, `footer()`. Text is HTML-escaped; the reading's first sentence is
pulled out only when the first paragraph has more than one sentence. The build fails if the HTML exceeds 90 KB.

### 3. Corrections the guard refused (change to piece 2)

The first real issue showed the cost of the fact-word guard: Scorpio read "On Saturday Moon Full moon falls",
Qwen offered the fix, and the guard refused it because tidying it removes a tracked word. The guard stays as it
is. Instead `tools/proof_weekly_prose.cjs` keeps what it refuses, as `suggested[key] = {text, why}`, and
`node tools/review_weekly_prose.cjs [--week …]` shows each suggestion as a word-level before and after and
takes `--accept <key>` or `--reject <key>`. Accepting puts Qwen's text in place, moves Glimmer's to `originals`,
and records `{verdict: 'pass', edited: true, accepted_by: 'owner', sha}`; it still has to pass the block's code
validator. Rejecting deletes the suggestion. The builder prints a line for every suggestion still undecided, so
a refused fix is never silent. A human is the right judge of a change the code cannot clear.

### 4. `manage.py draft_campaign <monday> [--test you@example.com] [--replace]`

In the Django `newsletter` app on the VPS, using `mailchimp._request`.

1. Reads the pushed `issue.json` and `issue.html`, checks the HTML's sha256 against `html_sha256`.
2. Looks for an existing campaign titled `Ishtar Insights <monday>`. A sent one: stop. A draft: update it only
   with `--replace`. None: `POST /campaigns` (`type: regular`, the audience, `subject_line`, `preview_text`,
   `title`, `from_name`, `reply_to`), then `PUT /campaigns/{id}/content` with the HTML.
3. `GET /campaigns/{id}/send-checklist` and prints every warning and error, and whether `is_ready`.
4. Prints the audience's member count, the monthly sends a weekly issue implies, and a warning from 100 members.
5. With `--test`, `POST /campaigns/{id}/actions/test` to that one address, and says plainly that the test shows
   the no-sign version whatever the recipient's sign.
6. Prints the campaign's Mailchimp web id, so Glenn can open it, preview as a real subscriber, and send.

It has no send and no schedule code path. With no API key configured it does nothing, like the rest of the
module.

## The first sample issue (runbook, in `docs/NEWSLETTER.md`)

1. Release the assets to the site; check each URL returns 200.
2. `build_newsletter.cjs --push` for the week; open `preview.html`; decide any pending suggestions.
3. On the VPS, `draft_campaign <monday> --test <Glenn's address>`. Read the checklist.
4. Read the test in Gmail (web and phone app, light and dark), Apple Mail and Outlook. This is the dark-mode
   check the mockups could not do. Fix and repeat with `--replace`.
5. In Mailchimp, preview as each of our own subscribers with live merge data; confirm each sees their sign.
6. Glenn sends. Afterwards: both of us received the right sign's section; unsubscribe works by both links.

## Error handling

- The week's file is missing, or the overview or a sign is not fit: the builder stops with the exit codes above
  and names what is wrong. Nothing is pushed.
- The push fails: the local files stand; re-run with `--push`.
- Mailchimp rejects the content or the campaign: `draft_campaign` prints Mailchimp's message and exits non-zero;
  nothing is half-created that a re-run with `--replace` does not overwrite.
- A banner URL is down: the email still reads whole, with the styled alt text in its place.

## Testing

`tests/newsletter-build.test.cjs` (Node, no network): the conditional chain opens with `IF`, has eleven
`ELSEIF`s, one `ELSE:` and one `END:IF`, in zodiac order, with lowercase sign values; each branch holds that
sign's text and banner URL and no other sign's; an unfit sign stops the build, and with `--allow-missing` gets
the missing-sign panel and not the invitation; an unfit overview stops the build; unfit subjects give the dated
subject; text is escaped (`<`, `&`, a quote in a reading); the footer holds `*|UNSUB|*`, `*|SITEUNSUB|*`,
`*|HTML:LIST_ADDRESS_HTML|*`, `*|ARCHIVE|*`, `*|REWARDS|*` and the disclosure; no `background-image`, `.webp` or
`<svg` appears; every `<img>` has `alt`, `width` and an absolute `https://ishtarinsights.com/assets/newsletter/`
URL; the HTML is under 90 KB for a full issue of maximum-length readings; `issue.json`'s sha matches.

`tests/zodiac-figures.test.cjs`: twelve figures; the brightest star of Taurus, Leo, Virgo and Scorpio has the
published magnitude of Aldebaran (0.87), Regulus (1.36), Spica (0.98) and Antares (1.06), written as literals;
the projection puts a star of greater right ascension to the left and one of greater declination higher.

`tests/weekly-proof.test.cjs` gains: a refused correction is kept under `suggested`; accept and reject through
the review tool, including an accepted text that fails the validator being refused.

Django, `newsletter/tests/test_draft_campaign.py`, with `mailchimp._request` replaced by a recording fake:
creates then sets content; finds an existing draft and refuses without `--replace`; refuses a sent campaign;
prints checklist items; warns at 100 members; `--test` posts one address; a sha mismatch stops it; no code path
requests a URL ending `/actions/send` or `/actions/schedule` (asserted over every recorded call); no key, no
calls. Each new test is seen to fail first.

## Out of scope

Sending or scheduling; a Mailchimp stored template; per-issue generated art; moon-phase icons; a BIMI logo or
favicon; a web archive of past issues on the site; open and click reporting; A/B subject testing; moving to a
paid plan; changing the fact-word guard.
