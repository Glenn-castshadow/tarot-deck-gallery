# Weekly per-sign reading for the newsletter

**Date:** 2026-09-18. **Status:** design approved in chat ("yes, write the spec"), awaiting Glenn's review of
this file.

## Purpose

Piece 2 of 3 in the newsletter project. Piece 1 (deployed 2026-09-18) copies subscribers and their chosen
sun sign to a Mailchimp audience. This piece writes the text of a weekly issue: a reading for each of the
twelve signs, one overview of the week's sky for everyone, and candidate subject lines, and then has a
second local model proofread and pass or fail each block. Piece 3 (its own
spec) turns that text into a draft Mailchimp campaign with per-sign segments. Nothing here sends email,
calls Mailchimp, or changes the site.

## Decisions taken with Glenn

| Decision | Source |
|---|---|
| Muse Glimmer writes it; the issue is weekly | Glenn, recorded in the piece 1 spec |
| The reading appears in the email only, not on the site | Glenn, 2026-09-18 |
| Each week: 12 sign readings, 1 overview, subject lines and a preview text | Glenn, 2026-09-18 |
| A week runs Monday 00:00 UTC to the next Monday 00:00 UTC; the issue is sent Monday morning | Glenn, 2026-09-18 |
| A sign reading is two paragraphs, 150 to 200 words | Glenn, 2026-09-18 |
| The model is given a curated list of the week's headline events, not Moon aspects or the daily readings | Claude's recommendation, accepted |
| Qwen (the other local model) proofreads every block and passes or fails it | Glenn, 2026-09-18 |
| Qwen may correct small errors (spelling, grammar, punctuation) in place; it fails a block only for factual or tone problems | Glenn, 2026-09-18 |

## Constraints

| Constraint | Source |
|---|---|
| Dependencies are open source | Glenn's global instructions |
| No "will", no fortune-telling phrases, no planet or sign the fact sheet did not supply, no em dash, clock time or degree | Existing daily writer (`tools/write_daily_prose.cjs`), reused unchanged |
| The writer refuses to run unless the loaded llama.cpp model is Muse Glimmer | Existing daily writer's `/props` gate, reused |
| The word and character limits below, three attempts per block, and the standing placements in the backdrop | Claude's judgement |
| Expected astronomical values in tests come from a source other than `sky-calendar-engine.js` | Project memory ("test oracle from code under test") |
| A Qwen correction is kept only if the corrected text still passes the block's code validator and changes at most 8% of the words; otherwise Glimmer's text stands | Claude's judgement, to stop the checker introducing unchecked errors |
| Glimmer's original text is kept in the file beside any corrected text | Claude's judgement |
| A failed block is not rewritten automatically; re-running the writer fills it | Follows from Glenn choosing in-place fixes over the automatic repair round |
| Subscriber data is not involved; the output contains no personal data | Follows from the design |

## Architecture

Four units, each usable without the others.

1. **`weekSheet(monday)`**, facts. Pure computation in `daily-horoscope-engine.js`, beside `factSheet`.
2. **`tools/write_weekly_prose.cjs`**, the writer. Builds prompts from the sheet, calls the local model,
   validates, retries, writes one JSON file. The only unit that touches the network (127.0.0.1:8088).
3. **`tools/proof_weekly_prose.cjs`**, the proofreader. Sends each block and its facts to Qwen, records a
   verdict, applies small corrections.
4. **`output/weekly-prose/<monday>.json`**, the contract piece 3 reads.

### 1. `weekSheet(monday)`

Input: a `YYYY-MM-DD` string that must be a Monday; anything else returns `{status: 'not-monday'}`. The
window is `[monday 00:00 UTC, +7 days)`.

`sky-calendar-engine.js` gains one exported function, `quarters(from, to)`, lifted out of `monthEvents`
(which then calls it, so the month view is unchanged). `weekSheet` collects, for the window:

- lunar phases from `quarters` (the engine's names: New moon, First quarter, Full moon, Third quarter);
- planet ingresses from `ingresses` with the Moon excluded (the Moon changes sign about three times a week,
  which is noise at this scale);
- stations from `stations`;
- eclipses from `eclipses`.

Each event becomes `{weekday, kind, body, detail, sign}` where `weekday` is the UTC weekday name and `sign`
is the zodiac sign the event falls in. Moon aspects and void periods are deliberately left out.

Output:

```json
{ "from": "2026-09-21", "to": "2026-09-28",
  "backdrop": { "moon": "waxing", "placements": [ { "body": "Sun", "sign": "Virgo" }, { "body": "Mercury", "sign": "Libra" } ] },
  "events": [ { "weekday": "Wednesday", "kind": "ingress", "body": "Sun", "detail": "enters a new sign", "sign": "Libra" },
              { "weekday": "Saturday", "kind": "phase", "body": "Moon", "detail": "Full moon", "sign": "Aries" } ],
  "signs": [ { "sign": "Aries", "ruler": "Mars",
               "backdrop": { "moon": "waxing", "placements": [ { "body": "Sun", "sector": { "house": 6, "name": "your daily-work-and-health sector" }, "ruler": false } ] },
               "events": [ { "weekday": "Saturday", "kind": "phase", "body": "Moon", "detail": "Full moon",
                             "sector": { "house": 1, "name": "your sign" }, "rulerInvolved": false } ] } ] }
```

The values above are the real ones for that week (Sun into Libra 2026-09-23 00:05 UTC, Full moon
2026-09-26 16:49 UTC in Aries), confirmed against a published almanac. `signs` is an array in zodiac order
with capitalised names, as `factSheet` returns it; the Aries entry and both placement lists are abridged,
and the Mercury placement is illustrative.

Per sign, `sector` is the whole-sign house of the event's sign counted from the reader's sign, using the
same `sectorNames` the daily sheet uses; `rulerInvolved` is true when `body` is the sign's classical ruler.
Per-sign events are ordered ruler-involved first, then eclipses, phases, stations, ingresses, then by date.
There is no cap: across every Monday week from 2026 to 2035 the most events in one week is six, and that
happens once. The per-sign list omits `sign`, as the daily sheet withholds the Moon's sign, so the model
writes about the house and not the zodiac position. The shared `events` list keeps `sign` and has no houses.

Quiet weeks are common. Lunar quarters fall 6.6 to 8.2 days apart, so a seven-day window can hold none, and
across 2026 to 2035 about a quarter of all weeks hold exactly one headline event and five hold none. So the
sheet always carries a `backdrop` that needs no event: whether the Moon is waxing or waning as the week
opens, and the standing `placements` at Monday 00:00 UTC of the Sun, Mercury, Venus and Mars, plus the
sign's ruler when that is Jupiter or Saturn (the Moon moves too fast to have a weekly placement). The
shared sheet has `backdrop: {moon: "waxing"|"waning", placements: [{body, sign}]}` and each sign has
`backdrop: {moon, placements: [{body, sector: {house, name}, ruler}]}`, where `ruler` marks the sign's
ruling planet. A body that changes sign during the week keeps its Monday placement here and also appears
as an ingress event. The week of 2026-11-02 is such a week: no
quarter, ingress, station or eclipse falls in it. The per-sign backdrop withholds zodiac signs for the same reason events do. An empty `events` list is therefore valid, and the validators
below are written to allow it.

### 2. `tools/write_weekly_prose.cjs`

CLI: `--week YYYY-MM-DD` (a Monday; default the next Monday on or after today, UTC), `--force`,
`--endpoint`, `--model`, `--out` (default `output/weekly-prose`). There is no `--push`: piece 3 runs on the
same machine and the site never serves this file.

It reuses the daily writer by `require('./write_daily_prose.cjs')`. The daily writer's entity, forbidden-
phrase and typography checks are lifted out of its `validate` into an exported `commonProblems(text,
allowedBodies, allowedSigns)`; the daily `validate` calls it, so daily behaviour and its 14 tests are
unchanged. The daily writer also exports `servedAlias` and `complete`, and `complete` takes an optional
fourth argument of sampling overrides (the proofreader judges at temperature 0.2). No shared base module:
three tools do not justify one.

Three kinds of block, each with its own brief (`RULES` + `EXAMPLE` constants, exported, read fresh each
run) and its own validator:

| Block | Calls | Brief asks | Validator accepts |
|---|---|---|---|
| Sign reading | 12 | two paragraphs, 170 to 200 words: the shape of the week for this sign, then the one or two days that matter and what to do with them | exactly two blocks separated by a blank line, no newline inside a block; 120 to 230 words; ends `.`, `!` or `?`; names at least one sector name present in that sign's sheet (an event's or a placement's), and at least one weekday from the sheet when the sign has any events; `commonProblems` clean |
| Overview | 1 | two paragraphs, 140 to 170 words, for readers of any sign | same shape; 120 to 200 words; names at least two events from the shared list, or every event when there are fewer than two (matched on `detail`, or on `body` plus weekday); contains no sector name; `commonProblems` clean |
| Subjects | 1 | three subject lines and one preview text, as JSON | JSON object `{subjects: [3 strings], preview: string}`; each subject 25 to 60 characters, one line, no emoji, no `!`, no all-caps word, no sign name, no "will"; the three differ after lowercasing; preview 40 to 110 characters; `commonProblems` clean on all four |

The brief asks for slightly more than the validator's floor because Glimmer runs about 10% under its target
(measured on the daily writer). Briefs state what to write and avoid quoting banned phrases, and each
`EXAMPLE` is written to the exact shape wanted, since the model copies an example's length, ending and
furniture (project memory, "quoted negatives prime the model").

Each block gets three attempts; a network error counts as an attempt. A sign that fails three times is
omitted from `signs`. If the overview fails, `overview` is `""`. If the subjects block fails, `subjects` is
`[]` and `preview` is `""`. The file is written in every case, and the process exits 0 when at least ten
signs and the overview succeeded, otherwise 3, so the scheduled task's result shows a weak week.

Re-running for the same week fills only what is missing (absent signs, empty overview, empty subjects);
`--force` rewrites everything. The `/props` model gate runs first and exits 2 on a mismatch, as the daily
writer does.

### 3. `tools/proof_weekly_prose.cjs`

CLI: `--week`, `--endpoint`, `--model` (default `qwen3.8-27b-local`), `--out`. It refuses to run (exit 2)
unless the served alias equals `--model`, so Glimmer can never mark its own work.

For every block in the week's file that has no verdict, or whose text no longer matches the recorded `sha`,
it sends Qwen the facts that block was written from (the sign's sheet, or the shared sheet) and the text,
and asks for one JSON object: `{"verdict": "pass" | "fail", "reason": "…", "corrected": "…"}`.

- **Fail** is for: a statement about the sky that is absent from or contradicts the facts (wrong weekday,
  wrong sector, wrong planet, wrong direction); a prediction or promise; medical, legal or financial advice;
  a fearful or fatalistic tone. `reason` names the sentence.
- **`corrected`** is the full text with spelling, grammar and punctuation fixed and nothing else changed, or
  the text unchanged.

A correction is applied only when the verdict is pass, the corrected text differs, it passes the same code
validator the writer used for that block, and the word-level edit distance is at most 8% of the original's
word count. Then the block's text is replaced, Glimmer's text goes to `originals[key]`, and `edited` is
true. A correction that fails either guard is discarded and logged; the verdict stands.

A failed block's text moves to `rejected[key]` with the reason and leaves `signs` / `overview` / `subjects`,
so the writer's gap-filling rewrites it on its next run and the changed `sha` sends the new text back
through proof. Nothing is rewritten automatically.

Three attempts per block; an unparsable reply or a network error counts as one. A block with no verdict
after three attempts is left as it is with no `proof` entry, which piece 3 treats as unpassed. Exit 0 when at
least ten signs and the overview hold a current pass, otherwise 3.

### 4. Output contract

`output/weekly-prose/<monday>.json`:

```json
{ "week": "2026-09-21", "generated": "2026-09-20T11:31:07Z", "model": "muse-glimmer-30b-local",
  "overview": "…", "signs": { "aries": "…" },
  "subjects": ["…", "…", "…"], "preview": "…",
  "proof": { "model": "qwen3.8-27b-local", "checked": "2026-09-20T11:40:12Z",
             "blocks": { "aries": { "verdict": "pass", "reason": "", "edited": true, "sha": "…" },
                         "overview": { "verdict": "pass", "reason": "", "edited": false, "sha": "…" },
                         "subjects": { "verdict": "fail", "reason": "…", "edited": false, "sha": "…" } } },
  "originals": { "aries": "Glimmer's text before Qwen's correction" },
  "rejected": { "subjects": { "text": "…", "reason": "…" } } }
```

Keys in `signs` are lowercase, as in the daily files. A block is fit to send only when
`proof.blocks[key].verdict` is `"pass"` and its `sha` equals the sha256 of the block's current text (for
`subjects`, of `JSON.stringify({subjects, preview})`). Piece 3 must tolerate a missing or unpassed sign
(that segment gets the overview only), a missing or unpassed `overview` (no issue is drafted) and missing or
unpassed `subjects` (a plain dated subject). `.gitignore` gains `output/weekly-prose/` beside the existing
`output/daily-prose/` line; `output/` as a whole is not ignored.

## Scheduling

A scheduled task `Ishtar-Weekly-Prose` on GLENNHOMEPC, Sundays at 04:30 local, after the nightly
`Ishtar-Daily-Prose` run at 03:30, launched through a wscript + VBS shim with `bWaitOnReturn=True` like the
daily task (a console flag cannot hide a task window on this machine). It writes the week beginning the next
day. `Scripts\weekly-prose.ps1` follows `Scripts\daily-prose.ps1`: check `N:` and `V:`, load Glimmer
(`start.ps1 -Quant glimmer -Force -WaitForReady`), run the writer, load Qwen (`-Quant iq3s -Force
-WaitForReady`), run the proofreader, and in `finally` make sure Qwen is the loaded profile. Writing takes
about five minutes at the measured 21 seconds per reading, each model load about a minute, and proofing
fourteen blocks a few minutes more. Glenn reads the file on Sunday; piece 3 drafts the campaign; Glenn sends
on Monday morning.

## Error handling

- Wrong model loaded: exit 2 before any call, nothing written.
- `--week` not a Monday: exit 1 with the nearest Mondays named.
- Model unreachable: every block uses its three attempts and fails; the file is written empty-handed and the
  exit code is 3. A later re-run fills it.
- Malformed JSON from the subjects block: counts as a failed attempt.
- An existing file that does not parse: treated as absent and rewritten, as the daily writer does.

## Testing

`tests/weekly-prose.test.cjs`, run with `node --test tests/*.test.cjs` (the repo has no `package.json`), using the daily tests' approach of
swapping `globalThis.fetch` for a fake that answers `/props` and `/chat/completions`.

1. `quarters(from, to)`: for one known week, the phase and its UTC date match a value taken from a published
   almanac and written into the test as a literal, not computed by the engine. `monthEvents` output for a
   fixed month is unchanged by the refactor (snapshot of the existing behaviour taken before the change).
2. `weekSheet`: rejects a non-Monday; window is exactly seven days; Moon ingresses excluded; per-sign houses
   are whole-sign from the reader's sign (one hand-worked case as a literal); ruler-involved events sort
   first; per-sign events and placements carry no `sign`; the week of 2026-11-02, which has no event at
   all, still returns a backdrop with placements and a valid sheet.
3. Validators: one failing input per rule in the table above, plus one passing input per block.
4. Writer, with the fake model (`main` returns its exit code instead of calling `process.exit`, so tests can
   assert it): writes the contract shape; omits a sign that fails three times; fills only
   the gaps on re-run; `--force` rewrites; subjects failure still writes the file with `subjects: []`; exit
   codes 0, 2 and 3.
5. `commonProblems` extraction: the 14 daily tests pass unmodified.
6. Proofreader, with a fake Qwen: a pass records verdict and sha; a fail moves the text to `rejected`; a
   small valid correction is applied and the original kept; a correction that changes too much, or that
   breaks the validator, is discarded; an unchanged, already-passed block is not sent again; a block whose
   text changed is sent again; the wrong served model exits 2; unparsable replies use up the three attempts.

Each new test is shown failing before the code that satisfies it, and any test added in a fix round is shown
failing with the fix removed (project memory, "fix-round tests need RED evidence").

One measured live probe before the brief is trusted: three weeks written against the real model, recording
per-block first-attempt pass rates and the rejection reasons, reported as numbers. The brief is revised and
re-probed if any block passes less than two times in three on the first attempt. A strong-model read of one
full week for factual errors against the sheet, as was done for the daily readings.

The proofreader gets its own probe, because a judge that passes everything is worthless: six readings with
one seeded error each (a wrong weekday, a wrong sector, a planet moved to another event, a promise, a piece
of medical advice, a doom-laden sentence) and the clean readings from the writer probe. Report the catch
rate on the seeded errors and the false-fail rate on the clean ones. The judge's brief is revised if it
catches fewer than five of six or fails more than one clean reading in ten.

## Documentation

`docs/NEWSLETTER.md` gains a "Weekly reading" section: what the writer and proofreader produce, the
contract, the scheduled task, and how to re-run a weak week. Any reader-facing note about how the newsletter
is made (piece 3) must say that one model writes and a second proofreads. `docs/DAILY-HOROSCOPE.md` notes that `commonProblems` is
shared.

## Amendments after review and the first live probe (2026-09-18)

These override the sections above where they differ. All are Claude's judgement, made while executing the
plan, unless marked otherwise.

1. **Placements can end mid-week.** A placement whose planet changes sign during the week carries
   `until: <weekday of its first ingress>`; placements that hold all week have no `until` key. Both briefs say
   so, the sign example shows one, and `overstays()` rejects a sentence that names such a planet and claims
   the whole week. Reason: in the first live probe, 24 of 24 readings in the two weeks where the Sun changed
   sign said "The Sun spends all seven days in ..." (a phrase copied from the example) and every one passed
   the code validator.
2. **A correction must leave every fact word in place.** Besides the validator and the 8% budget, the
   proofreader applies a correction only if the count of every weekday, planet, zodiac sign, sector name,
   phase and direction word, the word "until", and every number is the same before and after
   (`factWords`). Corrections are computed, checked, and only then applied. Reason: the whole-branch review
   showed four swapped facts fitting inside the 8% budget and being recorded as a current pass.
3. **The future tense is caught however it is spelled.** `commonProblems` also rejects `shall`, `won't` and
   any `...'ll` contraction (straight or curly apostrophe), and a spaced en dash. This also applies to the
   nightly daily writer, whose rules already banned the future tense; its 14 tests are unchanged.
4. **The overview counts an ingress only by planet plus weekday**, because every ingress shares the generic
   wording "enters a new sign".
5. **Fact-sheet wording is rejected.** The words "placement(s)" and "fact sheet" fail a sign reading or an
   overview; the briefs tell the model the reader has never seen the fact sheet. Reason: the probe produced
   "the placements stay steady" and "With no events to force a pivot".
6. **A quiet week is said once**, and the rest of the paragraph goes to what a steady week is good for.
7. **The subject-line example rotates** across three sets by week number. Reason: the model returned the
   example's lines with the nouns swapped.
8. **The fact-word guard compares order, not counts** (supersedes the wording of amendment 2). Swapping
   Thursday with Sunday keeps every count and moves an event two days; the ordered sequence of fact words
   must be identical before and after a correction.
9. **Only Monday and the sheet's own weekdays may be named**, in a sign reading, the overview, a subject line
   or the preview (`strayWeekday`): an event's day, the day a placement ends, or Monday. Reason: three probe
   readings set a deadline "before Wednesday" in weeks where nothing happens on a Wednesday, and Qwen passed
   them.
10. **The sign example states no count of days.** Its second paragraph opened "Two days matter most.", and five
    readings copied that into a week with three marked days.

Known and accepted: planet and sign names are matched with their capital letter only (a case-insensitive
match would reject ordinary English such as "sit in the sun"); Qwen's fact check is the second net.

## Out of scope

Email HTML, templates, Mailchimp campaigns and segments (piece 3); any site page or VPS push of the weekly
file; per-user readings; Moon aspects and void periods in the weekly sheet; a shared base module for the
tools; an automatic rewrite of failed blocks; model switching inside the Node tools (each gate reports a
wrong model; only the scheduled PowerShell script loads one).
