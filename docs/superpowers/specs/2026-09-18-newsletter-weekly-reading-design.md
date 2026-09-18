# Weekly per-sign reading for the newsletter

**Date:** 2026-09-18. **Status:** design approved in chat ("yes, write the spec"), awaiting Glenn's review of
this file.

## Purpose

Piece 2 of 3 in the newsletter project. Piece 1 (deployed 2026-09-18) copies subscribers and their chosen
sun sign to a Mailchimp audience. This piece writes the text of a weekly issue: a reading for each of the
twelve signs, one overview of the week's sky for everyone, and candidate subject lines. Piece 3 (its own
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

## Constraints

| Constraint | Source |
|---|---|
| Dependencies are open source | Glenn's global instructions |
| No "will", no fortune-telling phrases, no planet or sign the fact sheet did not supply, no em dash, clock time or degree | Existing daily writer (`tools/write_daily_prose.cjs`), reused unchanged |
| The writer refuses to run unless the loaded llama.cpp model is Muse Glimmer | Existing daily writer's `/props` gate, reused |
| Event cap of six per sign, the word and character limits below, three attempts per block | Claude's judgement |
| Expected astronomical values in tests come from a source other than `sky-calendar-engine.js` | Project memory ("test oracle from code under test") |
| Subscriber data is not involved; the output contains no personal data | Follows from the design |

## Architecture

Three units, each usable without the others.

1. **`weekSheet(monday)`**, facts. Pure computation in `daily-horoscope-engine.js`, beside `factSheet`.
2. **`tools/write_weekly_prose.cjs`**, the writer. Builds prompts from the sheet, calls the local model,
   validates, retries, writes one JSON file. The only unit that touches the network (127.0.0.1:8088).
3. **`output/weekly-prose/<monday>.json`**, the contract piece 3 reads.

### 1. `weekSheet(monday)`

Input: a `YYYY-MM-DD` string that must be a Monday; anything else returns `{status: 'not-monday'}`. The
window is `[monday 00:00 UTC, +7 days)`.

`sky-calendar-engine.js` gains one exported function, `quarters(from, to)`, lifted out of `monthEvents`
(which then calls it, so the month view is unchanged). `weekSheet` collects, for the window:

- lunar phases from `quarters` (New Moon, First Quarter, Full Moon, Last Quarter);
- planet ingresses from `ingresses` with the Moon excluded (the Moon changes sign about three times a week,
  which is noise at this scale);
- stations from `stations`;
- eclipses from `eclipses`.

Each event becomes `{weekday, kind, body, detail, sign}` where `weekday` is the UTC weekday name and `sign`
is the zodiac sign the event falls in. Moon aspects and void periods are deliberately left out.

Output:

```json
{ "from": "2026-09-21", "to": "2026-09-28",
  "events": [ { "weekday": "Tuesday", "kind": "phase", "body": "Moon", "detail": "New Moon", "sign": "Virgo" } ],
  "signs": { "aries": { "ruler": "Mars",
                        "events": [ { "weekday": "Tuesday", "kind": "phase", "body": "Moon", "detail": "New Moon",
                                      "sector": { "house": 6, "name": "work and health" }, "rulerInvolved": false } ] } } }
```

Per sign, `sector` is the whole-sign house of the event's sign counted from the reader's sign, using the
same `sectorNames` the daily sheet uses; `rulerInvolved` is true when `body` is the sign's classical ruler.
Per-sign events are ordered ruler-involved first, then eclipses, phases, stations, ingresses, then by date,
and cut to six. The per-sign list omits `sign`, as the daily sheet withholds the Moon's sign, so the model
writes about the house and not the zodiac position. The shared `events` list keeps `sign` and has no houses;
it is not capped.

A quiet week is possible: lunar quarters fall 6.6 to 8.2 days apart, so a seven-day window can hold none,
and a week can pass with no ingress or station either. So the sheet always carries a `backdrop` that needs
no event: the Sun's sign on the Monday and, per sign, the Sun's whole-sign house, plus whether the Moon is
waxing or waning as the week opens. The shared sheet has `backdrop: {sunSign, moon: "waxing"|"waning"}` and
each sign has `backdrop: {sunSector: {house, name}, moon}`. The per-sign backdrop withholds the Sun's sign
for the same reason events withhold theirs. An empty `events` list is therefore valid, and the validators
below are written to allow it.

### 2. `tools/write_weekly_prose.cjs`

CLI: `--week YYYY-MM-DD` (a Monday; default the next Monday on or after today, UTC), `--force`,
`--endpoint`, `--model`, `--out` (default `output/weekly-prose`). There is no `--push`: piece 3 runs on the
same machine and the site never serves this file.

It reuses the daily writer by `require('./write_daily_prose.cjs')`. The daily writer's entity, forbidden-
phrase and typography checks are lifted out of its `validate` into an exported `commonProblems(text,
allowedBodies, allowedSigns)`; the daily `validate` calls it, so daily behaviour and its 14 tests are
unchanged. No shared base module: two writers do not justify one.

Three kinds of block, each with its own brief (`RULES` + `EXAMPLE` constants, exported, read fresh each
run) and its own validator:

| Block | Calls | Brief asks | Validator accepts |
|---|---|---|---|
| Sign reading | 12 | two paragraphs, 170 to 200 words: the shape of the week for this sign, then the one or two days that matter and what to do with them | exactly two blocks separated by a blank line, no newline inside a block; 120 to 230 words; ends `.`, `!` or `?`; names at least one sector name present in that sign's sheet (an event's or the backdrop's), and at least one weekday from the sheet when the sign has any events; `commonProblems` clean |
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

### 3. Output contract

`output/weekly-prose/<monday>.json`:

```json
{ "week": "2026-09-21", "generated": "2026-09-20T11:31:07Z", "model": "muse-glimmer-30b-local",
  "overview": "…", "signs": { "aries": "…" },
  "subjects": ["…", "…", "…"], "preview": "…" }
```

Piece 3 must tolerate a missing sign (that segment gets the overview only), an empty `overview` (no issue is
drafted) and empty `subjects` (a plain dated subject). `.gitignore` gains `output/weekly-prose/` beside the existing
`output/daily-prose/` line; `output/` as a whole is not ignored.

## Scheduling

A scheduled task `Ishtar-Weekly-Prose` on GLENNHOMEPC, Sundays at 04:30 local, after the nightly
`Ishtar-Daily-Prose` run at 03:30, launched through a wscript + VBS shim with `bWaitOnReturn=True` like the
daily task (a console flag cannot hide a task window on this machine). It writes the week beginning the next
day. Thirteen sign-sized calls and one small one take about five minutes at the measured 21 seconds per
reading. Glenn reads the file on Sunday; piece 3 drafts the campaign; Glenn sends on Monday morning.

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
   first; the cap holds at six; per-sign events carry no `sign`; a week chosen to have no lunar quarter
   still returns a backdrop and a valid sheet.
3. Validators: one failing input per rule in the table above, plus one passing input per block.
4. Writer, with the fake model: writes the contract shape; omits a sign that fails three times; fills only
   the gaps on re-run; `--force` rewrites; subjects failure still writes the file with `subjects: []`; exit
   codes 0, 2 and 3.
5. `commonProblems` extraction: the 14 daily tests pass unmodified.

Each new test is shown failing before the code that satisfies it, and any test added in a fix round is shown
failing with the fix removed (project memory, "fix-round tests need RED evidence").

One measured live probe before the brief is trusted: three weeks written against the real model, recording
per-block first-attempt pass rates and the rejection reasons, reported as numbers. The brief is revised and
re-probed if any block passes less than two times in three on the first attempt. A strong-model read of one
full week for factual errors against the sheet, as was done for the daily readings.

## Documentation

`docs/NEWSLETTER.md` gains a "Weekly reading" section: what the writer produces, the contract, the
scheduled task, and how to re-run a weak week. `docs/DAILY-HOROSCOPE.md` notes that `commonProblems` is
shared.

## Out of scope

Email HTML, templates, Mailchimp campaigns and segments (piece 3); any site page or VPS push of the weekly
file; per-user readings; Moon aspects and void periods in the weekly sheet; a shared base module for the two
writers; model switching (the gate reports a wrong model, it does not load the right one).
