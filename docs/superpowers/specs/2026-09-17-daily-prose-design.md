# Daily prose horoscope, written by a local model

**Date:** 2026-09-17. **Status:** approved design, awaiting the plan.

## Purpose

The daily horoscope on `/sky/` places Sun, Moon, Mercury, Venus and Mars in the selected
sign's solar houses and pulls one fixed sentence per planet from a table. It never states its
own mechanism, computes nothing between the bodies, and knows nothing of Jupiter, Saturn, the
outer planets, ingresses or stations. The result reads as five unconnected lines and the
reader is left to make the connections.

A competitor's daily (the SASS newsletter, 2026-09-17 issue) reads as one paragraph per sign
in a fixed four-beat shape: a one-line mood, the mechanism named in plain words ("the Moon in
your travel-and-belief sector trines Saturn in your sign"), one concrete consequence, and one
imperative. The day's large event is woven only into the signs it touches.

This project produces that shape for all twelve signs, every day, with the prose written by
**Muse Glimmer 30B** running on Glenn's own llama.cpp server, from a fact sheet the site's own
engines compute. The page falls back to today's template reading whenever no paragraph is
available, so nothing that works today stops working.

## Decisions taken with Glenn

1. **The copy is LLM-written, not template-composed.** Templates were offered and declined;
   the ceiling on prose quality was the reason.
2. **The writer is the local Muse Glimmer 30B**, served by the existing llama.cpp endpoint on
   `127.0.0.1:8088` under the alias `muse-glimmer-30b-local` (the `glimmer` profile of
   `%LOCALAPPDATA%\hermes\llama-server\start.ps1`). No hosted API, no key.
3. **The paragraph replaces the five lens cards.** The dateline, the Moon phase line and the
   reflection question stay. The lens cards remain the fallback rendering.
4. Everything else below is Claude's recommendation, accepted with "your recommendations".

## Architecture

The GPU is on GLENNHOMEPC and the site is on the VPS, so generation cannot run where the site
is served. The pipeline is: the PC computes the facts and writes the copy, validates it, and
pushes one small JSON file per day to the VPS over the existing `vps` ssh alias. The page
fetches that day's file. Because the ephemeris is deterministic, each run writes seven days
ahead, so a night the PC is off costs nothing.

Five pieces, in the order data flows.

### 1. The fact sheet (`daily-horoscope-engine.js`, `sky-calendar-engine.js`)

`SkyCalendarEngine.moonAspects(from, to, planets)` is new and public. It returns every exact
Ptolemaic aspect (0, 60, 90, 120, 180) the Moon perfects to each named planet inside
`[from, to)`, as `{time, planet, aspect}`, sorted by time. It is the search loop already inside
the private `lastAspectBefore` (the void-of-course code), generalised to return all hits
instead of the latest one. `lastAspectBefore` is rewritten on top of it so there is one search.

`DailyHoroscopeEngine.factSheet(day)` is new. It is called only from Node (the writer and the
tests); the browser never needs it, so it requires `SkyCalendarEngine` lazily. For a `day`
string it returns:

```
{
  day, instant,                       // the existing 12:00 UTC sample
  moon: {sign, phase, illumination},
  aspects: [{planet, aspect, name, planetSign, time}],          // Moon to Mercury..Pluto, the UTC day
  events:  [{body, kind: 'ingress'|'station', detail, sign}],  // Sun, Mercury..Pluto, the UTC day
  signs: [{
    sign, ruler,
    moonSector: {house, name},
    aspects: [{planet, name, planetSector: {house, name}, rulerInvolved}],
    events:  [{body, kind, detail, sector: {house, name}, rulerInvolved}]
  } x 12]
}
```

Conventions:

- **The day is the UTC calendar day**, `00:00Z` to `24:00Z`. Positions and sectors are taken
  at the existing 12:00 UTC sample. Aspect times are kept in the sheet for the tests but are
  never given to the model (see the prompt rules), because a clock time is zone-dependent and
  the site does not know where the reader is.
- **Aspect partners are Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.** The
  Sun is left out because Sun-Moon aspects are the phases, which the sheet already carries.
- **Events are ingresses and stations** from the existing `ingresses` and `stations` searches
  for the Sun and Mercury through Pluto. Moon ingresses are excluded (the Moon's sign is
  already in the sheet). Chiron is excluded because the vendored ephemeris has no Chiron.
- **Rulers are the classical rulers** already in `classical-engine.js` (`rulers`). Reused, not
  redefined.
- **Sectors** are the twelve whole-sign solar houses, with twelve original plain-language names
  written for this site (for example house 9 "your travel-and-belief sector", house 4 "your
  home sector at the base of your chart", house 12 "your most private sector"). They live in
  the engine as data and are the only vocabulary the model is allowed for houses.

### 2. The writer (`tools/write_daily_prose.cjs`)

A Node script, no dependencies beyond the repository and Node's built-in `fetch`.

- **Arguments:** `--from YYYY-MM-DD` (default today, UTC), `--days N` (default 7),
  `--endpoint` (default `http://127.0.0.1:8088/v1`), `--model` (default
  `muse-glimmer-30b-local`), `--out` (default `output/daily-prose/`), `--push`, `--force`.
- **Model guard.** Before writing anything it reads `/props` and refuses unless the served
  alias equals `--model`. The script never starts or swaps the model itself; that is the
  wrapper's job (piece 5). This guarantees it can never silently write with Qwen.
- **Idempotent.** A day whose file already exists in `--out` is skipped unless `--force`.
- **One request per sign per day.** System prompt: the style brief. User message: that sign's
  slice of the fact sheet as JSON plus the sign-independent `moon` and a one-line reminder of
  the four beats. Sampling follows Meta's published settings for Glimmer (temperature 1.0,
  top_p 0.95, top_k 64). Reasoning strength is set low in the system prompt; the model still
  emits `reasoning_content`, so `max_tokens` is 700 and only `message.content` is read.
- **The style brief** (the only creative asset; it is checked in with the script):
  second person, one paragraph, 60 to 120 words, the four beats in order; name the Moon's
  sector by its given name; name the aspect and partner by their plain names ("trines
  Saturn"); mention the ruler only if `rulerInvolved`; weave an event only if the sheet lists
  one for this sign; no clock times, no degrees, no sign names other than this sign, no planets
  or aspects not in the sheet; no "will", no promises or predictions, no medical, legal or
  financial advice, no em dashes, no headings, no emoji. One original example paragraph
  written for this site is included so the shape is unambiguous.
- **Validation** is a pure function `validate(paragraph, signSheet)` exported for the tests.
  It rejects: outside 60 to 120 words; more than one paragraph; missing the word "Moon";
  missing the Moon sector's name; any of the forbidden phrases the sky copy tests already ban
  (`you will`, `will happen`, `is going to`, `the answer is`, `luck`, `fortune`) plus a bare
  `will`; any planet name not in this sign's sheet; any sign name other than this sign; an em
  dash; anything that looks like a clock time or a degree. Three attempts per sign; a sign that
  fails three times is omitted from the file and logged, and the page shows the template
  reading for that sign only.
- **Output:** `output/daily-prose/YYYY-MM-DD.json`, gitignored:

  ```
  {"day":"2026-09-18","generated":"2026-09-17T10:31:04Z","model":"muse-glimmer-30b-local",
   "signs":{"aries":"...", ... }}
  ```

  Sign keys are lowercase sign names. A missing key means "fall back".
- **Push** (`--push`): for each day written, `ssh vps` receives the file on stdin, writes
  `/opt/tarot-game/daily/<day>.json.tmp`, then `mv -f` over the final name, so a reader never
  sees a half-written file.

### 3. Serving (VPS)

One nginx location in `/etc/nginx/sites-available/ishtarinsights.com`, added by hand with
`nginx -t` before reload, recorded in `docs/deployment.md`:

```
location ^~ /sky/daily/ {
    alias /opt/tarot-game/daily/;
    default_type application/json;
    add_header Cache-Control "max-age=600";
    add_header X-Content-Type-Options nosniff;
}
```

`/opt/tarot-game/daily/` sits beside `releases/`, outside every release directory, so the
existing hardlink-copy deploys never touch it. A day with no file is a plain 404.

### 4. The page (`daily-horoscope.js`, `daily-horoscope.css`, `sky/index.html`)

- On the first render of a calendar day the page fetches `/sky/daily/<day>.json` once, with a
  two-second timeout, and caches the parsed result (or its absence) for that day. Sign changes
  read the cache synchronously. The reading renders once, after the fetch settles, so the
  `aria-live` region does not announce twice.
- With a paragraph for the selected sign: the dateline, the sign glyph, the paragraph as one
  `<p>`, then the existing Moon phase line and reflection question. The lens cards, title,
  overview and action line are not rendered.
- Without one (no file, 404, timeout, bad JSON, missing sign, or a value that is not a
  non-empty string): exactly today's rendering.
- The "How your daily reading is made" disclosure gains one sentence: on most days the
  paragraph is written by a language model running on the site's own hardware from the
  positions and aspects computed for that day, and checked automatically before publishing;
  when no paragraph is available the shorter template reading appears instead.
- Cache keys bump: `daily-horoscope.js?v=2`, and `daily-horoscope.css?v=2` if it changes.

### 5. The nightly run (GLENNHOMEPC, outside the repository)

`C:\Users\glenn\Scripts\daily-prose.ps1`: start the `glimmer` profile with `-Force
-WaitForReady`, run the writer with `--push`, then start the default profile with `-Force` to
restore Qwen. `daily-prose-hidden.vbs` wraps it with `WScript.Shell.Run(cmd, 0, True)`.
Scheduled task `Ishtar-Daily-Prose`, daily at 03:30, `/RL LIMITED /IT`, because the model file
is on `N:` and `N:` exists only inside Glenn's interactive session. The task swaps the loaded
model for about five minutes; 03:30 was chosen so it never collides with Hermes use. The
seven-day lookahead makes a missed night harmless.

## Testing

- `tests/daily-prose.test.cjs`, written before the code:
  - `moonAspects` over one day returns hits sorted by time, each within a second of exactness
    when re-evaluated, and for a known void-of-course window the last hit equals what
    `voidPeriods` reports as the closing aspect (cross-check against existing code, not a
    fixture computed by the code under test).
  - `factSheet` for a fixed date: twelve signs, sectors wrap (sign i+1 sees house h-1), rulers
    match `classical-engine.js`, every aspect partner sector is consistent with the partner's
    sign, events carry a sector, `rulerInvolved` is true exactly when the ruler is a partner
    or an event body.
  - `validate` accepts a hand-written good paragraph and rejects one example per rule, each
    test shown failing before the rule exists.
  - The style brief contains no sign name and no planet name, so it can never leak a fact.
- `tests/daily-horoscope.test.cjs` gains: with a stubbed `fetch` returning a paragraph, the
  rendered reading contains the paragraph and no lens card; with a 404, the rendering is
  byte-identical to today's; with a paragraph for another sign only, the selected sign falls
  back.
- Before the first push to the VPS: run the writer for two days, read all 24 paragraphs, and
  run a strong-model review of that batch for originality against the SASS sample and for
  astrological correctness against the fact sheet (see the memory note on classic-text
  originality). Fix the brief, not the paragraphs.
- After deploy: both hostnames serve `/sky/daily/<day>.json` with the JSON content type; the
  page renders the paragraph for two signs and the template for a day with no file.

## Documentation

`docs/DAILY-HOROSCOPE.md` gains a section on the prose layer, the fact-sheet conventions, the
writer, and the fallback. `docs/SKY.md` "Copy" notes that the daily paragraph is the one piece
of copy on the page not in `sky-calendar-text.js`, and why. `docs/deployment.md` records the
nginx location and the `daily/` directory. `.gitignore` gains `output/daily-prose/`.

## Constraints

Each constraint names its source, per Glenn's global rule.

- **Open source only.** Glenn's global rule. Muse Glimmer 30B is Apache 2.0; llama.cpp is MIT.
- **No hosted API, no key.** Glenn, this session ("point to my local Glimmer").
- **The paragraph replaces the lenses; phase and question stay.** Glenn accepted Claude's
  recommendation, this session.
- **Copy never forecasts or promises.** Already enforced by `tests/sky-calendar-text.test.cjs`
  for the calendar copy; the same forbidden list is applied to the generated paragraph.
- **No positions are fetched from a network service.** `docs/SKY.md`. The one new request is
  a same-origin GET for finished copy; the astronomy stays in the browser and on the PC.
- **The generated file lives outside release directories.** Claude's judgement, so that the
  hardlink-copy deploy in `docs/deployment.md` can never delete it.
- **Task Scheduler wrappers use the wscript VBS shim.** Glenn's global CLAUDE.md.
- **The writer refuses to run unless Glimmer is the served alias.** Claude's judgement, so a
  wrapper failure can never publish Qwen's prose under Glimmer's name.
- **No Chiron.** A fact of the vendored ephemeris and an existing `docs/SKY.md` exclusion.
- **Cache keys bump on every changed runtime file.** Repository convention.

## Out of scope

Per-reader natal daily readings (the competitor's paid tier). Generating on the VPS.
Rewriting the sky calendar copy with the model. Any new Django endpoint. Notifying anyone
when a night's run fails; the fallback covers it and the run logs to the task's own file.
