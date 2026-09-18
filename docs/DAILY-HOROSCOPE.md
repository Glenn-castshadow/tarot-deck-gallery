# Daily horoscope

The `/sky/#daily-horoscope` section offers all twelve tropical signs without an account or birth details. The existing birth-profile flow supplies its Sun sign (including its birthday-only approximation when no full chart is available). A manual selection remains selected across profile updates; “Use my birth sign” restores automatic selection. Clearing the profile removes that shortcut. Sign selection stays in page memory.

`daily-horoscope-engine.js` uses the vendored Astronomy Engine and NatalEngine placement helper. For each device-local calendar date it samples the geocentric tropical sky at **12:00 UTC**. One date’s sky is cached in memory. The selected sign is the first whole-sign solar house; the Moon supplies the headline and mood, Venus relationships, Mercury work, Sun growth, and Mars the action. Phase and illumination come from Astronomy Engine. All interpretation copy is original. The reflection question rotates by calendar day and sign. Slow-moving placements mean some themes intentionally repeat; these are general symbolic readings, not personal natal transit predictions.

`daily-horoscope.js` follows the existing attach pattern and updates at local midnight, on returning to a visible tab, and at most once a minute for device clock/time-zone changes. Dates outside 1901–2100 show a retry state. Controls remain in place when readings refresh, preserving keyboard focus. The section participates in mobile disclosures and hash navigation. There are no cookies, storage keys, or services; the one network call is a same-origin GET for the day's prose paragraph, described in "The prose layer" below.

Validation: `node --test tests/daily-horoscope.test.cjs` covers all signs, house wrapping, existing ephemeris agreement, deterministic readings, daily rollover, leap days and bounds, local date keys, and cache isolation. Run `node --test tests/*.test.cjs` for the JavaScript regression suite.

## The prose layer (2026-09-17)

Design: `docs/superpowers/specs/2026-09-17-daily-prose-design.md`.

On most days the reading is one paragraph written by Muse Glimmer 30B (Apache 2.0) on Glenn's
llama.cpp server, never by a hosted API. `DailyHoroscopeEngine.factSheet(day)` computes what the
model may say: the Moon's sector for each sign (twelve plain-language `sectorNames`), every exact
Moon aspect that UTC day to Mercury through Pluto (`SkyCalendarEngine.moonAspects`) with the
partner's sector, the day's ingresses and stations (Sun and Mercury through Pluto; Moon ingresses
and Chiron excluded) with their sectors, the classical ruler and whether it is involved. The Moon's
sign is withheld from the model because the brief bans every sign name but the reader's own.

`tools/write_daily_prose.cjs` refuses to run unless `/props` reports the Glimmer alias, then asks
for one reading per sign per day: three paragraphs (the sky, a scene, the advice) separated by a
blank line, 250 to 300 words in all. The length was 80 to 110 words in one paragraph until
2026-09-18, when Glenn asked for the longer reading. The brief itself asks for 280 to 320 because
Glimmer lands about a tenth under the figure it is given. `max_tokens` is 2500 — Glimmer's
`reasoning_content` runs 300 to 400 tokens before it starts writing, so a tighter budget was
observed to leave the text empty or truncated mid-sentence. Each sign is a separate request
with no view of the other eleven, so `buildMessages` appends a rotating hint by sign (four opening
kinds by two scene settings, and one of thirteen places for the scene rotated by sign and day)
rather than asking the model for variety it cannot see. `validate`
keeps 150 to 350 words as the hard bounds it will publish (wider than the brief on purpose: a short
reading is still better than the template fallback, and a 120-word ceiling left Taurus out of
2026-09-23 after three attempts), checks the text is at most three blocks separated by a blank line,
ending in `.`, `!` or `?` (a truncation guard), names the Moon and its sector, uses no forbidden
phrase or "will", names no planet or sign outside the sheet, and uses no em dash, clock time or
degree. A request or network error counts as one failed attempt, the same as a validation failure,
not an abort of the run; each sign gets up to three attempts and is omitted from the day's file if
all three fail. Output is `output/daily-prose/<day>.json` (gitignored):
`{day, generated, model, signs: {aries: "...", ...}}`. `--push` streams each file over `ssh vps`
into `/opt/tarot-game/daily/`, which nginx serves at `/sky/daily/`. The nightly task on
GLENNHOMEPC (`Ishtar-Daily-Prose`, 03:30, wscript shim) writes seven days ahead, so a night the PC
is off changes nothing.

Timing measured on the RTX 5080: two days of twelve signs (24 paragraphs; a retried sign adds more
requests than that) took about 8.5 minutes, so the nightly seven-day run takes roughly 30 to 45
minutes, not the five minutes the design estimated before any run had been timed.

The first batch review (two days, 24 paragraphs) found no factual errors; `RULES` was tuned over
three rounds against template tics before that review. One tic remains — a recurring kitchen-table
scene, and "a partner" reached for as the default person — and is parked to revisit after a week of
live output rather than tuned against two days of samples. `RULES` lives in
`tools/write_daily_prose.cjs` and is read fresh on each run, so changing it needs no deploy: the
writer runs on Glenn's PC, not on the VPS or in a build step.

`daily-horoscope.js` fetches `/sky/daily/<day>.json` once per calendar day with a two-second
timeout and draws once after it settles; sign changes read the cached result. With a reading the
lens cards, title, overview and action are replaced by `<p class="dh-prose">`, whose
`white-space: pre-line` turns the blank lines into paragraph breaks; the dateline, phase
line and question stay. Without one (404, timeout, bad JSON, missing sign) the markup is byte for
byte today's template reading. This is the page's only network request and it carries finished
copy, not positions. The disclosure text in "How your daily reading is made" tells the reader the
paragraph is written by a language model running on our own hardware, and that the shorter
template reading appears on days none is available.

Validation: `node --test tests/daily-prose.test.cjs tests/daily-horoscope.test.cjs`.
