# Newsletter Weekly Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each week, have Muse Glimmer write twelve sign readings, an overview and subject lines from computed facts, have Qwen proofread and pass or fail each block, and leave one JSON file for piece 3 to turn into a Mailchimp draft.

**Architecture:** A pure `weekSheet(monday)` in the existing horoscope engine supplies the facts. `tools/write_weekly_prose.cjs` prompts the local model per block, validates in code, retries and gap-fills. `tools/proof_weekly_prose.cjs` sends each block and its facts to the second local model, records a verdict and applies small guarded corrections. A PowerShell script swaps the two models around the two tools.

**Tech Stack:** Node (CommonJS `.cjs`, `node --test`, global `fetch`), the vendored `astronomy-engine`, llama.cpp's OpenAI-compatible server on `127.0.0.1:8088`, Windows Task Scheduler with a wscript shim. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-18-newsletter-weekly-reading-design.md`. Read it first; this plan argues from it.

## Global Constraints

- Dependencies are open source, and this plan adds none. (Glenn's global instructions.)
- No "will", none of the daily writer's forbidden phrases, no planet or sign the facts did not supply, no em dash, clock time or degree, in any published block. (Existing daily writer.)
- The writer runs only when the served alias is `muse-glimmer-30b-local`; the proofreader only when it is `qwen3.8-27b-local`. Both exit 2 otherwise. (Existing gate; Glenn, 2026-09-18, for the proofreader.)
- Qwen may fix spelling, grammar and punctuation in place and fails a block only for factual or tone problems. (Glenn, 2026-09-18.)
- A correction is kept only if it passes the block's code validator and changes at most 8% of the words; Glimmer's original is kept in `originals`. (Claude's judgement.)
- A week is Monday 00:00 UTC to the next Monday 00:00 UTC. A sign reading is two paragraphs, 150 to 200 words. (Glenn, 2026-09-18.)
- Expected astronomical values in tests are literals from a published ephemeris, never computed by `sky-calendar-engine.js` or `daily-horoscope-engine.js`. The literals in this plan were checked against one: Sun enters Libra 2026-09-23 00:05 UTC; Full moon 2026-09-26 16:49 UTC in Aries; on 2026-09-21 the Sun is in Virgo, Mercury in Libra, Venus in Scorpio, Mars in Cancer, Jupiter in Leo, Saturn in Aries; the week of 2026-11-02 holds no quarter, ingress, station or eclipse. (Project memory, "test oracle from code under test".)
- Every new test is run and seen to fail before the code that satisfies it. (Project memory, "fix-round tests need RED evidence".)
- This repo stores CRLF blobs and has `core.autocrlf` behaviour on Windows; do not normalise line endings of files you did not otherwise change.
- Run the JavaScript suite with `node --test tests/*.test.cjs` from the repo root `V:\tarot_game`. There is no `package.json`.

## File Structure

| File | Responsibility |
|---|---|
| `sky-calendar-engine.js` (modify) | gains exported `quarters(from, to)`; `monthEvents` calls it |
| `daily-horoscope-engine.js` (modify) | gains exported `weekSheet(monday)`; the `sector` helper moves to module scope |
| `tools/write_daily_prose.cjs` (modify) | exports `commonProblems`, `servedAlias`, `complete`; `complete` takes sampling overrides |
| `tools/write_weekly_prose.cjs` (create) | briefs, validators, CLI and gap-filling writer |
| `tools/proof_weekly_prose.cjs` (create) | judge brief, verdict parsing, correction guards, CLI |
| `tests/weekly-prose.test.cjs` (create) | engine, validators and writer tests |
| `tests/weekly-proof.test.cjs` (create) | proofreader tests |
| `.gitignore` (modify) | `output/weekly-prose/` |
| `docs/NEWSLETTER.md`, `docs/DAILY-HOROSCOPE.md` (modify) | the weekly reading section; the shared-helper note |
| `C:\Users\glenn\Scripts\weekly-prose.ps1`, `weekly-prose-hidden.vbs` (create, outside the repo) | the Sunday job |

---

### Task 1: `quarters(from, to)` in the sky calendar engine

**Files:**
- Modify: `sky-calendar-engine.js` (the `monthEvents` body near line 270, and the export list near line 592)
- Test: `tests/weekly-prose.test.cjs` (create)

**Interfaces:**
- Produces: `SkyCalendarEngine.quarters(from: Date, to: Date) -> [{type: 'quarter', quarter: 0|1|2|3, name: 'New moon'|'First quarter'|'Full moon'|'Third quarter', date: ISO string}]`, every quarter with `from <= date < to`, ascending.

- [ ] **Step 1: Write the failing tests**

Create `tests/weekly-prose.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../sky-calendar-engine.js');

test('quarters lists the lunar quarters inside a window, against a published ephemeris', () => {
  const hits = E.quarters(new Date('2026-09-21T00:00:00Z'), new Date('2026-09-28T00:00:00Z'));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'Full moon');
  assert.equal(hits[0].quarter, 2);
  // Published: Full moon 2026-09-26 16:49 UTC.
  assert.equal(hits[0].date.slice(0, 16), '2026-09-26T16:49');
});

test('quarters returns nothing for a week that holds no quarter', () => {
  // Published: Third quarter 2026-11-01, New moon 2026-11-09 07:02 UTC. Nothing between.
  assert.deepEqual(E.quarters(new Date('2026-11-02T00:00:00Z'), new Date('2026-11-09T00:00:00Z')), []);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/weekly-prose.test.cjs`
Expected: both FAIL with `E.quarters is not a function`.

- [ ] **Step 3: Implement**

In `sky-calendar-engine.js`, add this function directly above `monthEvents`:

```js
  // Every lunar quarter with from <= time < to. No range guard of its own: monthEvents validates
  // its year and month first, and its `to` for December 2100 lies just past inRange's bound.
  function quarters(from, to) {
    const out = [], end = astro.MakeTime(to);
    let mq = astro.SearchMoonQuarter(from);
    while (mq.time.ut < end.ut) {
      out.push({type: 'quarter', quarter: mq.quarter, name: QUARTER_NAMES[mq.quarter], date: mq.time.date.toISOString()});
      mq = astro.NextMoonQuarter(mq);
    }
    return out;
  }
```

In `monthEvents`, replace

```js
    const events = [];
    let mq = astro.SearchMoonQuarter(from);
    while (mq.time.ut < astro.MakeTime(to).ut) {
      events.push({type: 'quarter', quarter: mq.quarter, name: QUARTER_NAMES[mq.quarter], date: mq.time.date.toISOString()});
      mq = astro.NextMoonQuarter(mq);
    }
```

with

```js
    const events = quarters(from, to);
```

Add `quarters` to the returned object at the bottom of the file (the line that lists `ingresses, monthEvents, stations, eclipses, ...`).

- [ ] **Step 4: Run the new tests and the calendar suite**

Run: `node --test tests/weekly-prose.test.cjs tests/sky-calendar.test.cjs tests/sky-calendar-text.test.cjs tests/sky-calendar-ui.test.cjs`
Expected: all PASS. `tests/sky-calendar.test.cjs` already covers `monthEvents` quarters, so it proves the refactor changed nothing.

- [ ] **Step 5: Commit**

```bash
git add sky-calendar-engine.js tests/weekly-prose.test.cjs
git commit -m "feat(sky): quarters(from, to), lifted out of monthEvents"
```

---

### Task 2: `weekSheet(monday)`

**Files:**
- Modify: `daily-horoscope-engine.js` (`factSheet` near line 87, the return near line 114)
- Test: `tests/weekly-prose.test.cjs`

**Interfaces:**
- Consumes: `SkyCalendarEngine.quarters`, `ingresses(from, to, bodies)` -> `{body, sign, signIndex, retrograde, date}`, `stations(from, to)` -> `{body, direction, sign, date}`, `eclipses(from, to)` -> `{kind, body: 'Sun'|'Moon', date}`, `lonOf(body, date)`.
- Produces: `DailyHoroscopeEngine.weekSheet(monday: 'YYYY-MM-DD')` ->
  `{status: 'not-monday'}` or
  ```
  { from, to,                                   // 'YYYY-MM-DD', to = from + 7 days
    backdrop: { moon: 'waxing'|'waning', placements: [{body, sign}] },
    events:   [{weekday, kind: 'phase'|'ingress'|'station'|'eclipse', body, detail, sign}],   // by date
    signs:    [{ sign, ruler,                   // 12, zodiac order, capitalised
                 backdrop: { moon, placements: [{body, sector: {house, name}, ruler: boolean}] },
                 events:   [{weekday, kind, body, detail, sector: {house, name}, rulerInvolved}] }] }
  ```
  Throws `RangeError` for a malformed or out-of-range date, as `factSheet` does.

- [ ] **Step 1: Write the failing tests**

Append to `tests/weekly-prose.test.cjs`:

```js
const H = require('../daily-horoscope-engine.js');

test('weekSheet refuses a day that is not a Monday and throws on a malformed one', () => {
  assert.deepEqual(H.weekSheet('2026-09-22'), {status: 'not-monday'});
  assert.throws(() => H.weekSheet('2026-9-21'), RangeError);
});

test('weekSheet lists the week\'s headline events with weekday and sign', () => {
  const s = H.weekSheet('2026-09-21');
  assert.equal(s.from, '2026-09-21');
  assert.equal(s.to, '2026-09-28');
  // Published: Sun enters Libra Wed 2026-09-23; Full moon Sat 2026-09-26 in Aries. No Moon ingresses.
  assert.deepEqual(s.events, [
    {weekday: 'Wednesday', kind: 'ingress', body: 'Sun', detail: 'enters a new sign', sign: 'Libra'},
    {weekday: 'Saturday', kind: 'phase', body: 'Moon', detail: 'Full moon', sign: 'Aries'}
  ]);
});

test('weekSheet backdrop gives the Monday placements and the Moon\'s direction', () => {
  const s = H.weekSheet('2026-09-21');
  assert.equal(s.backdrop.moon, 'waxing');   // first quarter was 2026-09-18, full moon is 2026-09-26
  assert.deepEqual(s.backdrop.placements, [
    {body: 'Sun', sign: 'Virgo'}, {body: 'Mercury', sign: 'Libra'}, {body: 'Venus', sign: 'Scorpio'}, {body: 'Mars', sign: 'Cancer'}
  ]);
});

test('weekSheet gives each sign whole-sign houses, its ruler first, and no zodiac signs', () => {
  const s = H.weekSheet('2026-09-21');
  assert.equal(s.signs.length, 12);
  const by = name => s.signs.find(x => x.sign === name);
  // Aries: Virgo is its 6th, Libra its 7th, Scorpio its 8th, Cancer its 4th. Mars rules Aries.
  assert.deepEqual(by('Aries').backdrop.placements, [
    {body: 'Sun', sector: {house: 6, name: 'your daily-work-and-health sector'}, ruler: false},
    {body: 'Mercury', sector: {house: 7, name: 'your partnership sector'}, ruler: false},
    {body: 'Venus', sector: {house: 8, name: 'your shared-money-and-intimacy sector'}, ruler: false},
    {body: 'Mars', sector: {house: 4, name: 'your home sector at the base of your chart'}, ruler: true}
  ]);
  // Neither event involves Mars, so the phase outranks the ingress.
  assert.deepEqual(by('Aries').events.map(e => [e.weekday, e.sector.house, e.rulerInvolved]), [['Saturday', 1, false], ['Wednesday', 7, false]]);
  // Leo is ruled by the Sun: the Sun's ingress comes first. Libra is Leo's 3rd, Aries its 9th.
  assert.deepEqual(by('Leo').events.map(e => [e.body, e.sector.house, e.rulerInvolved]), [['Sun', 3, true], ['Moon', 9, false]]);
  // Cancer is ruled by the Moon: the Full moon comes first.
  assert.equal(by('Cancer').events[0].body, 'Moon');
  assert.equal(by('Cancer').events[0].rulerInvolved, true);
  // Jupiter rules Sagittarius and is in Leo, its 9th; Saturn rules Capricorn and is in Aries, its 4th.
  assert.deepEqual(by('Sagittarius').backdrop.placements.at(-1), {body: 'Jupiter', sector: {house: 9, name: 'your travel-and-belief sector'}, ruler: true});
  assert.deepEqual(by('Capricorn').backdrop.placements.at(-1), {body: 'Saturn', sector: {house: 4, name: 'your home sector at the base of your chart'}, ruler: true});
  for (const sg of s.signs) {
    for (const e of sg.events) assert.equal('sign' in e, false);
    for (const p of sg.backdrop.placements) assert.equal('sign' in p, false);
  }
});

test('weekSheet still returns a usable sheet for a week with no events', () => {
  const s = H.weekSheet('2026-11-02');
  assert.deepEqual(s.events, []);
  assert.equal(s.backdrop.placements.length, 4);
  for (const sg of s.signs) { assert.deepEqual(sg.events, []); assert.ok(sg.backdrop.placements.length >= 4); }
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/weekly-prose.test.cjs`
Expected: the five new tests FAIL with `H.weekSheet is not a function`; Task 1's two still PASS.

- [ ] **Step 3: Implement**

In `daily-horoscope-engine.js`, inside `factSheet`, delete the line

```js
    const sector = (bodyIndex, signIndex) => { const house = natal.mod(bodyIndex - signIndex, 12) + 1; return {house, name: sectorNames[house - 1]}; };
```

and add above `factSheet`, at module scope inside the IIFE:

```js
  const sector = (bodyIndex, signIndex) => { const house = natal.mod(bodyIndex - signIndex, 12) + 1; return {house, name: sectorNames[house - 1]}; };
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const KIND_RANK = {eclipse: 0, phase: 1, station: 2, ingress: 3};
  const PLACED = ['Sun', 'Mercury', 'Venus', 'Mars'];
```

Add after `factSheet`:

```js
  // The weekly fact sheet for the newsletter (tools/write_weekly_prose.cjs). Monday 00:00 UTC to
  // the next Monday. Headline events only: at this scale the Moon's aspects and sign changes are
  // noise. The backdrop is always present, because a quarter of all weeks hold one event or none.
  function weekSheet(monday) {
    skyFor(monday);   // validates the format and the 1901 to 2100 range, throws RangeError
    const from = new Date(`${monday}T00:00:00Z`);
    if (from.getUTCDay() !== 1) return {status: 'not-monday'};
    const to = new Date(+from + 7 * 86400000);
    const cal = typeof SkyCalendarEngine !== 'undefined' ? SkyCalendarEngine : require('./sky-calendar-engine.js');
    const classical = typeof ClassicalEngine !== 'undefined' ? ClassicalEngine : require('./classical-engine.js');
    const signIndexAt = (body, when) => natal.placement(cal.lonOf(body, new Date(when))).index;
    const raw = [
      ...cal.quarters(from, to).map(e => ({kind: 'phase', body: 'Moon', detail: e.name, signIndex: signIndexAt('Moon', e.date), date: e.date})),
      ...cal.ingresses(from, to, EVENT_BODIES).map(e => ({kind: 'ingress', body: e.body, detail: e.retrograde ? 'backs into the previous sign' : 'enters a new sign', signIndex: e.signIndex, date: e.date})),
      ...cal.stations(from, to).map(e => ({kind: 'station', body: e.body, detail: `turns ${e.direction}`, signIndex: natal.signNames.indexOf(e.sign), date: e.date})),
      ...cal.eclipses(from, to).map(e => ({kind: 'eclipse', body: e.body, detail: `${e.kind} ${e.body === 'Sun' ? 'solar' : 'lunar'} eclipse`, signIndex: signIndexAt(e.body, e.date), date: e.date}))
    ].sort((a, b) => a.date < b.date ? -1 : 1).map(e => ({...e, weekday: WEEKDAYS[new Date(e.date).getUTCDay()]}));
    const moon = astro.MoonPhase(from) < 180 ? 'waxing' : 'waning';
    const placedIndex = Object.fromEntries([...PLACED, 'Jupiter', 'Saturn'].map(b => [b, signIndexAt(b, from)]));
    const signs = natal.signNames.map((sign, i) => {
      const ruler = classical.rulers[i];
      const bodies = ruler === 'Jupiter' || ruler === 'Saturn' ? [...PLACED, ruler] : PLACED;
      const ranked = raw.map(e => ({weekday: e.weekday, kind: e.kind, body: e.body, detail: e.detail, sector: sector(e.signIndex, i), rulerInvolved: e.body === ruler, date: e.date}))
        .sort((a, b) => (b.rulerInvolved - a.rulerInvolved) || (KIND_RANK[a.kind] - KIND_RANK[b.kind]) || (a.date < b.date ? -1 : 1))
        .map(({date, ...e}) => e);
      return {sign, ruler, backdrop: {moon, placements: bodies.map(b => ({body: b, sector: sector(placedIndex[b], i), ruler: b === ruler}))}, events: ranked};
    });
    return {
      from: monday, to: to.toISOString().slice(0, 10),
      backdrop: {moon, placements: PLACED.map(b => ({body: b, sign: natal.signNames[placedIndex[b]]}))},
      events: raw.map(e => ({weekday: e.weekday, kind: e.kind, body: e.body, detail: e.detail, sign: natal.signNames[e.signIndex]})),
      signs
    };
  }
```

Change the engine's return line to include it:

```js
  return {calculate, factSheet, weekSheet, localDateKey, sectorNames, signNames:natal.signNames, signGlyphs:natal.signGlyphs};
```

`classical.rulers` must be exported by `classical-engine.js`; `factSheet` already reads it, so it is.

- [ ] **Step 4: Run the weekly and daily suites**

Run: `node --test tests/weekly-prose.test.cjs tests/daily-prose.test.cjs tests/daily-horoscope.test.cjs`
Expected: all PASS. The daily suites prove that moving `sector` changed nothing.

If a literal in Step 1 disagrees with the engine, stop and report it. Do not change a literal to match the engine: the literals come from a published ephemeris.

- [ ] **Step 5: Commit**

```bash
git add daily-horoscope-engine.js tests/weekly-prose.test.cjs
git commit -m "feat(horoscope): weekSheet, the weekly fact sheet for the newsletter"
```

---

### Task 3: Share the daily writer's checks and its model calls

**Files:**
- Modify: `tools/write_daily_prose.cjs` (`validate` lines 46-68, `complete` lines 120-131, `module.exports` line 173)
- Test: `tests/daily-prose.test.cjs` (unchanged; it is the regression guard), `tests/weekly-prose.test.cjs`

**Interfaces:**
- Produces, from `require('./write_daily_prose.cjs')`:
  - `commonProblems(text: string, allowedBodies: Set<string>, allowedSigns: Set<string>) -> string | null`: the reason the text may not be published, or null. Checks, in order: forbidden phrases, `will`, a planet not in `allowedBodies`, a sign not in `allowedSigns`, em dash, clock time, degree.
  - `servedAlias(endpoint) -> Promise<string>`
  - `complete(endpoint, model, messages, overrides = {}) -> Promise<string>`: `overrides` is merged over the default sampling parameters.

- [ ] **Step 1: Write the failing tests**

Append to `tests/weekly-prose.test.cjs`:

```js
const D = require('../tools/write_daily_prose.cjs');

test('commonProblems reports each shared rule and passes clean text', () => {
  const bodies = new Set(['Sun', 'Moon']), signs = new Set(['Aries']);
  assert.equal(D.commonProblems('The Sun warms Aries all week.', bodies, signs), null);
  assert.match(D.commonProblems('Good luck arrives.', bodies, signs), /forbidden phrase: luck/);
  assert.match(D.commonProblems('It will pass.', bodies, signs), /will/);
  assert.match(D.commonProblems('Venus smiles.', bodies, signs), /names Venus/);
  assert.match(D.commonProblems('The Sun enters Libra.', bodies, signs), /names Libra/);
  assert.equal(D.commonProblems('A pause \u2014 then go.', bodies, signs), 'em dash');
  assert.equal(D.commonProblems('Meet at 9:30.', bodies, signs), 'clock time');
  assert.equal(D.commonProblems('The Sun at 12 degrees.', bodies, signs), 'degree');
});

test('complete merges sampling overrides over its defaults', async () => {
  const original = globalThis.fetch;
  let sent;
  try {
    globalThis.fetch = async (url, init) => { sent = JSON.parse(init.body); return {ok: true, json: async () => ({choices: [{message: {content: ' ok '}}]})}; };
    assert.equal(await D.complete('http://x/v1', 'm', [{role: 'user', content: 'hi'}], {temperature: 0.2}), 'ok');
    assert.equal(sent.temperature, 0.2);
    assert.equal(sent.max_tokens, 2500);
    await D.complete('http://x/v1', 'm', []);
    assert.equal(sent.temperature, 1.0);
  } finally { globalThis.fetch = original; }
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/weekly-prose.test.cjs`
Expected: FAIL with `D.commonProblems is not a function` and `D.complete is not a function`.

- [ ] **Step 3: Implement**

In `tools/write_daily_prose.cjs`, add above `validate`:

```js
// The rules every published block shares, daily or weekly. null when clean, otherwise the reason.
function commonProblems(t, allowedBodies, allowedSigns) {
  const lower = t.toLowerCase();
  for (const f of FORBIDDEN) if (lower.includes(f)) return `forbidden phrase: ${f}`;
  if (/\bwill\b/i.test(t)) return 'uses "will"';
  for (const p of PLANETS) if (!allowedBodies.has(p) && new RegExp(`\\b${p}\\b`).test(t)) return `names ${p}, which is not in the sheet`;
  for (const s of engine.signNames) if (!allowedSigns.has(s) && new RegExp(`\\b${s}\\b`).test(t)) return `names ${s}`;
  if (t.includes('—')) return 'em dash';
  if (/\b\d{1,2}:\d{2}\b/.test(t)) return 'clock time';
  if (/\d\s*°|\b\d+\s*degrees?\b/i.test(t)) return 'degree';
  return null;
}
```

In `validate`, replace everything from `const lower = t.toLowerCase();` to the final `return null;` with:

```js
  const allowed = new Set(['Moon', ...sheet.aspects.map(a => a.planet), ...sheet.events.map(e => e.body)]);
  return commonProblems(t, allowed, new Set([sheet.sign]));
```

Change `complete`'s signature and body line:

```js
async function complete(endpoint, model, messages, overrides = {}) {
```
```js
    body: JSON.stringify({model, messages, temperature: 1.0, top_p: 0.95, top_k: 64, max_tokens: 2500, stream: false, ...overrides})
```

Change the exports line to:

```js
module.exports = {RULES, EXAMPLE, PLACES, validate, commonProblems, buildMessages, parseArgs, addDays, servedAlias, complete, main};
```

- [ ] **Step 4: Run the daily and weekly suites**

Run: `node --test tests/daily-prose.test.cjs tests/weekly-prose.test.cjs`
Expected: all PASS, including all 14 daily tests unmodified. If a daily test fails, the extraction changed behaviour: the order of checks inside `commonProblems` must be exactly the order the old `validate` used.

- [ ] **Step 5: Commit**

```bash
git add tools/write_daily_prose.cjs tests/weekly-prose.test.cjs
git commit -m "refactor(daily prose): export commonProblems, servedAlias and complete for the weekly tools"
```

---

### Task 4: Weekly briefs and validators

**Files:**
- Create: `tools/write_weekly_prose.cjs`
- Test: `tests/weekly-prose.test.cjs`

**Interfaces:**
- Consumes: `commonProblems` (Task 3), `engine.weekSheet`, `engine.sectorNames`, `engine.signNames` (Task 2).
- Produces, from `require('./write_weekly_prose.cjs')`:
  - `validateSign(text, sg) -> string|null`, `sg` one entry of `weekSheet().signs`
  - `validateOverview(text, sheet) -> string|null`, `sheet` the whole `weekSheet()` result
  - `validateSubjects(raw, sheet) -> string|null`, `raw` a JSON string `{subjects: [3], preview}`
  - `parseSubjects(raw) -> {subjects, preview} | null`
  - `signMessages(sg, sheet)`, `overviewMessages(sheet)`, `subjectsMessages(sheet, overview)` -> `[{role, content}]`
  - `EXAMPLE_SIGN`, `EXAMPLE_OVERVIEW`, `EXAMPLE_SUBJECTS`, `EXAMPLE_SHEET`, `EXAMPLE_SIGN_SHEET` (the facts the examples were written from)

- [ ] **Step 1: Write the failing tests**

Append to `tests/weekly-prose.test.cjs`:

```js
const W = require('../tools/write_weekly_prose.cjs');

test('each brief\'s example passes its own validator', () => {
  assert.equal(W.validateSign(W.EXAMPLE_SIGN, W.EXAMPLE_SIGN_SHEET), null);
  assert.equal(W.validateOverview(W.EXAMPLE_OVERVIEW, W.EXAMPLE_SHEET), null);
  assert.equal(W.validateSubjects(W.EXAMPLE_SUBJECTS, W.EXAMPLE_SHEET), null);
});

test('validateSign rejects each broken shape and fact', () => {
  const sg = W.EXAMPLE_SIGN_SHEET, ok = W.EXAMPLE_SIGN, [p1, p2] = ok.split('\n\n');
  assert.match(W.validateSign(p1, sg), /two paragraphs/);
  assert.match(W.validateSign(`${p1}\n\n${p2}\n\n${p2}`, sg), /two paragraphs/);
  assert.match(W.validateSign('Short.\n\nToo short.', sg), /words/);
  assert.match(W.validateSign(`${ok} ${ok}`.replace('\n\n', ' '), sg), /words/);
  assert.match(W.validateSign(ok.replace(/\.$/, ''), sg), /full sentence/);
  assert.match(W.validateSign(ok.replaceAll(sg.backdrop.placements[0].sector.name, 'one corner').replaceAll(sg.events[0].sector.name, 'another corner'), sg), /no sector/);
  assert.match(W.validateSign(ok.replaceAll('Thursday', 'one day').replaceAll('Sunday', 'another day'), sg), /no weekday/);
  assert.match(W.validateSign(ok.replace('Two days matter most.', 'Jupiter matters most.'), sg), /names Jupiter/);
  assert.match(W.validateSign(ok.replace('Keep Sunday small', 'Sunday will be small'), sg), /will/);
});

test('validateSign asks for no weekday when the sign has no events', () => {
  const quiet = {...W.EXAMPLE_SIGN_SHEET, events: []};
  const text = W.EXAMPLE_SIGN.replaceAll('Thursday', 'one day').replaceAll('Sunday', 'another day');
  assert.equal(W.validateSign(text, quiet), null);
});

test('validateOverview needs two of the week\'s events, no sector name, and only the sheet\'s signs', () => {
  const sheet = W.EXAMPLE_SHEET, ok = W.EXAMPLE_OVERVIEW;
  // Venus's event is matched by its wording or by "Venus" plus "Thursday"; take both away.
  assert.match(W.validateOverview(ok.replace('enters a new sign, moving into Libra', 'changes').replaceAll('Thursday', 'midweek'), sheet), /names 1 of the week's events/);
  assert.match(W.validateOverview(ok.replace('in its drawer', 'in your partnership sector'), sheet), /names a sector/);
  assert.match(W.validateOverview(ok.replace('in its drawer', 'in Gemini'), sheet), /names Gemini/);
  assert.equal(W.validateOverview(ok.replace('On Thursday Venus enters a new sign, moving into Libra', 'Midweek the mood lifts').replace('the New moon arrives in Virgo', 'a fresh start arrives'), {...sheet, events: []}), null);
});

test('validateSubjects checks the JSON, the three lines and the preview', () => {
  const sheet = W.EXAMPLE_SHEET, good = JSON.parse(W.EXAMPLE_SUBJECTS);
  const v = o => W.validateSubjects(JSON.stringify(o), sheet);
  const fence = '`'.repeat(3);   // models often wrap JSON in a code fence
  assert.equal(W.validateSubjects(`${fence}json\n${W.EXAMPLE_SUBJECTS}\n${fence}`, sheet), null);
  assert.equal(W.validateSubjects('not json', sheet), 'not JSON');
  assert.match(v({...good, subjects: good.subjects.slice(0, 2)}), /subjects: \[3\]/);
  assert.match(v({...good, subjects: ['Too short', good.subjects[1], good.subjects[2]]}), /characters/);
  assert.match(v({...good, subjects: ['A steady week with one clear turning point!', good.subjects[1], good.subjects[2]]}), /exclamation/);
  assert.match(v({...good, subjects: ['A STEADY week with one clear turning point', good.subjects[1], good.subjects[2]]}), /all-caps/);
  assert.match(v({...good, subjects: ['A steady week for Taurus and everyone else', good.subjects[1], good.subjects[2]]}), /names Taurus/);
  assert.match(v({...good, subjects: ['A steady week with one turning point \u{1F319}', good.subjects[1], good.subjects[2]]}), /emoji/);
  assert.match(v({...good, subjects: [good.subjects[0], good.subjects[0].toUpperCase().toLowerCase(), good.subjects[2]]}), /distinct/);
  assert.match(v({...good, preview: 'Too short.'}), /preview is/);
});

test('the sign brief carries the facts as JSON and withholds zodiac signs', () => {
  const sheet = H.weekSheet('2026-09-21'), sg = sheet.signs[0];
  const [system, user] = W.signMessages(sg, sheet);
  assert.equal(system.role, 'system');
  assert.match(user.content, /^Fact sheet for Aries, week of 2026-09-21:/);
  const facts = JSON.parse(user.content.slice(user.content.indexOf('{'), user.content.lastIndexOf('}') + 1));
  assert.equal(facts.moon, 'waxing');
  assert.equal(facts.placements[3].sector, 'your home sector at the base of your chart');
  assert.equal(facts.placements[3].ruler, true);
  assert.equal(facts.events[0].weekday, 'Saturday');
  assert.doesNotMatch(user.content, /Virgo|Libra|Scorpio/);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/weekly-prose.test.cjs`
Expected: FAIL with `Cannot find module '../tools/write_weekly_prose.cjs'`.

- [ ] **Step 3: Implement**

Create `tools/write_weekly_prose.cjs`:

```js
#!/usr/bin/env node
/* Writes the newsletter's weekly issue text with the local Muse Glimmer model: twelve sign
   readings, one overview, three subject lines and a preview. Design:
   docs/superpowers/specs/2026-09-18-newsletter-weekly-reading-design.md.
     node tools/write_weekly_prose.cjs [--week YYYY-MM-DD] [--force]
        [--endpoint http://127.0.0.1:8088/v1] [--model muse-glimmer-30b-local] [--out output/weekly-prose]
   --week must be a Monday; the default is the next Monday on or after today (UTC). Nothing is
   pushed anywhere: piece 3 reads the file from this machine. tools/proof_weekly_prose.cjs
   proofreads it afterwards under Qwen. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../daily-horoscope-engine.js');
const {commonProblems, addDays, servedAlias, complete} = require('./write_daily_prose.cjs');

const SN = engine.sectorNames;

// The briefs ask for a little more than the validators' floor: Glimmer lands about a tenth under
// the figure it is given (measured on the daily writer, 2026-09-18).
const RULES_SIGN = `You write one sign's weekly reading for an email newsletter called Ishtar Insights. Reasoning strength: low.

You are given a fact sheet for the coming week, Monday to Sunday: whether the Moon is waxing or waning as the week opens; the sector of the reader's chart that the Sun, Mercury, Venus and Mars occupy all week (and the reader's ruling planet, marked ruler); and the week's events, each with its weekday and the sector it falls in. Write only from these facts. Invent nothing about the sky.

Length and layout: 170 to 200 words in the second person and the present tense, as exactly two paragraphs separated by one blank line. No line breaks inside a paragraph.

Paragraph one, the shape of the week, 85 to 100 words: open with one plain sentence on what the week is for. Then say where the Sun is for this reader, using the sector name exactly as given, and what that puts first; use one other placement if it helps, and call a planet marked ruler "your ruling planet". Say whether the Moon is waxing or waning and what that suits: a waxing Moon suits building and adding, a waning Moon suits finishing and clearing. Close on one concrete thing to do early in the week.

Paragraph two, the days that matter, 85 to 100 words: take the one or two most important events, name the weekday and the sector exactly as given, and say in practical terms what each day is good for. An event marked rulerInvolved matters most. If there are no events, say the week has no sharp turns and give the second paragraph to how to use a steady week. End with one short imperative sentence.

Rules: plain, warm, dry, specific. Short and medium sentences. Present tense throughout, with no future tense anywhere. Use each sector name exactly as given, once; after that say the area of life in ordinary words. Name no zodiac sign except the reader's own. Name no planet or event that is not in the fact sheet. No clock times, degrees or dates; weekdays only. No predictions, promises or guarantees. No medical, legal or financial advice. No dashes used as punctuation, no headings, lists, emoji or quotation marks. Output the two paragraphs only.`;

const EXAMPLE_SIGN_SHEET = {
  sign: 'Taurus', ruler: 'Venus',
  backdrop: {moon: 'waning', placements: [
    {body: 'Sun', sector: {house: 5, name: SN[4]}, ruler: false}, {body: 'Mercury', sector: {house: 6, name: SN[5]}, ruler: false},
    {body: 'Venus', sector: {house: 5, name: SN[4]}, ruler: true}, {body: 'Mars', sector: {house: 3, name: SN[2]}, ruler: false}]},
  events: [
    {weekday: 'Thursday', kind: 'ingress', body: 'Venus', detail: 'enters a new sign', sector: {house: 6, name: SN[5]}, rulerInvolved: true},
    {weekday: 'Sunday', kind: 'phase', body: 'Moon', detail: 'New moon', sector: {house: 5, name: SN[4]}, rulerInvolved: false}]
};

const EXAMPLE_SIGN = `This is a week for finishing the enjoyable thing you started and then putting your days in better order. The Sun spends all seven days in ${SN[4]}, so what you make for pleasure counts for more than what you owe, and the Moon is waning as the week opens, which suits completing over beginning. Pick the half-done project that still makes you smile, the song, the garden bed, the letter to someone you like, and give it the first three evenings. It is lighter on Monday than it is by the weekend.

Two days matter most. On Thursday Venus, your ruling planet, enters ${SN[5]}, and the ordinary machinery of the week starts to feel kinder: a colleague is easier to ask, a routine is easier to change, and the body answers well to small, regular care. On Sunday the New moon falls in ${SN[4]}, a clean line under what you finished and a quiet place to begin the next thing. Keep Thursday for one practical change to how your days run. Keep Sunday small, and start something only because you want to.`;

const RULES_OVERVIEW = `You write the opening section of a weekly email newsletter called Ishtar Insights, read by people of every zodiac sign. Reasoning strength: low.

You are given the coming week's facts, Monday to Sunday: whether the Moon is waxing or waning as the week opens, the zodiac sign the Sun, Mercury, Venus and Mars are in, and the week's events, each with its weekday and zodiac sign. Write only from these facts. Invent nothing about the sky.

Length and layout: 140 to 170 words, second person, present tense, exactly two paragraphs separated by one blank line. No line breaks inside a paragraph.

Paragraph one: one plain sentence on the character of the week, then the Sun's sign and the Moon's direction and what the early days suit. Paragraph two: the week's events in order, each with its weekday, said the way the fact sheet says it, and what that day is good for. With fewer than two events, say the week is steady and how to use that. End with one short imperative sentence.

Rules: plain, warm, dry, specific. Present tense throughout, with no future tense anywhere. This section is for every sign, so say nothing about houses or sectors of a chart. Name only the zodiac signs and planets in the fact sheet. No clock times, degrees or dates; weekdays only. No predictions, promises or guarantees. No medical, legal or financial advice. No dashes used as punctuation, no headings, lists, emoji or quotation marks. Output the two paragraphs only.`;

const EXAMPLE_SHEET = {
  from: '2026-09-07', to: '2026-09-14',
  backdrop: {moon: 'waning', placements: [{body: 'Sun', sign: 'Virgo'}, {body: 'Mercury', sign: 'Virgo'}, {body: 'Venus', sign: 'Virgo'}, {body: 'Mars', sign: 'Cancer'}]},
  events: [
    {weekday: 'Thursday', kind: 'ingress', body: 'Venus', detail: 'enters a new sign', sign: 'Libra'},
    {weekday: 'Sunday', kind: 'phase', body: 'Moon', detail: 'New moon', sign: 'Virgo'}]
};

const EXAMPLE_OVERVIEW = `The week turns on its weekend. The Sun is in Virgo as Monday opens and the Moon is waning, so the first days suit tidying: finish what is already on the table, send the overdue reply, and leave the grand new scheme in its drawer for now. Nothing in the sky pushes hard before Thursday, and a quiet start is a gift if you use it to clear ground.

On Thursday Venus enters a new sign, moving into Libra, and the tone between people softens; conversations that stalled last week move again, and a small courtesy goes further than an argument. Then on Sunday the New moon arrives in Virgo, the cleanest starting line of the month. Choose one thing to begin, make it modest and practical, and write it down where you can see it. Keep the plan small enough to start the same day.`;

const RULES_SUBJECTS = `You write subject lines for a weekly email newsletter called Ishtar Insights. Reasoning strength: low.

You are given the coming week's facts and the newsletter's opening section. Reply with one JSON object and nothing else: {"subjects": [three strings], "preview": string}.

Each subject is one line of 30 to 55 characters that says what the week is like or what to do with it, in plain words, the way a friend would title an email. The three take different angles. The preview is one sentence of 50 to 100 characters that adds to the subject instead of repeating it.

Rules: sentence case. Present tense, with no future tense. The email goes to readers of every sign, so name no zodiac sign in a subject; the preview may name a sign from the fact sheet. Name only planets from the fact sheet. No exclamation marks, no words in capitals, no emoji, no quotation marks inside the strings, no dashes used as punctuation, no promises.`;

const EXAMPLE_SUBJECTS = JSON.stringify({
  subjects: ['A quiet start, then Venus changes the mood', "Clear the desk before Sunday's New moon", 'This week: finish first, begin on Sunday'],
  preview: 'The Sun in Virgo, a waning Moon, and one good day to ask a favour.'
});

function twoParagraphs(text, min, max) {
  if (typeof text !== 'string') return 'not a string';
  const t = text.trim(), blocks = t.split(/\n[ \t]*\n/);
  if (blocks.length !== 2 || blocks.some(b => /\n/.test(b))) return 'not exactly two paragraphs separated by a blank line';
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < min || words > max) return `${words} words`;
  if (!/[.!?]$/.test(t)) return 'does not end in a full sentence';
  return null;
}

// Each validator returns null when the block may be published, otherwise the reason it may not.
function validateSign(text, sg) {
  const shape = twoParagraphs(text, 120, 230);
  if (shape) return shape;
  const t = text.trim();
  const sectors = [...sg.backdrop.placements.map(p => p.sector.name), ...sg.events.map(e => e.sector.name)];
  if (!sectors.some(n => t.includes(n))) return 'names no sector from the sheet';
  if (sg.events.length && !sg.events.some(e => t.includes(e.weekday))) return 'names no weekday from the sheet';
  const bodies = new Set(['Moon', ...sg.backdrop.placements.map(p => p.body), ...sg.events.map(e => e.body)]);
  return commonProblems(t, bodies, new Set([sg.sign]));
}

const sheetBodies = sheet => new Set(['Moon', ...sheet.backdrop.placements.map(p => p.body), ...sheet.events.map(e => e.body)]);
const sheetSigns = sheet => new Set([...sheet.backdrop.placements.map(p => p.sign), ...sheet.events.map(e => e.sign)]);

function validateOverview(text, sheet) {
  const shape = twoParagraphs(text, 120, 200);
  if (shape) return shape;
  const t = text.trim(), lower = t.toLowerCase();
  const named = sheet.events.filter(e => lower.includes(e.detail.toLowerCase()) || (t.includes(e.body) && t.includes(e.weekday))).length;
  const need = Math.min(2, sheet.events.length);
  if (named < need) return `names ${named} of the week's events, needs ${need}`;
  // sectorNames[0] is "your sign", which an overview may say.
  for (const n of SN.slice(1)) if (t.includes(n)) return `names a sector: ${n}`;
  return commonProblems(t, sheetBodies(sheet), sheetSigns(sheet));
}

// Models often wrap JSON in a code fence.
const unfence = raw => String(raw).trim().replace(/^`{3}(?:json)?\s*|\s*`{3}$/g, '');

function parseSubjects(raw) {
  let o;
  try { o = JSON.parse(unfence(raw)); } catch { return null; }
  if (!o || !Array.isArray(o.subjects) || o.subjects.length !== 3 || typeof o.preview !== 'string') return null;
  return {subjects: o.subjects, preview: o.preview};
}

function validateSubjects(raw, sheet) {
  try { JSON.parse(unfence(raw)); } catch { return 'not JSON'; }
  const o = parseSubjects(raw);
  if (!o) return 'not {subjects: [3], preview}';
  const bodies = sheetBodies(sheet);
  for (const s of o.subjects) {
    if (typeof s !== 'string' || /\n/.test(s)) return 'subject is not one line';
    if (s.length < 25 || s.length > 60) return `subject is ${s.length} characters`;
    if (/\p{Extended_Pictographic}/u.test(s)) return 'emoji in subject';
    if (s.includes('!')) return 'exclamation mark in subject';
    if (/\b[A-Z]{3,}\b/.test(s)) return 'all-caps word in subject';
    const problem = commonProblems(s, bodies, new Set());
    if (problem) return `subject: ${problem}`;
  }
  if (new Set(o.subjects.map(s => s.toLowerCase())).size !== 3) return 'subjects are not distinct';
  if (/\n/.test(o.preview) || o.preview.length < 40 || o.preview.length > 110) return `preview is ${o.preview.length} characters`;
  const problem = commonProblems(o.preview, bodies, sheetSigns(sheet));
  return problem ? `preview: ${problem}` : null;
}

// Zodiac signs are withheld from a sign's facts: its rules ban every sign name but the reader's own.
function signMessages(sg, sheet) {
  const facts = {
    sign: sg.sign, ruler: sg.ruler, moon: sg.backdrop.moon,
    placements: sg.backdrop.placements.map(p => ({body: p.body, sector: p.sector.name, ruler: p.ruler})),
    events: sg.events.map(e => ({weekday: e.weekday, body: e.body, what: e.detail, sector: e.sector.name, rulerInvolved: e.rulerInvolved}))
  };
  return [
    {role: 'system', content: `${RULES_SIGN}\n\nExample of the shape, written for a different week and a different sign:\n${EXAMPLE_SIGN}`},
    {role: 'user', content: `Fact sheet for ${sg.sign}, week of ${sheet.from}:\n${JSON.stringify(facts, null, 1)}\n\nWrite the two paragraphs: the shape of the week, then the days that matter.`}
  ];
}

const sharedFacts = sheet => ({moon: sheet.backdrop.moon, placements: sheet.backdrop.placements,
  events: sheet.events.map(e => ({weekday: e.weekday, body: e.body, what: e.detail, sign: e.sign}))});

function overviewMessages(sheet) {
  return [
    {role: 'system', content: `${RULES_OVERVIEW}\n\nExample of the shape, written for a different week:\n${EXAMPLE_OVERVIEW}`},
    {role: 'user', content: `Week sheet, week of ${sheet.from}:\n${JSON.stringify(sharedFacts(sheet), null, 1)}\n\nWrite the two paragraphs.`}
  ];
}

function subjectsMessages(sheet, overview) {
  return [
    {role: 'system', content: `${RULES_SUBJECTS}\n\nExample of the shape, written for a different week:\n${EXAMPLE_SUBJECTS}`},
    {role: 'user', content: `Subject lines, week of ${sheet.from}:\n${JSON.stringify(sharedFacts(sheet), null, 1)}\n\nOpening section:\n${overview || '(not written yet)'}\n\nReply with the JSON object.`}
  ];
}

module.exports = {RULES_SIGN, RULES_OVERVIEW, RULES_SUBJECTS, EXAMPLE_SIGN, EXAMPLE_OVERVIEW, EXAMPLE_SUBJECTS, EXAMPLE_SHEET, EXAMPLE_SIGN_SHEET,
  validateSign, validateOverview, validateSubjects, parseSubjects, signMessages, overviewMessages, subjectsMessages};
```

The three example texts and their sheets were checked against these validators before this plan was written (188 words, 146 words, subject lengths 42, 39 and 40, preview 66). If the first test fails, the validator was mistyped, not the example.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/weekly-prose.test.cjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/write_weekly_prose.cjs tests/weekly-prose.test.cjs
git commit -m "feat(weekly prose): briefs, examples and validators for sign, overview and subjects"
```

---

### Task 5: The weekly writer's CLI, retries, gap-filling and exit codes

**Files:**
- Modify: `tools/write_weekly_prose.cjs`
- Modify: `.gitignore` (after the `output/daily-prose/` line)
- Test: `tests/weekly-prose.test.cjs`

**Interfaces:**
- Consumes: everything Task 4 produced; `servedAlias`, `complete`, `addDays` (Task 3).
- Produces:
  - `parseArgs(argv, today = <UTC today>) -> {week, force, endpoint, model, out}`; throws on an unknown argument
  - `nextMonday(today: 'YYYY-MM-DD') -> 'YYYY-MM-DD'` (today itself when it is a Monday)
  - `main(argv) -> Promise<number>`: the exit code. 0 = at least ten signs and the overview written; 1 = `--week` is not a Monday; 2 = wrong served model; 3 = a weak week. It never calls `process.exit`.
  - The file `<out>/<week>.json`: `{week, generated, model, overview: string, signs: {aries: string, …}, subjects: string[], preview: string}` plus any `proof`, `originals`, `rejected` already in the file (dropped by `--force`).

- [ ] **Step 1: Write the failing tests**

Append to `tests/weekly-prose.test.cjs`:

```js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('nextMonday and parseArgs', () => {
  assert.equal(W.nextMonday('2026-09-21'), '2026-09-21');   // a Monday
  assert.equal(W.nextMonday('2026-09-20'), '2026-09-21');   // a Sunday
  assert.equal(W.nextMonday('2026-09-22'), '2026-09-28');   // a Tuesday
  assert.equal(W.parseArgs([], '2026-09-19').week, '2026-09-21');
  const o = W.parseArgs(['--week', '2026-11-02', '--force', '--out', 'x'], '2026-09-19');
  assert.deepEqual([o.week, o.force, o.out, o.model], ['2026-11-02', true, 'x', 'muse-glimmer-30b-local']);
  assert.throws(() => W.parseArgs(['--push']), /unknown argument/);
});

// A stand-in for Glimmer: reads the facts out of the request and answers with a block that the
// validators accept. `fail` names blocks to answer badly ('Aries', 'overview', 'subjects').
const FILLER = 'Keep the pace even, finish one thing before starting the next, and let the small jobs stay small. ';
function fakeGlimmer({alias = 'muse-glimmer-30b-local', fail = [], calls = []} = {}) {
  return async (url, init) => {
    if (url.includes('/props')) return {ok: true, json: async () => ({model_alias: alias})};
    const user = JSON.parse(init.body).messages.find(m => m.role === 'user').content;
    const facts = JSON.parse(user.slice(user.indexOf('{'), user.lastIndexOf('}') + 1));
    let label, content;
    if (user.startsWith('Fact sheet for')) {
      label = user.match(/^Fact sheet for (\w+)/)[1];
      const day = facts.events[0] ? `On ${facts.events[0].weekday} the sky marks a turn. ` : '';
      content = `The week asks for steady hands. The Sun spends the week in ${facts.placements[0].sector}, and the Moon is ${facts.moon} as it opens. ${FILLER.repeat(3)}\n\n${day}${FILLER.repeat(3)}Rest when the work is done.`;
    } else if (user.startsWith('Week sheet')) {
      label = 'overview';
      content = `The week keeps an even keel. The Moon is ${facts.moon} as it opens. ${FILLER.repeat(3)}\n\n${facts.events.map(e => `On ${e.weekday} the ${e.body} ${e.what}.`).join(' ')} ${FILLER.repeat(3)}Rest when the work is done.`;
    } else {
      label = 'subjects';
      content = JSON.stringify({subjects: ['A steady week with one clear turning point', 'Finish first, then begin: the week ahead', 'Your week: even pace and a weekend shift'],
        preview: 'An even start, a turn at the weekend, and one thing worth finishing.'});
    }
    calls.push(label);
    if (fail.includes(label)) content = 'It will be fine.';
    return {ok: true, json: async () => ({choices: [{message: {content}}]})};
  };
}

async function withFake(options, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-prose-')), original = globalThis.fetch;
  try { globalThis.fetch = fakeGlimmer(options); return await run(dir); }
  finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
}
const read = (dir, week) => JSON.parse(fs.readFileSync(path.join(dir, `${week}.json`), 'utf8'));

test('the writer writes the contract file and returns 0', async () => {
  await withFake({}, async dir => {
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 0);
    const f = read(dir, '2026-09-21');
    assert.deepEqual([f.week, f.model], ['2026-09-21', 'muse-glimmer-30b-local']);
    assert.equal(Object.keys(f.signs).length, 12);
    assert.ok(f.signs.aries.includes('your daily-work-and-health sector'));
    assert.ok(f.overview.includes('Full moon'));
    assert.equal(f.subjects.length, 3);
    assert.ok(f.preview.length >= 40);
  });
});

test('a week with no events still writes twelve signs', async () => {
  await withFake({}, async dir => {
    assert.equal(await W.main(['--week', '2026-11-02', '--out', dir]), 0);
    assert.equal(Object.keys(read(dir, '2026-11-02').signs).length, 12);
  });
});

test('a block that fails three times is left out, and a re-run fills only the gaps', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-prose-')), original = globalThis.fetch;
  try {
    const first = [];
    globalThis.fetch = fakeGlimmer({fail: ['Aries', 'subjects'], calls: first});
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 0);   // 11 signs and the overview
    let f = read(dir, '2026-09-21');
    assert.equal('aries' in f.signs, false);
    assert.deepEqual([f.subjects, f.preview], [[], '']);
    assert.equal(first.filter(l => l === 'Aries').length, 3);
    assert.equal(first.filter(l => l === 'subjects').length, 3);
    const taurus = f.signs.taurus;

    const second = [];
    globalThis.fetch = fakeGlimmer({calls: second});
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 0);
    f = read(dir, '2026-09-21');
    assert.deepEqual(second, ['Aries', 'subjects']);
    assert.equal(f.signs.taurus, taurus);
    assert.ok(f.signs.aries);
    assert.equal(f.subjects.length, 3);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
});

test('--force rewrites every block and drops the proof fields; a plain re-run keeps them', async () => {
  await withFake({}, async dir => {
    await W.main(['--week', '2026-09-21', '--out', dir]);
    const file = path.join(dir, '2026-09-21.json');
    fs.writeFileSync(file, JSON.stringify({...read(dir, '2026-09-21'), proof: {blocks: {}}, originals: {aries: 'x'}, rejected: {}}));
    await W.main(['--week', '2026-09-21', '--out', dir]);
    assert.deepEqual(read(dir, '2026-09-21').originals, {aries: 'x'});
    await W.main(['--week', '2026-09-21', '--out', dir, '--force']);
    assert.equal('proof' in read(dir, '2026-09-21'), false);
    assert.equal('originals' in read(dir, '2026-09-21'), false);
  });
});

test('exit codes: 1 for a non-Monday, 2 for the wrong model, 3 for a weak week', async () => {
  await withFake({}, async dir => assert.equal(await W.main(['--week', '2026-09-22', '--out', dir]), 1));
  await withFake({alias: 'qwen3.8-27b-local'}, async dir => {
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 2);
    assert.equal(fs.existsSync(path.join(dir, '2026-09-21.json')), false);
  });
  await withFake({fail: ['overview']}, async dir => {
    assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 3);
    assert.equal(read(dir, '2026-09-21').overview, '');
  });
  await withFake({fail: ['Aries', 'Taurus', 'Gemini']}, async dir => assert.equal(await W.main(['--week', '2026-09-21', '--out', dir]), 3));
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/weekly-prose.test.cjs`
Expected: the six new tests FAIL with `W.nextMonday is not a function` / `W.main is not a function`.

- [ ] **Step 3: Implement**

In `tools/write_weekly_prose.cjs`, add above `module.exports`:

```js
function nextMonday(today) {
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();   // 0 Sunday, 1 Monday
  return addDays(today, (8 - day) % 7);
}

function parseArgs(argv, today = new Date().toISOString().slice(0, 10)) {
  const o = {week: null, force: false, endpoint: 'http://127.0.0.1:8088/v1', model: 'muse-glimmer-30b-local', out: 'output/weekly-prose'};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (['--week', '--endpoint', '--model', '--out'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  o.week = o.week || nextMonday(today);
  return o;
}

// Three attempts at one block. A request that throws counts as an attempt, not an abort.
async function attempt(o, label, messages, check) {
  let reason = '';
  for (let n = 1; n <= 3; n++) {
    let candidate;
    try { candidate = await complete(o.endpoint, o.model, messages); }
    catch (error) { reason = `request failed: ${error.message}`; console.warn(`${o.week} ${label} attempt ${n}: ${reason}`); continue; }
    reason = check(candidate);
    if (!reason) return candidate;
    console.warn(`${o.week} ${label} attempt ${n}: ${reason}`);
  }
  console.error(`${o.week} ${label}: omitted after 3 attempts (${reason})`);
  return null;
}

async function main(argv) {
  const o = parseArgs(argv);
  const sheet = engine.weekSheet(o.week);
  if (sheet.status === 'not-monday') {
    const next = nextMonday(o.week);
    console.error(`${o.week} is not a Monday. Nearest: ${addDays(next, -7)} or ${next}.`);
    return 1;
  }
  const alias = await servedAlias(o.endpoint);
  if (alias !== o.model) { console.error(`Served model is "${alias}", not "${o.model}"; refusing to write.`); return 2; }
  fs.mkdirSync(o.out, {recursive: true});
  const file = path.join(o.out, `${o.week}.json`);
  // A block omitted after three attempts, or rejected by the proofreader, is a gap: a later run
  // keeps what the file has and writes only what it lacks.
  let kept = {};
  if (fs.existsSync(file) && !o.force) { try { kept = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch { kept = {}; } }

  const signs = {};
  for (const sg of sheet.signs) {
    const key = sg.sign.toLowerCase();
    if (typeof kept.signs?.[key] === 'string' && kept.signs[key]) { signs[key] = kept.signs[key]; continue; }
    const text = await attempt(o, sg.sign, signMessages(sg, sheet), c => validateSign(c, sg));
    if (text) signs[key] = text;
  }
  let overview = typeof kept.overview === 'string' ? kept.overview : '';
  if (!overview) overview = await attempt(o, 'overview', overviewMessages(sheet), c => validateOverview(c, sheet)) || '';
  let subjects = Array.isArray(kept.subjects) && kept.subjects.length === 3 ? kept.subjects : [], preview = subjects.length ? kept.preview : '';
  if (!subjects.length) {
    const parsed = parseSubjects(await attempt(o, 'subjects', subjectsMessages(sheet, overview), c => validateSubjects(c, sheet)) || '');
    if (parsed) ({subjects, preview} = parsed);
  }

  const {proof, originals, rejected} = kept;
  const out = {week: o.week, generated: new Date().toISOString(), model: o.model, overview, signs, subjects, preview,
    ...(proof && {proof}), ...(originals && {originals}), ...(rejected && {rejected})};
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  console.log(`${o.week}: ${Object.keys(signs).length}/12 signs, overview ${overview ? 'written' : 'missing'}, ${subjects.length} subjects`);
  return Object.keys(signs).length >= 10 && overview ? 0 : 3;
}
```

Extend the exports and add the entry point:

```js
module.exports = {RULES_SIGN, RULES_OVERVIEW, RULES_SUBJECTS, EXAMPLE_SIGN, EXAMPLE_OVERVIEW, EXAMPLE_SUBJECTS, EXAMPLE_SHEET, EXAMPLE_SIGN_SHEET,
  validateSign, validateOverview, validateSubjects, parseSubjects, signMessages, overviewMessages, subjectsMessages, nextMonday, parseArgs, main};
if (require.main === module) main(process.argv.slice(2)).then(code => process.exit(code), error => { console.error(error); process.exit(1); });
```

In `.gitignore`, add directly under the `output/daily-prose/` line:

```
output/weekly-prose/
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/weekly-prose.test.cjs`
Expected: all PASS. Then `git check-ignore output/weekly-prose/x.json` prints the path.

- [ ] **Step 5: Commit**

```bash
git add tools/write_weekly_prose.cjs tests/weekly-prose.test.cjs .gitignore
git commit -m "feat(weekly prose): the writer's CLI, retries, gap-filling and exit codes"
```

---

### Task 6: The Qwen proofreader

**Files:**
- Create: `tools/proof_weekly_prose.cjs`
- Test: `tests/weekly-proof.test.cjs` (create)

**Interfaces:**
- Consumes: `engine.weekSheet`; `validateSign`, `validateOverview`, `validateSubjects`, `parseSubjects` (Task 4); `servedAlias`, `complete` (Task 3); the file Task 5 writes.
- Produces, from `require('./proof_weekly_prose.cjs')`:
  - `wordEdits(a: string, b: string) -> number`: words to delete from `a` plus words to insert to reach `b`, by longest common subsequence
  - `parseVerdict(raw) -> {verdict: 'pass'|'fail', reason: string, corrected: string} | null`
  - `sha(text) -> hex sha256`
  - `main(argv) -> Promise<number>`: 0 = at least ten signs and the overview hold a current pass; 1 = no file for that week or not a Monday; 2 = wrong served model; 3 = otherwise
  - In the file: `proof: {model, checked, blocks: {<key>: {verdict, reason, edited, sha}}}`, `originals: {<key>: string}`, `rejected: {<key>: {text, reason}}`. Keys are the lowercase sign names, `overview` and `subjects`. The text of `subjects` is `JSON.stringify({subjects, preview})`.

- [ ] **Step 1: Write the failing tests**

Create `tests/weekly-proof.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const P = require('../tools/proof_weekly_prose.cjs');
const W = require('../tools/write_weekly_prose.cjs');

test('wordEdits counts deleted plus inserted words', () => {
  assert.equal(P.wordEdits('a b c d', 'a b c d'), 0);
  assert.equal(P.wordEdits('a b c d', 'a x c d'), 2);    // one word replaced
  assert.equal(P.wordEdits('a b c d', 'a b c d e'), 1);
  assert.equal(P.wordEdits('a b c d', 'd c b a'), 6);
});

test('parseVerdict accepts fenced or chatty JSON and rejects anything else', () => {
  assert.deepEqual(P.parseVerdict('{"verdict":"pass","reason":"","corrected":"x"}'), {verdict: 'pass', reason: '', corrected: 'x'});
  const fence = '`'.repeat(3);
  assert.deepEqual(P.parseVerdict(`Here you go:\n${fence}json\n{"verdict":"fail","reason":"wrong weekday"}\n${fence}`), {verdict: 'fail', reason: 'wrong weekday', corrected: ''});
  assert.equal(P.parseVerdict('{"verdict":"maybe"}'), null);
  assert.equal(P.parseVerdict('no json here'), null);
});

// A valid week file built from the writer's own examples, so every block passes its validator.
const WEEK = '2026-09-07';
function seed(dir, extra = {}) {
  const sub = JSON.parse(W.EXAMPLE_SUBJECTS);
  const file = {week: WEEK, generated: 'x', model: 'muse-glimmer-30b-local', overview: W.EXAMPLE_OVERVIEW,
    signs: {taurus: W.EXAMPLE_SIGN}, subjects: sub.subjects, preview: sub.preview, ...extra};
  fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(file));
}
const read = dir => JSON.parse(fs.readFileSync(path.join(dir, `${WEEK}.json`), 'utf8'));

// A stand-in for Qwen. `reply(key, text)` returns the raw string the model answers with.
function fakeQwen(reply, {alias = 'qwen3.8-27b-local', calls = []} = {}) {
  return async (url, init) => {
    if (url.includes('/props')) return {ok: true, json: async () => ({model_alias: alias})};
    const body = JSON.parse(init.body), user = body.messages.find(m => m.role === 'user').content;
    const key = user.match(/^Block: (\w+)/)[1], text = user.slice(user.indexOf('TEXT:\n') + 6);
    calls.push({key, temperature: body.temperature});
    return {ok: true, json: async () => ({choices: [{message: {content: reply(key, text)}}]})};
  };
}
async function run(reply, options, body, seedExtra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-proof-')), original = globalThis.fetch;
  try {
    seed(dir, seedExtra);
    // The engine's real sheet for that week differs from the examples' sheet, so hand the tool the
    // example sheets: main accepts a sheet override for tests through options.sheet.
    globalThis.fetch = fakeQwen(reply, options);
    return await body(dir);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
}
const SHEET = {...W.EXAMPLE_SHEET, signs: [W.EXAMPLE_SIGN_SHEET]};
const pass = () => JSON.stringify({verdict: 'pass', reason: '', corrected: ''});

test('a pass records the verdict and the sha of the text, at a low temperature', async () => {
  const calls = [];
  await run(pass, {calls}, async dir => {
    assert.equal(await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET}), 3);   // one sign is fewer than ten
    const f = read(dir);
    assert.deepEqual(Object.keys(f.proof.blocks).sort(), ['overview', 'subjects', 'taurus']);
    assert.deepEqual(f.proof.blocks.taurus, {verdict: 'pass', reason: '', edited: false, sha: P.sha(W.EXAMPLE_SIGN)});
    assert.equal(f.proof.model, 'qwen3.8-27b-local');
    assert.equal(calls[0].temperature, 0.2);
  });
});

test('a fail moves the text to rejected and out of the issue', async () => {
  const reply = key => key === 'taurus' ? JSON.stringify({verdict: 'fail', reason: 'says Friday, the sheet says Thursday'}) : pass();
  await run(reply, {}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    const f = read(dir);
    assert.equal('taurus' in f.signs, false);
    assert.deepEqual(f.rejected.taurus, {text: W.EXAMPLE_SIGN, reason: 'says Friday, the sheet says Thursday'});
    assert.equal(f.proof.blocks.taurus.verdict, 'fail');
  });
});

test('a small valid correction is applied and the original kept', async () => {
  const fixed = W.EXAMPLE_SIGN.replace('better order', 'good order');
  const reply = key => key === 'taurus' ? JSON.stringify({verdict: 'pass', reason: '', corrected: fixed}) : pass();
  await run(reply, {}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    const f = read(dir);
    assert.equal(f.signs.taurus, fixed);
    assert.equal(f.originals.taurus, W.EXAMPLE_SIGN);
    assert.deepEqual([f.proof.blocks.taurus.edited, f.proof.blocks.taurus.sha], [true, P.sha(fixed)]);
  });
});

test('a correction that rewrites too much, or breaks the validator, is discarded', async () => {
  const rewritten = W.EXAMPLE_SIGN.split(' ').map((w, i) => i % 5 === 0 ? 'indeed' : w).join(' ');   // about 20% of the words
  const broken = W.EXAMPLE_SIGN.replace('Keep Sunday small', 'Sunday will be small');               // two words, but uses "will"
  for (const corrected of [rewritten, broken]) {
    const reply = key => key === 'taurus' ? JSON.stringify({verdict: 'pass', reason: '', corrected}) : pass();
    await run(reply, {}, async dir => {
      await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
      const f = read(dir);
      assert.equal(f.signs.taurus, W.EXAMPLE_SIGN);
      assert.equal(f.originals?.taurus, undefined);
      assert.deepEqual([f.proof.blocks.taurus.verdict, f.proof.blocks.taurus.edited], ['pass', false]);
    });
  }
});

test('a block with a current pass is not sent again; a block whose text changed is', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-proof-')), original = globalThis.fetch;
  try {
    seed(dir);
    globalThis.fetch = fakeQwen(pass);
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    const calls = [];
    globalThis.fetch = fakeQwen(pass, {calls});
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.deepEqual(calls, []);
    const f = read(dir);
    f.overview = f.overview.replace('cleanest', 'clearest');
    fs.writeFileSync(path.join(dir, `${WEEK}.json`), JSON.stringify(f));
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.deepEqual(calls.map(c => c.key), ['overview']);
  } finally { globalThis.fetch = original; fs.rmSync(dir, {recursive: true}); }
});

test('a re-proofed pass clears an old rejection for that block', async () => {
  await run(pass, {}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.equal(read(dir).rejected?.taurus, undefined);
  }, {rejected: {taurus: {text: 'old', reason: 'old'}}});
});

test('unparsable replies use up three attempts and leave the block unproofed', async () => {
  const calls = [];
  const reply = key => key === 'overview' ? 'I think it is fine.' : pass();
  await run(reply, {calls}, async dir => {
    await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET});
    assert.equal(calls.filter(c => c.key === 'overview').length, 3);
    const f = read(dir);
    assert.equal('overview' in f.proof.blocks, false);
    assert.equal(f.overview, W.EXAMPLE_OVERVIEW);
  });
});

test('exit codes: 2 for the wrong model, 1 for a missing file', async () => {
  await run(pass, {alias: 'muse-glimmer-30b-local'}, async dir => {
    assert.equal(await P.main(['--week', WEEK, '--out', dir], {sheet: SHEET}), 2);
    assert.equal('proof' in read(dir), false);
  });
  await run(pass, {}, async dir => assert.equal(await P.main(['--week', '2026-09-14', '--out', dir], {sheet: SHEET}), 1));
});

test('ten passed signs and a passed overview return 0', async () => {
  const names = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn'];
  const sheet = {...W.EXAMPLE_SHEET, signs: names.map(n => ({...W.EXAMPLE_SIGN_SHEET, sign: n[0].toUpperCase() + n.slice(1)}))};
  await run(pass, {}, async dir => {
    assert.equal(await P.main(['--week', WEEK, '--out', dir], {sheet}), 0);
  }, {signs: Object.fromEntries(names.map(n => [n, W.EXAMPLE_SIGN]))});
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/weekly-proof.test.cjs`
Expected: FAIL with `Cannot find module '../tools/proof_weekly_prose.cjs'`.

- [ ] **Step 3: Implement**

Create `tools/proof_weekly_prose.cjs`:

```js
#!/usr/bin/env node
/* Proofreads the week's newsletter text with the second local model (Qwen): passes or fails each
   block against the facts it was written from, and applies small corrections. Design:
   docs/superpowers/specs/2026-09-18-newsletter-weekly-reading-design.md.
     node tools/proof_weekly_prose.cjs [--week YYYY-MM-DD]
        [--endpoint http://127.0.0.1:8088/v1] [--model qwen3.8-27b-local] [--out output/weekly-prose]
   Refuses to run unless the served model alias equals --model, so the writer never marks its own work. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const engine = require('../daily-horoscope-engine.js');
const {servedAlias, complete} = require('./write_daily_prose.cjs');
const {validateSign, validateOverview, validateSubjects, parseSubjects, nextMonday} = require('./write_weekly_prose.cjs');

const MAX_EDIT_SHARE = 0.08;   // of the original's word count

const JUDGE = `You are the proofreader for a weekly astrology newsletter. Another writer produced the TEXT from the FACTS. Reply with one JSON object and nothing else:
{"verdict": "pass" or "fail", "reason": string, "corrected": string}

Fail the text only for one of these, and name the sentence in "reason":
1. It states something about the sky that the FACTS do not contain or that contradicts them: a weekday, a planet, a sector, a sign, a direction or an event that differs from the FACTS.
2. It predicts, promises or guarantees an outcome.
3. It gives medical, legal or financial advice.
4. Its tone is fearful, fatalistic or threatening.
Everyday advice, scenes and examples are the writer's to invent and are not errors. A fact left out is not an error.

Otherwise the verdict is pass and "reason" is empty. In "corrected", return the full text with spelling, grammar and punctuation mistakes fixed and nothing else changed: the same sentences, the same words wherever they are correct, the same paragraph breaks. If there is nothing to fix, return an empty string. Never rephrase, shorten, lengthen or improve the style. When the verdict is fail, "corrected" is an empty string.`;

const sha = text => crypto.createHash('sha256').update(text).digest('hex');

// Words deleted from a plus words inserted to reach b, from the longest common subsequence.
function wordEdits(a, b) {
  const x = a.trim().split(/\s+/), y = b.trim().split(/\s+/);
  let prev = new Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const row = [0];
    for (let j = 1; j <= y.length; j++) row[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
    prev = row;
  }
  return x.length + y.length - 2 * prev[y.length];
}

function parseVerdict(raw) {
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  let o;
  try { o = JSON.parse(match[0]); } catch { return null; }
  if (!o || (o.verdict !== 'pass' && o.verdict !== 'fail')) return null;
  return {verdict: o.verdict, reason: typeof o.reason === 'string' ? o.reason : '', corrected: typeof o.corrected === 'string' ? o.corrected : ''};
}

// One block of the week file: its text, the facts it was written from, its validator, and how to
// put a text back or take it out.
function blocks(file, sheet) {
  const shared = {moon: sheet.backdrop.moon, placements: sheet.backdrop.placements, events: sheet.events};
  const out = [];
  for (const sg of sheet.signs) {
    const key = sg.sign.toLowerCase();
    out.push({key, text: file.signs?.[key] || '', facts: {sign: sg.sign, ruler: sg.ruler, backdrop: sg.backdrop, events: sg.events},
      check: t => validateSign(t, sg), set: t => { file.signs[key] = t; }, clear: () => { delete file.signs[key]; }});
  }
  out.push({key: 'overview', text: file.overview || '', facts: shared, check: t => validateOverview(t, sheet),
    set: t => { file.overview = t; }, clear: () => { file.overview = ''; }});
  out.push({key: 'subjects', text: file.subjects?.length === 3 ? JSON.stringify({subjects: file.subjects, preview: file.preview}) : '', facts: shared,
    check: t => validateSubjects(t, sheet), set: t => { Object.assign(file, parseSubjects(t)); }, clear: () => { file.subjects = []; file.preview = ''; }});
  return out.filter(b => b.text);
}

function parseArgs(argv, today = new Date().toISOString().slice(0, 10)) {
  const o = {week: null, endpoint: 'http://127.0.0.1:8088/v1', model: 'qwen3.8-27b-local', out: 'output/weekly-prose'};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--week', '--endpoint', '--model', '--out'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  o.week = o.week || nextMonday(today);
  return o;
}

// `options.sheet` lets a test supply the facts; the tool itself always computes them.
async function main(argv, options = {}) {
  const o = parseArgs(argv);
  const file = path.join(o.out, `${o.week}.json`);
  const sheet = options.sheet || engine.weekSheet(o.week);
  if (sheet.status === 'not-monday' || !fs.existsSync(file)) { console.error(`${o.week}: no week file at ${file}, or not a Monday.`); return 1; }
  const alias = await servedAlias(o.endpoint);
  if (alias !== o.model) { console.error(`Served model is "${alias}", not "${o.model}"; refusing to proofread.`); return 2; }
  const week = JSON.parse(fs.readFileSync(file, 'utf8'));
  week.signs = week.signs || {};
  week.proof = {model: o.model, checked: new Date().toISOString(), blocks: week.proof?.blocks || {}};

  for (const b of blocks(week, sheet)) {
    const had = week.proof.blocks[b.key];
    if (had && had.sha === sha(b.text)) continue;   // already judged, text unchanged
    delete week.proof.blocks[b.key];
    let verdict = null;
    for (let n = 1; n <= 3 && !verdict; n++) {
      try {
        verdict = parseVerdict(await complete(o.endpoint, o.model, [
          {role: 'system', content: JUDGE},
          {role: 'user', content: `Block: ${b.key}\nFACTS:\n${JSON.stringify(b.facts, null, 1)}\n\nTEXT:\n${b.text}`}
        ], {temperature: 0.2}));
        if (!verdict) console.warn(`${o.week} ${b.key} attempt ${n}: reply was not a verdict`);
      } catch (error) { console.warn(`${o.week} ${b.key} attempt ${n}: request failed: ${error.message}`); }
    }
    if (!verdict) { console.error(`${o.week} ${b.key}: no verdict after 3 attempts, left unproofed`); continue; }

    if (verdict.verdict === 'fail') {
      week.rejected = {...week.rejected, [b.key]: {text: b.text, reason: verdict.reason}};
      b.clear();
      week.proof.blocks[b.key] = {verdict: 'fail', reason: verdict.reason, edited: false, sha: sha(b.text)};
      console.warn(`${o.week} ${b.key}: FAIL (${verdict.reason})`);
      continue;
    }
    let text = b.text, edited = false;
    const fixed = verdict.corrected.trim();
    if (fixed && fixed !== b.text.trim()) {
      const problem = b.check(fixed), edits = wordEdits(b.text, fixed), limit = Math.ceil(b.text.trim().split(/\s+/).length * MAX_EDIT_SHARE);
      if (problem) console.warn(`${o.week} ${b.key}: correction discarded, it fails the validator (${problem})`);
      else if (edits > limit) console.warn(`${o.week} ${b.key}: correction discarded, ${edits} word edits is over the limit of ${limit}`);
      else { week.originals = {...week.originals, [b.key]: b.text}; b.set(fixed); text = fixed; edited = true; }
    }
    if (week.rejected) delete week.rejected[b.key];
    week.proof.blocks[b.key] = {verdict: 'pass', reason: '', edited, sha: sha(text)};
    console.log(`${o.week} ${b.key}: pass${edited ? ', corrected' : ''}`);
  }

  fs.writeFileSync(file, JSON.stringify(week, null, 1) + '\n');
  const current = blocks(week, sheet).filter(b => week.proof.blocks[b.key]?.verdict === 'pass' && week.proof.blocks[b.key].sha === sha(b.text)).map(b => b.key);
  const signsPassed = current.filter(k => k !== 'overview' && k !== 'subjects').length;
  console.log(`${o.week}: ${signsPassed} signs passed, overview ${current.includes('overview') ? 'passed' : 'not passed'}`);
  return signsPassed >= 10 && current.includes('overview') ? 0 : 3;
}

module.exports = {JUDGE, MAX_EDIT_SHARE, wordEdits, parseVerdict, sha, parseArgs, main};
if (require.main === module) main(process.argv.slice(2)).then(code => process.exit(code), error => { console.error(error); process.exit(1); });
```

Note for the subjects block: the text that is hashed is `JSON.stringify({subjects, preview})` of the file's current values, so after a correction the hash is taken from `text` (the corrected JSON string) and the next run recomputes the same string from the parsed values only if the key order is `subjects` then `preview`. `parseSubjects` returns them in that order and `Object.assign` keeps it; the "current pass is not sent again" test covers this.

- [ ] **Step 4: Run the proof tests and the whole JavaScript suite**

Run: `node --test tests/weekly-proof.test.cjs` then `node --test tests/*.test.cjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/proof_weekly_prose.cjs tests/weekly-proof.test.cjs
git commit -m "feat(weekly prose): Qwen proofreads each block, with guarded in-place corrections"
```

---

### Task 7: Live probes against both models

This task measures; it writes no product code unless a brief fails its threshold. It needs the GPU and takes about 40 minutes. It swaps the loaded model, so tell Glenn before starting and leave Qwen loaded at the end. Run it from the main session, not a subagent.

**Files:**
- Create: `docs/superpowers/plans/2026-09-18-newsletter-weekly-reading-probe.md` (the measurements)
- Possibly modify: `RULES_*` / `EXAMPLE_*` in `tools/write_weekly_prose.cjs`, `JUDGE` in `tools/proof_weekly_prose.cjs`

**Interfaces:**
- Consumes: both CLIs. Produces: recorded pass rates; briefs that meet the spec's thresholds.

- [ ] **Step 1: Load Glimmer and write three weeks into a scratch directory**

```powershell
& "$env:LOCALAPPDATA\hermes\llama-server\start.ps1" -Quant glimmer -Force -WaitForReady
cd V:\tarot_game
foreach ($w in '2026-09-21','2026-10-19','2026-11-02') { node tools\write_weekly_prose.cjs --week $w --out output\weekly-prose-probe *>> output\weekly-prose-probe.log; "rc=$LASTEXITCODE $w" }
```

The three weeks are a two-event week, a three-event week with no lunar quarter, and the empty week.

- [ ] **Step 2: Count first-attempt pass rates and rejection reasons per block kind**

From `output\weekly-prose-probe.log`, every `attempt N:` line is a rejection. For each of sign, overview and subjects report: blocks attempted, passed on the first attempt, omitted, and the reasons with counts. Threshold (spec): each kind passes at least two times in three on the first attempt. If a kind misses it, change that brief to state what is wanted (do not quote the banned phrase: project memory, "quoted negatives prime the model"), re-run that kind with `--force` on one week, and re-measure. Re-run `node --test tests/weekly-prose.test.cjs` after any brief change: the examples must still pass their validators.

- [ ] **Step 3: Read one full week against its sheet**

Print `node -e "console.log(JSON.stringify(require('./daily-horoscope-engine.js').weekSheet('2026-09-21'),null,1))"` and read all fourteen blocks of that week against it. List every sentence that states a sky fact and whether the sheet supports it. Check positions and counts stated in prose against the sheet (project memory, "check prose claims against the structure").

- [ ] **Step 4: Load Qwen and proof the clean weeks**

```powershell
& "$env:LOCALAPPDATA\hermes\llama-server\start.ps1" -Quant iq3s -Force -WaitForReady
foreach ($w in '2026-09-21','2026-10-19','2026-11-02') { node tools\proof_weekly_prose.cjs --week $w --out output\weekly-prose-probe *>> output\weekly-proof-probe.log; "rc=$LASTEXITCODE $w" }
```

Report the false-fail rate: blocks Qwen failed that Step 3 found sound. Report every correction applied and every correction discarded, with the reason.

- [ ] **Step 5: Seed six errors and measure the catch rate**

Copy `output\weekly-prose-probe\2026-09-21.json` to `output\weekly-prose-probe-seeded\2026-09-21.json`, delete its `proof`, `originals` and `rejected`, and edit six different sign readings by hand, one error each: a wrong weekday; a wrong sector name (another of the twelve); the event's planet swapped for a different planet that is in the placements; an added sentence "By Friday the money arrives, guaranteed."; an added sentence "Stop taking the tablets this week."; an added sentence "Nothing good can come of this week and there is no escaping it." Keep each edit inside the code validator's rules where possible so Qwen, not the validator, is what is being tested. Run the proofreader on that directory. Threshold (spec): at least five of six caught, and no more than one clean block in ten failed. If it misses, revise `JUDGE`, re-run, re-measure.

- [ ] **Step 6: Record and commit**

Write the numbers, the reasons, any brief changes and the final briefs' pass rates to `docs/superpowers/plans/2026-09-18-newsletter-weekly-reading-probe.md`. Delete the three scratch output paths. Confirm Qwen is loaded: `(Invoke-RestMethod http://127.0.0.1:8088/props).model_alias` prints `qwen3.8-27b-local`.

```bash
git add docs/superpowers/plans/2026-09-18-newsletter-weekly-reading-probe.md tools/write_weekly_prose.cjs tools/proof_weekly_prose.cjs
git commit -m "docs(weekly prose): live probe of the writer and the proofreader"
```

---

### Task 8: The Sunday job and the docs

**Files:**
- Create: `C:\Users\glenn\Scripts\weekly-prose.ps1`, `C:\Users\glenn\Scripts\weekly-prose-hidden.vbs` (outside the repo)
- Modify: `docs/NEWSLETTER.md`, `docs/DAILY-HOROSCOPE.md`

**Interfaces:**
- Consumes: both CLIs and their exit codes; `%LOCALAPPDATA%\hermes\llama-server\start.ps1 -Quant glimmer|iq3s -Force -WaitForReady`.
- Produces: scheduled task `Ishtar-Weekly-Prose`, Sundays 04:30 local; log at `C:\Users\glenn\Scripts\weekly-prose.log`.

- [ ] **Step 1: Write `C:\Users\glenn\Scripts\weekly-prose.ps1`**

```powershell
# Sundays: write next week's newsletter text with Muse Glimmer, then have Qwen proofread it.
# Launched by weekly-prose-hidden.vbs from the Ishtar-Weekly-Prose task; runs in Glenn's
# interactive session because the models are on N: and the repo on V:, both session mounts.
# Exit code: the proofreader's (0 = ten signs and the overview passed, 3 = a weak week),
# or the writer's when the writer could not run (1 or 2).
$ErrorActionPreference = 'Continue'
$log = Join-Path $env:USERPROFILE 'Scripts\weekly-prose.log'
$start = Join-Path $env:LOCALAPPDATA 'hermes\llama-server\start.ps1'
$rc = 1
$qwenLoaded = $false
"=== $(Get-Date -Format s) start" | Out-File $log -Append -Encoding utf8
try {
    if (-not (Test-Path 'N:\')) { throw 'N: is not mounted' }
    if (-not (Test-Path 'V:\tarot_game\tools\write_weekly_prose.cjs')) { throw 'V:\tarot_game is not reachable' }
    Set-Location 'V:\tarot_game'
    & $start -Quant glimmer -Force -WaitForReady *>> $log
    & node tools\write_weekly_prose.cjs *>> $log
    $rc = $LASTEXITCODE
    "writer rc=$rc" | Out-File $log -Append -Encoding utf8
    if ($rc -eq 0 -or $rc -eq 3) {
        & $start -Quant iq3s -Force -WaitForReady *>> $log
        $qwenLoaded = $true
        & node tools\proof_weekly_prose.cjs *>> $log
        $rc = $LASTEXITCODE
        "proofreader rc=$rc" | Out-File $log -Append -Encoding utf8
    }
} catch {
    "ERROR $_" | Out-File $log -Append -Encoding utf8
} finally {
    if (-not $qwenLoaded) { & $start -Quant iq3s -Force *>> $log }
    "=== $(Get-Date -Format s) end rc=$rc" | Out-File $log -Append -Encoding utf8
}
exit $rc
```

Both tools default `--week` to the next Monday on or after today, so on a Sunday they agree on tomorrow.

- [ ] **Step 2: Write `C:\Users\glenn\Scripts\weekly-prose-hidden.vbs`**

```vb
' Hidden launcher for the Ishtar-Weekly-Prose scheduled task. Same reason as
' daily-prose-hidden.vbs: Windows Terminal creates a console window at process creation for
' anything Task Scheduler launches into the interactive session, so the hide must happen here,
' in WScript.Shell.Run with window style 0. bWaitOnReturn stays True so the task shows as
' running (267009) and reports the script's exit code.
Set sh = CreateObject("WScript.Shell")
script = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\Scripts\weekly-prose.ps1"
cmd = """" & sh.ExpandEnvironmentStrings("%WINDIR%") & "\System32\WindowsPowerShell\v1.0\powershell.exe""" & _
      " -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & script & """"
rc = sh.Run(cmd, 0, True)
WScript.Quit rc
```

- [ ] **Step 3: Register the task and run it once**

```powershell
schtasks /Create /TN "Ishtar-Weekly-Prose" /TR "wscript.exe C:\Users\glenn\Scripts\weekly-prose-hidden.vbs" /SC WEEKLY /D SUN /ST 04:30 /F
schtasks /Run /TN "Ishtar-Weekly-Prose"
```

Wait for it to finish (`(Get-ScheduledTask Ishtar-Weekly-Prose | Get-ScheduledTaskInfo).LastTaskResult` leaves 267009), then check: no window appeared; `Scripts\weekly-prose.log` shows `writer rc=` and `proofreader rc=`; `output\weekly-prose\<next Monday>.json` exists with a `proof` block; `(Invoke-RestMethod http://127.0.0.1:8088/props).model_alias` is `qwen3.8-27b-local`. The nightly daily task runs at 03:30 and takes 30 to 45 minutes, so 04:30 does not overlap it.

- [ ] **Step 4: Document**

In `docs/NEWSLETTER.md`, add a section `## Weekly reading (piece 2)` covering: the two commands and their defaults; the file contract copied from the spec's "Output contract" section, including the rule that a block is fit to send only with a current `pass`; the exit codes of both tools; the scheduled task, its log and how to run it by hand; how to repair a weak week (load Glimmer, run the writer, which fills only the gaps, load Qwen, run the proofreader, which judges only the new text); and the probe's measured pass and catch rates with a link to the probe file. In `docs/DAILY-HOROSCOPE.md`, add one sentence where the validator is described: its forbidden-phrase, entity and typography checks are `commonProblems`, shared with the weekly tools.

- [ ] **Step 5: Run everything and commit**

Run: `node --test tests/*.test.cjs`
Expected: all PASS.

```bash
git add docs/NEWSLETTER.md docs/DAILY-HOROSCOPE.md
git commit -m "docs(newsletter): the weekly reading, its proofreader and the Sunday job"
```

---

## Self-Review

**Spec coverage.** `quarters` and the unchanged `monthEvents`: Task 1. `weekSheet` with events, ranking, withheld signs, backdrop with placements, the empty week, the Monday guard: Task 2. `commonProblems`, exported `servedAlias` and `complete` with overrides, the 14 daily tests untouched: Task 3. The three briefs, examples and validators with every limit in the spec's table: Task 4. CLI, three attempts, omission, gap-filling, `--force`, the contract file, exit codes 0/1/2/3, `.gitignore`: Task 5. The proofreader's gate, verdicts, sha-based re-proofing, the two correction guards, `originals`, `rejected`, three attempts, exit codes: Task 6. The writer probe, the strong-model read and the seeded-error judge probe with the spec's thresholds: Task 7. Scheduling with the model swaps and the wscript shim, and the documentation: Task 8. Out-of-scope items have no task.

**Placeholders.** None: every code step carries its code; Task 7 and Task 8's documentation step describe measurements and prose whose content cannot exist before the work is done, and say exactly what to record.

**Type consistency.** `weekSheet().signs` is an array with capitalised `sign`; the file's `signs` is an object with lowercase keys; both tools convert with `sg.sign.toLowerCase()`. Placements are `{body, sign}` in the shared backdrop and `{body, sector, ruler}` per sign; events are `{weekday, kind, body, detail, sign}` shared and `{weekday, kind, body, detail, sector, rulerInvolved}` per sign; Tasks 2, 4 and 6 use those names. `complete(endpoint, model, messages, overrides)` is used with three arguments by the writer and four by the proofreader. `main` returns a number in both tools and only the entry line calls `process.exit`. `nextMonday` is exported by the writer and imported by the proofreader.
