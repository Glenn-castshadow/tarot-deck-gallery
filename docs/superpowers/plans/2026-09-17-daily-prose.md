# Daily Prose Horoscope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every day, all twelve signs on `/sky/` get one paragraph of prose written by the local Muse Glimmer 30B model from a fact sheet the site's own engines compute, with the existing template reading as the fallback.

**Architecture:** GLENNHOMEPC computes a per-day fact sheet (Moon sector, exact Moon aspects with partner sectors, ingresses and stations), asks Glimmer on `127.0.0.1:8088` for one paragraph per sign, validates it, writes `output/daily-prose/<day>.json`, and pushes it to `/opt/tarot-game/daily/` on the VPS over ssh. Nginx serves that directory at `/sky/daily/`. The page fetches today's file once and renders the paragraph in place of the lens cards, or the unchanged template reading when there is none.

**Tech Stack:** Vanilla JS engines shared by browser and Node (vendored Astronomy Engine), `node --test`, llama.cpp's OpenAI-compatible chat endpoint, nginx, Windows Task Scheduler behind a wscript VBS shim.

**Spec:** `docs/superpowers/specs/2026-09-17-daily-prose-design.md`

## Global Constraints

Each line names its source, per Glenn's global rule on attributed constraints.

- Open source only (Glenn's global rule). Muse Glimmer 30B is Apache 2.0; llama.cpp is MIT. No new npm dependency; the writer uses Node's built-in `fetch`.
- No hosted API, no API key (Glenn, this session). The writer talks only to `http://127.0.0.1:8088/v1`.
- The paragraph replaces the lens cards; the dateline, Moon phase line and reflection question stay (Glenn accepted the recommendation).
- Copy never forecasts or promises: the forbidden list `['you will', 'will happen', 'is going to', 'the answer is', 'luck', 'fortune']` from `tests/sky-calendar-text.test.cjs`, plus a bare `will` (spec).
- No positions are fetched from a network service (`docs/SKY.md`). The page's one new request is a same-origin GET for finished copy.
- The generated files live in `/opt/tarot-game/daily/`, outside every release directory (spec, Claude's judgement).
- Task Scheduler wrappers use the wscript VBS shim, never `powershell.exe` directly (Glenn's global CLAUDE.md).
- The writer refuses to run unless `/props` reports `model_alias` equal to `muse-glimmer-30b-local` (spec).
- No Chiron; the vendored ephemeris has none (`docs/SKY.md`).
- Bump the `?v=` cache key of every changed runtime file (repository convention). Sampling for Glimmer: temperature 1.0, top_p 0.95, top_k 64, `max_tokens` 700, read only `message.content` (spec; the model emits `reasoning_content` first).
- Tests are written before the code and shown failing first (memory: fix-round tests need RED evidence).
- Run `node --test tests/*.test.cjs` before every commit; the suite must stay green. It currently passes 570 tests.

## File map

| File | Responsibility |
|---|---|
| `sky-calendar-engine.js` (modify) | `moonAspects(from, to, planets)`: every exact Moon aspect in a window. `lastAspectBefore` reuses it. |
| `daily-horoscope-engine.js` (modify) | `sectorNames` (12 original names) and `factSheet(day)`; Node-only lazy requires of the sky and classical engines. |
| `tools/write_daily_prose.cjs` (create) | The writer: style brief, `validate`, `buildMessages`, model guard, generation loop, JSON output, `--push`. |
| `tests/daily-prose.test.cjs` (create) | Engine and writer tests. |
| `tests/daily-horoscope.test.cjs` (modify) | Page tests: paragraph replaces lenses; 404 and timeout fall back byte-for-byte. |
| `daily-horoscope.js` (modify) | Fetch-once-per-day, single draw after settle, prose branch, disclosure sentence. |
| `sky/index.html` (modify) | Cache keys `daily-horoscope-engine.js?v=2`, `daily-horoscope.js?v=2`, `sky-calendar-engine.js?v=4`. |
| `.gitignore` (modify) | `output/daily-prose/` |
| `docs/DAILY-HOROSCOPE.md`, `docs/SKY.md`, `docs/deployment.md` (modify) | The prose layer, the copy note, the nginx location and release record. |
| `C:\Users\glenn\Scripts\daily-prose.ps1`, `daily-prose-hidden.vbs` (create, outside the repo) | The nightly run. |

---

### Task 1: `moonAspects` in the sky calendar engine

**Files:**
- Modify: `sky-calendar-engine.js:322-339` (`lastAspectBefore`) and the export list at `:576-580`
- Test: `tests/daily-prose.test.cjs` (create)

**Interfaces:**
- Consumes: private `lastAspectBefore(a, b, planets)`, `ASPECTS`, `lonOf`, `inRange`, `natal.delta`.
- Produces: `SkyCalendarEngine.moonAspects(from: Date|AstroTime, to: Date|AstroTime, planets: string[]) -> [{planet: string, aspect: 0|60|90|120|180, date: ISO string}]`, sorted by date, empty when either bound is outside 1901–2100.

- [ ] **Step 1: Write the failing test**

Create `tests/daily-prose.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../sky-calendar-engine.js');
const natal = require('../natal-engine.js');

test('moonAspects lists every exact Moon aspect in a window, sorted, and agrees with voidPeriods', () => {
  const from = new Date('2026-03-01T00:00:00Z'), to = new Date('2026-03-08T00:00:00Z');
  const hits = E.moonAspects(from, to, E.CLASSICAL_PLANETS);
  assert.ok(hits.length >= 10, `only ${hits.length} hits in a week`);
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i].date >= hits[i - 1].date, 'not sorted');
  for (const h of hits) {
    const t = new Date(h.date);
    assert.ok(t >= from && t < to, 'hit outside the window');
    const sep = natal.mod(E.lonOf('Moon', t) - E.lonOf(h.planet, t));
    const off = Math.min(Math.abs(sep - h.aspect), Math.abs(sep - (360 - h.aspect)));
    assert.ok(off < 0.01, `${h.planet} ${h.aspect} is ${off} degrees from exact`);
  }
  // Cross-check against existing code: the closing aspect of each void-of-course period
  // must be the last hit before that period's sign ingress.
  const periods = E.voidPeriods(from, to, E.CLASSICAL_PLANETS).filter(p => !p.clipped && p.lastAspect);
  assert.ok(periods.length >= 1);
  for (const p of periods) {
    const before = hits.filter(h => h.date < p.end);
    const last = before[before.length - 1];
    assert.ok(Math.abs(new Date(last.date) - new Date(p.start)) < 2000, `${p.sign}: ${last.date} vs ${p.start}`);
    assert.deepEqual({planet: last.planet, aspect: last.aspect}, p.lastAspect);
  }
});

test('moonAspects refuses out-of-range input with an empty list', () => {
  assert.deepEqual(E.moonAspects(new Date('1900-12-31T00:00:00Z'), new Date('1901-01-02T00:00:00Z'), E.CLASSICAL_PLANETS), []);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/daily-prose.test.cjs`
Expected: both tests FAIL with `TypeError: E.moonAspects is not a function`.

- [ ] **Step 3: Implement `moonAspects` and rebuild `lastAspectBefore` on it**

In `sky-calendar-engine.js`, replace the body of `lastAspectBefore` (keep its comment block above it) with:

```js
  // Unguarded core shared by moonAspects (public, range-checked) and lastAspectBefore
  // (private; its callers pad their windows and may step outside 1901-2100, see voidStateFor).
  function moonAspectsCore(a, b, planets) {
    const from = astro.MakeTime(a), to = astro.MakeTime(b);
    const out = [];
    for (const planet of planets) for (const aspect of ASPECTS) for (const sign of (aspect === 0 || aspect === 180 ? [1] : [1, -1])) {
      const g = t => natal.delta(lonOf('Moon', t) - lonOf(planet, t), sign * aspect);
      for (let s = from; s.ut < to.ut; s = s.AddDays(0.25)) {
        const e = s.AddDays(0.25).ut < to.ut ? s.AddDays(0.25) : to;
        const gs = g(s), ge = g(e);
        if (gs < 0 && ge >= 0 && ge - gs < 45) {
          const hit = astro.Search(g, s, e, {dt_tolerance_seconds: 1});
          if (hit) out.push({time: hit, planet, aspect});
        }
      }
    }
    return out.sort((x, y) => x.time.ut - y.time.ut);
  }

  function lastAspectBefore(a, b, planets) {
    const hits = moonAspectsCore(a, b, planets);
    return hits.length ? hits[hits.length - 1] : null;
  }

  // Every exact Ptolemaic aspect the Moon makes to any listed planet inside [from, to),
  // oldest first. Same search as the void-of-course code (see the comment above), exposed
  // for the daily prose fact sheet (docs/DAILY-HOROSCOPE.md).
  function moonAspects(from, to, planets) {
    if (!inRange(from) || !inRange(to)) return [];
    return moonAspectsCore(from, to, planets).map(h => ({planet: h.planet, aspect: h.aspect, date: h.time.date.toISOString()}));
  }
```

`inRange` requires a `Date`, so `moonAspects` takes Dates; `moonAspectsCore` accepts what `astro.MakeTime` accepts. Add `moonAspects` to the returned object after `voidBands`.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/daily-prose.test.cjs tests/sky-calendar.test.cjs`
Expected: all PASS (the void-of-course tests prove `lastAspectBefore` still behaves).

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add sky-calendar-engine.js tests/daily-prose.test.cjs
git commit -m "feat(sky): expose every exact Moon aspect in a window as moonAspects

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: sector names and `factSheet(day)` in the daily engine

**Files:**
- Modify: `daily-horoscope-engine.js` (after `questions`, and the export at `:72`)
- Test: `tests/daily-prose.test.cjs`

**Interfaces:**
- Consumes: `SkyCalendarEngine.moonAspects`, `.ingresses(from, to, bodies)` (`{body, sign, signIndex, date, retrograde}`), `.stations(from, to)` (`{body, direction, date, sign}`), `.lonOf`; `ClassicalEngine.rulers`; the module's own `skyFor`, `phases`, `natal.placement`, `natal.mod`.
- Produces: `DailyHoroscopeEngine.sectorNames: string[12]` and `DailyHoroscopeEngine.factSheet(day) ->`

```
{ day, instant,
  moon: {sign, phase, illumination},
  aspects: [{planet, aspect, name, planetSign, date}],
  events:  [{body, kind: 'ingress'|'station', detail, sign, signIndex, date}],
  signs: [{ sign, ruler, moonSector: {house, name},
            aspects: [{planet, name, planetSector: {house, name}, rulerInvolved}],
            events:  [{body, kind, detail, sector: {house, name}, rulerInvolved}] }] }
```

`detail` is one of `'enters a new sign'`, `'backs into the previous sign'`, `'turns retrograde'`, `'turns direct'`; it never contains a sign name, so the writer can pass it to the model as is.

- [ ] **Step 1: Write the failing tests**

Append to `tests/daily-prose.test.cjs`:

```js
const engine = require('../daily-horoscope-engine.js');
const classical = require('../classical-engine.js');
const astro = require('../vendor/astronomy-engine/astronomy.js');
const ASPECT_NAMES = {0: 'conjunction', 60: 'sextile', 90: 'square', 120: 'trine', 180: 'opposition'};

test('factSheet: twelve signs, wrapped sectors, classical rulers, partner sectors and ruler flags agree', () => {
  const s = engine.factSheet('2026-09-17');
  assert.equal(s.signs.length, 12);
  assert.equal(engine.sectorNames.length, 12);
  assert.equal(new Set(engine.sectorNames).size, 12);
  assert.equal(s.moon.sign, engine.calculate(0, '2026-09-17').points.find(p => p.name === 'Moon').sign);
  assert.equal(s.moon.phase, engine.calculate(0, '2026-09-17').phase);
  assert.equal(s.instant, '2026-09-17T12:00:00.000Z');
  for (const a of s.aspects) {
    assert.ok(a.date >= '2026-09-17T00:00:00' && a.date < '2026-09-18T00:00:00', a.date);
    assert.equal(a.name, ASPECT_NAMES[a.aspect]);
    assert.ok(['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(a.planet));
  }
  for (const [i, sg] of s.signs.entries()) {
    assert.equal(sg.sign, engine.signNames[i]);
    assert.equal(sg.ruler, classical.rulers[i]);
    const next = s.signs[(i + 1) % 12];
    assert.equal(next.moonSector.house, (sg.moonSector.house + 10) % 12 + 1, 'sectors do not wrap');
    assert.equal(sg.moonSector.name, engine.sectorNames[sg.moonSector.house - 1]);
    assert.equal(sg.aspects.length, s.aspects.length);
    sg.aspects.forEach((a, j) => {
      const top = s.aspects[j];
      assert.equal(a.planet, top.planet);
      assert.equal(a.name, top.name);
      assert.equal(a.planetSector.house, natal.mod(engine.signNames.indexOf(top.planetSign) - i, 12) + 1);
      assert.equal(a.planetSector.name, engine.sectorNames[a.planetSector.house - 1]);
      assert.equal(a.rulerInvolved, a.planet === sg.ruler);
    });
    assert.equal(sg.events.length, s.events.length);
    sg.events.forEach((e, j) => {
      assert.equal(e.body, s.events[j].body);
      assert.equal(e.sector.house, natal.mod(s.events[j].signIndex - i, 12) + 1);
      assert.equal(e.rulerInvolved, e.body === sg.ruler);
      assert.ok(!/[A-Z]/.test(e.detail.slice(1)), `detail leaks a name: ${e.detail}`);
    });
  }
});

test('factSheet lists the Sun ingress on the equinox day, seen from each sign', () => {
  const day = astro.Seasons(2026).sep_equinox.date.toISOString().slice(0, 10);
  const s = engine.factSheet(day);
  const sun = s.events.find(e => e.body === 'Sun');
  assert.ok(sun, 'no Sun ingress on the equinox day');
  assert.equal(sun.kind, 'ingress');
  assert.equal(sun.sign, 'Libra');
  assert.equal(sun.detail, 'enters a new sign');
  assert.equal(s.signs[6].events.find(e => e.body === 'Sun').sector.house, 1);      // Libra: its own sign
  assert.equal(s.signs[4].events.find(e => e.body === 'Sun').rulerInvolved, true);  // Leo: the Sun rules it
  assert.equal(s.signs[0].events.find(e => e.body === 'Sun').sector.house, 7);      // Aries: partnership sector
});

test('factSheet refuses a bad day', () => {
  for (const day of ['2026-02-29', 'bad', '1900-12-31']) assert.throws(() => engine.factSheet(day), RangeError);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/daily-prose.test.cjs`
Expected: the three new tests FAIL with `TypeError: engine.factSheet is not a function`.

- [ ] **Step 3: Implement**

In `daily-horoscope-engine.js`, after the `questions` array, add:

```js
  // Plain-language names for the twelve whole-sign solar houses. Original to this site; the
  // only house vocabulary the daily prose writer may use (tools/write_daily_prose.cjs).
  const sectorNames = [
    'your sign', 'your money-and-worth sector', 'your communication sector',
    'your home sector at the base of your chart', 'your romance-and-creativity sector',
    'your daily-work-and-health sector', 'your partnership sector',
    'your shared-money-and-intimacy sector', 'your travel-and-belief sector',
    'your career sector at the top of your chart', 'your friends-and-groups sector',
    'your most private sector'
  ];
  const ASPECT_NAMES = {0: 'conjunction', 60: 'sextile', 90: 'square', 120: 'trine', 180: 'opposition'};
  const ASPECT_PARTNERS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const EVENT_BODIES = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  // The fact sheet the prose writer works from. Node-only (the page never calls it), so the
  // sky and classical engines are required lazily and the browser dependency map is unchanged.
  // The day is the UTC calendar day; sectors come from the same 12:00 UTC sample as calculate().
  function factSheet(day) {
    const sky = skyFor(day);
    const cal = typeof SkyCalendarEngine !== 'undefined' ? SkyCalendarEngine : require('./sky-calendar-engine.js');
    const classical = typeof ClassicalEngine !== 'undefined' ? ClassicalEngine : require('./classical-engine.js');
    const from = new Date(`${day}T00:00:00Z`), to = new Date(+from + 86400000), noon = new Date(sky.instant);
    const signIndexOf = body => natal.placement(cal.lonOf(body, noon)).index;
    const moonIndex = sky.points.find(p => p.name === 'Moon').index;
    const partnerSign = Object.fromEntries(ASPECT_PARTNERS.map(p => [p, signIndexOf(p)]));
    const aspects = cal.moonAspects(from, to, ASPECT_PARTNERS).map(h => ({
      planet: h.planet, aspect: h.aspect, name: ASPECT_NAMES[h.aspect], planetSign: natal.signNames[partnerSign[h.planet]], date: h.date
    }));
    const events = [
      ...cal.ingresses(from, to, EVENT_BODIES).map(e => ({body: e.body, kind: 'ingress', detail: e.retrograde ? 'backs into the previous sign' : 'enters a new sign', sign: e.sign, signIndex: e.signIndex, date: e.date})),
      ...cal.stations(from, to).map(e => ({body: e.body, kind: 'station', detail: `turns ${e.direction}`, sign: e.sign, signIndex: natal.signNames.indexOf(e.sign), date: e.date}))
    ].sort((a, b) => a.date < b.date ? -1 : 1);
    const sector = (bodyIndex, signIndex) => { const house = natal.mod(bodyIndex - signIndex, 12) + 1; return {house, name: sectorNames[house - 1]}; };
    const signs = natal.signNames.map((sign, i) => {
      const ruler = classical.rulers[i];
      return {
        sign, ruler, moonSector: sector(moonIndex, i),
        aspects: aspects.map(a => ({planet: a.planet, name: a.name, planetSector: sector(partnerSign[a.planet], i), rulerInvolved: a.planet === ruler})),
        events: events.map(e => ({body: e.body, kind: e.kind, detail: e.detail, sector: sector(e.signIndex, i), rulerInvolved: e.body === ruler}))
      };
    });
    const phase = phases[Math.round(sky.phaseAngle / 45) % 8][0];
    return {day, instant: sky.instant, moon: {sign: natal.signNames[moonIndex], phase, illumination: sky.illumination}, aspects, events, signs};
  }
```

Change the export line to:

```js
  return {calculate, factSheet, localDateKey, sectorNames, signNames:natal.signNames, signGlyphs:natal.signGlyphs};
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/daily-prose.test.cjs tests/daily-horoscope.test.cjs tests/pages.test.cjs`
Expected: all PASS. `pages.test.cjs` proves the browser dependency map is untouched (no new top-level bare read).

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add daily-horoscope-engine.js tests/daily-prose.test.cjs
git commit -m "feat(daily): fact sheet for the prose writer, with plain-language sector names

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: the writer, `tools/write_daily_prose.cjs`

**Files:**
- Create: `tools/write_daily_prose.cjs`
- Modify: `.gitignore` (add `output/daily-prose/` under the `output/imagegen` lines)
- Test: `tests/daily-prose.test.cjs`

**Interfaces:**
- Consumes: `DailyHoroscopeEngine.factSheet`, `.signNames`.
- Produces (exports, for the tests): `RULES: string`, `EXAMPLE: string`, `validate(text, signSheet) -> null | reason string`, `buildMessages(signSheet, moon) -> [{role, content}, {role, content}]`, `parseArgs(argv) -> {from, days, endpoint, model, out, push, force}`, `addDays(day, n) -> day`. Run as a script it writes `<out>/<day>.json` shaped `{day, generated, model, signs: {aries: "...", ...}}`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/daily-prose.test.cjs`:

```js
const W = require('../tools/write_daily_prose.cjs');
const SHEET = {sign: 'Aries', ruler: 'Mars', moonSector: {house: 9, name: 'your travel-and-belief sector'},
  aspects: [{planet: 'Saturn', name: 'trine', planetSector: {house: 1, name: 'your sign'}, rulerInvolved: false}], events: []};
const GOOD = 'Discipline sits easily today. The Moon in your travel-and-belief sector trines Saturn in your sign, and the rule you set yourself last week, the early start or the no-phone hour, holds without any effort on your part, which is rare enough to notice. The course you keep meaning to book looks affordable when you finally open the page and read the price instead of guessing it. Book it before lunch, then go for the walk you said you would take, the long way round.';

test('validate accepts a paragraph in the brief shape', () => {
  assert.equal(W.validate(GOOD, SHEET), null);
});

test('validate rejects each rule breach with a reason', () => {
  const cases = [
    ['The Moon in your travel-and-belief sector trines Saturn in your sign. Go.', /words/],
    [GOOD + '\n\nMore.', /paragraph/],
    [GOOD.replace('The Moon in', 'Your luminary in'), /Moon/],
    [GOOD.replace('travel-and-belief', 'ninth'), /travel-and-belief/],
    [GOOD + ' Good luck.', /luck/],
    [GOOD.replace('holds', 'will hold'), /will/],
    [GOOD.replace('Saturn in your sign', 'Venus in your sign'), /Venus/],
    [GOOD.replace('in your sign,', 'in Libra,'), /Libra/],
    [GOOD.replace(', and', ' \u2014 and'), /em dash/],
    [GOOD.replace('before lunch', 'at 14:02'), /clock time/],
    [GOOD.replace('before lunch', 'at 12 degrees'), /degree/],
    [42, /string/]
  ];
  for (const [text, reason] of cases) assert.match(String(W.validate(text, SHEET)), reason, String(text).slice(0, 40));
});

test('the rules name no sign and no planet but the Moon, and the model never sees another sign name', () => {
  for (const s of engine.signNames) assert.ok(!W.RULES.includes(s), `RULES names ${s}`);
  for (const p of ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) assert.ok(!new RegExp(`\\b${p}\\b`).test(W.RULES), `RULES names ${p}`);
  const [system, user] = W.buildMessages(SHEET, {sign: 'Pisces', phase: 'First quarter', illumination: 52});
  assert.equal(system.role, 'system');
  assert.ok(system.content.includes(W.RULES) && system.content.includes(W.EXAMPLE));
  assert.equal(user.role, 'user');
  assert.ok(user.content.includes('your travel-and-belief sector'));
  assert.ok(user.content.includes('First quarter'));
  assert.ok(!user.content.includes('Pisces'), 'the Moon sign leaks to the model');
  assert.ok(!/\d{4}-\d{2}-\d{2}|\d{2}:\d{2}/.test(user.content), 'a date or time leaks to the model');
});

test('parseArgs defaults and addDays', () => {
  const o = W.parseArgs([]);
  assert.equal(o.days, 7); assert.equal(o.endpoint, 'http://127.0.0.1:8088/v1'); assert.equal(o.model, 'muse-glimmer-30b-local');
  assert.equal(o.push, false); assert.equal(o.force, false); assert.match(o.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(W.parseArgs(['--from', '2026-12-30', '--days', '3', '--push', '--force', '--out', 'x']), {...o, from: '2026-12-30', days: 3, push: true, force: true, out: 'x'});
  assert.equal(W.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(W.addDays('2024-02-28', 1), '2024-02-29');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/daily-prose.test.cjs`
Expected: FAIL at the `require` with `Cannot find module '../tools/write_daily_prose.cjs'`.

- [ ] **Step 3: Write the script**

Create `tools/write_daily_prose.cjs`:

```js
#!/usr/bin/env node
/* Writes the daily prose horoscope with the local Muse Glimmer model and, with --push, sends
   each day's file to the VPS. Design: docs/superpowers/specs/2026-09-17-daily-prose-design.md.
     node tools/write_daily_prose.cjs [--from YYYY-MM-DD] [--days 7] [--push] [--force]
        [--endpoint http://127.0.0.1:8088/v1] [--model muse-glimmer-30b-local] [--out output/daily-prose]
   Refuses to run unless the served model alias equals --model, so it can never publish another
   model's prose under Glimmer's name. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const engine = require('../daily-horoscope-engine.js');

const RULES = `You write one short daily horoscope paragraph for a website called Ishtar Insights. Reasoning strength: low.

You are given a fact sheet: the phase of the Moon, the sector of the reader's chart the Moon is in today, the exact aspects the Moon makes today to other planets with the sector each planet is in, and any planet that changes sign or turns direct or retrograde today, again with its sector. Write only from these facts. Invent nothing.

Shape, in this order, as one paragraph of 60 to 120 words in the second person:
1. One short sentence naming the mood of the day.
2. The mechanism, in plain words: the Moon in the given sector, the aspect verb, the planet, and the planet's sector, using the sector names exactly as given. Aspect verbs: is with (conjunction), sextiles, squares, trines, opposes. If there is no aspect, say where the Moon is and what the phase asks, and leave it at that. If the fact sheet marks a planet's rulerInvolved as true, call it "your ruling planet". If the ruler listed is the Moon itself, you may call the Moon your ruling planet. If an event is listed, weave it into the same paragraph in one sentence and name its sector.
3. One concrete consequence: a small, specific scene from ordinary life, not a generality.
4. One imperative sentence telling the reader what to do with the day.

Rules: plain, warm, dry, specific. No clock times, no degrees, no dates. Do not name any zodiac sign except the reader's own. Do not name any planet, aspect or event that is not in the fact sheet. Never use the word "will". No predictions, promises or guarantees. No medical, legal or financial advice. No em dashes, no headings, no lists, no emoji, no quotation marks. Output the paragraph only, nothing before or after it.`;

const EXAMPLE = `Example of the shape, written for a different day and a different sky:
Small talk turns useful. The Moon in your communication sector sextiles Venus in your friends-and-groups sector, and the person you keep meaning to message is the one who messages you first, with a question you can actually answer. Answer it properly, in more than one line, and let that be the day's one piece of real correspondence.`;

const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'];
const FORBIDDEN = ['you will', 'will happen', 'is going to', 'the answer is', 'luck', 'fortune'];

// null when the paragraph may be published, otherwise the reason it may not.
function validate(text, sheet) {
  if (typeof text !== 'string') return 'not a string';
  const t = text.trim();
  if (/\n/.test(t)) return 'more than one paragraph';
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < 60 || words > 120) return `${words} words`;
  if (!/\bMoon\b/.test(t)) return 'does not mention the Moon';
  if (!t.includes(sheet.moonSector.name)) return `does not name ${sheet.moonSector.name}`;
  const lower = t.toLowerCase();
  for (const f of FORBIDDEN) if (lower.includes(f)) return `forbidden phrase: ${f}`;
  if (/\bwill\b/i.test(t)) return 'uses "will"';
  const allowed = new Set(['Moon', ...sheet.aspects.map(a => a.planet), ...sheet.events.map(e => e.body)]);
  for (const p of PLANETS) if (!allowed.has(p) && new RegExp(`\\b${p}\\b`).test(t)) return `names ${p}, which is not in the sheet`;
  for (const s of engine.signNames) if (s !== sheet.sign && new RegExp(`\\b${s}\\b`).test(t)) return `names ${s}`;
  if (t.includes('\u2014')) return 'em dash';
  if (/\b\d{1,2}:\d{2}\b/.test(t)) return 'clock time';
  if (/\d\s*°|\b\d+\s*degrees?\b/i.test(t)) return 'degree';
  return null;
}

// The Moon's sign is deliberately withheld: the rules ban every sign name but the reader's own.
function buildMessages(sheet, moon) {
  const facts = {
    sign: sheet.sign, ruler: sheet.ruler, moonPhase: moon.phase, moonSector: sheet.moonSector.name,
    aspects: sheet.aspects.map(a => ({planet: a.planet, aspect: a.name, planetSector: a.planetSector.name, rulerInvolved: a.rulerInvolved})),
    events: sheet.events.map(e => ({body: e.body, what: e.detail, sector: e.sector.name, rulerInvolved: e.rulerInvolved}))
  };
  return [
    {role: 'system', content: `${RULES}\n\n${EXAMPLE}`},
    {role: 'user', content: `Fact sheet for ${sheet.sign}:\n${JSON.stringify(facts, null, 1)}\n\nWrite the paragraph: mood, mechanism, consequence, imperative.`}
  ];
}

function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const o = {from: new Date().toISOString().slice(0, 10), days: 7, endpoint: 'http://127.0.0.1:8088/v1',
             model: 'muse-glimmer-30b-local', out: 'output/daily-prose', push: false, force: false};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--push' || a === '--force') o[a.slice(2)] = true;
    else if (a === '--days') o.days = Number(argv[++i]);
    else if (['--from', '--endpoint', '--model', '--out'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  if (!Number.isInteger(o.days) || o.days < 1 || o.days > 31) throw new Error('--days must be 1 to 31');
  return o;
}

async function servedAlias(endpoint) {
  const res = await fetch(endpoint.replace(/\/v1\/?$/, '') + '/props');
  if (!res.ok) throw new Error(`/props returned ${res.status}`);
  return (await res.json()).model_alias || '';
}

async function complete(endpoint, model, messages) {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({model, messages, temperature: 1.0, top_p: 0.95, top_k: 64, max_tokens: 700, stream: false})
  });
  if (!res.ok) throw new Error(`${res.status} from ${endpoint}/chat/completions`);
  const json = await res.json();
  return String(json.choices?.[0]?.message?.content || '').trim();
}

function push(day, file) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`refusing to push a malformed day: ${day}`);
  const remote = `/opt/tarot-game/daily/${day}.json`;
  execFileSync('ssh', ['vps', `mkdir -p /opt/tarot-game/daily && cat > ${remote}.tmp && mv -f ${remote}.tmp ${remote}`],
    {input: fs.readFileSync(file), stdio: ['pipe', 'inherit', 'inherit']});
  console.log(`${day}: pushed`);
}

async function main(argv) {
  const o = parseArgs(argv);
  const alias = await servedAlias(o.endpoint);
  if (alias !== o.model) { console.error(`Served model is "${alias}", not "${o.model}"; refusing to write.`); process.exit(2); }
  fs.mkdirSync(o.out, {recursive: true});
  for (let i = 0; i < o.days; i++) {
    const day = addDays(o.from, i), file = path.join(o.out, `${day}.json`);
    if (fs.existsSync(file) && !o.force) { console.log(`${day}: exists, skipped`); if (o.push) push(day, file); continue; }
    const sheet = engine.factSheet(day);
    const signs = {};
    for (const sg of sheet.signs) {
      let text = null, reason = '';
      for (let attempt = 1; attempt <= 3 && !text; attempt++) {
        const candidate = await complete(o.endpoint, o.model, buildMessages(sg, sheet.moon));
        reason = validate(candidate, sg);
        if (reason) console.warn(`${day} ${sg.sign} attempt ${attempt}: ${reason}`); else text = candidate;
      }
      if (text) signs[sg.sign.toLowerCase()] = text; else console.error(`${day} ${sg.sign}: omitted after 3 attempts (${reason})`);
    }
    fs.writeFileSync(file, JSON.stringify({day, generated: new Date().toISOString(), model: o.model, signs}, null, 1) + '\n');
    console.log(`${day}: ${Object.keys(signs).length}/12 signs written`);
    if (o.push) push(day, file);
  }
}

module.exports = {RULES, EXAMPLE, validate, buildMessages, parseArgs, addDays};
if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error); process.exit(1); });
```

Note the skipped-day branch still pushes when `--push` is given, so a re-run after a failed push repairs the VPS without regenerating.

Add to `.gitignore` after line 56 (`tmp/imagegen/`):

```
output/daily-prose/
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/daily-prose.test.cjs`
Expected: all PASS. If a `validate` case passes for the wrong reason (for example the `Venus` case tripping the word count), fix the case, not the validator; each case must return the reason its regex names.

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tools/write_daily_prose.cjs tests/daily-prose.test.cjs .gitignore
git commit -m "feat(daily): the prose writer for the local Glimmer model, with its validator

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: first live run and the copy review (gate, no code unless the brief needs it)

**Files:**
- Read: `output/daily-prose/*.json` (generated, gitignored)
- Possibly modify: `tools/write_daily_prose.cjs` (`RULES` / `EXAMPLE` only)

**Interfaces:**
- Consumes: the writer from Task 3, `%LOCALAPPDATA%\hermes\llama-server\start.ps1 -Quant glimmer -Force -WaitForReady`.
- Produces: two days of reviewed paragraphs and a brief that survived review. No push yet.

- [ ] **Step 1: Confirm the guard refuses the default model**

With the server on its default profile (it is right now: `/props` reports `qwen3.8-27b-local`):

Run: `node tools/write_daily_prose.cjs --days 1 --out output/daily-prose`
Expected: exit code 2 and `Served model is "qwen3.8-27b-local", not "muse-glimmer-30b-local"; refusing to write.` No file written.

- [ ] **Step 2: Load Glimmer**

Run (PowerShell): `& "$env:LOCALAPPDATA\hermes\llama-server\start.ps1" -Quant glimmer -Force -WaitForReady`
Then: `curl -s http://127.0.0.1:8088/props` must show `"model_alias":"muse-glimmer-30b-local"`. Loading from N: takes about 40 seconds; `N:` must be mounted (`Test-Path N:\`).

- [ ] **Step 3: Generate two days**

Run: `node tools/write_daily_prose.cjs --from 2026-09-18 --days 2 --out output/daily-prose`
Expected: two files, each reporting `12/12 signs written`, with at most a handful of attempt warnings. Note the wall time; the spec budgets about five minutes for seven days.

If most attempts fail on one rule, that rule or the brief is wrong, not the model. Typical fixes: the model reports `reasoning_content` in `content` (then strip a leading `<think>...</think>` block in `complete`), or it wraps the paragraph in quotes (add "no quotation marks" is already in the rules; strip a single surrounding pair in `complete`). Add a `validate` test for any stripping you add.

- [ ] **Step 4: Read all 24 paragraphs against their fact sheets**

For each paragraph check by eye: the four beats in order; the mechanism sentence names the Moon sector and the aspect exactly as the sheet has them; nothing invented; it reads as this site's voice (plain, warm, dry), not as a template.

- [ ] **Step 5: Strong-model review of the batch**

Write the 24 paragraphs and, for comparison only, the four SASS paragraphs Glenn shared (Aries, Taurus, Gemini, Cancer of the 2026-09-17 issue) into the scratchpad directory, never into the repo. Dispatch one `general-purpose` agent with model `opus` and this brief:

> Review 24 daily-horoscope paragraphs (file A) against their fact sheets (file B) and against four competitor paragraphs (file C). Report, per paragraph: (1) any fact not in its sheet, or a sheet fact stated wrongly; (2) any sentence that follows a competitor sentence's structure or reuses its phrasing beyond the shared astrological vocabulary (sector names and aspect verbs are shared vocabulary and are fine); (3) whether the four beats are present in order; (4) any forecast, promise, or advice on health, money or law. End with the three most common weaknesses across the batch and a one-line suggested change to the writing brief for each.

Fix the brief for any pattern that shows up in three or more paragraphs; regenerate with `--force` and re-review once. Do not hand-edit paragraphs.

- [ ] **Step 6: Restore the default model and commit any brief change**

Run (PowerShell): `& "$env:LOCALAPPDATA\hermes\llama-server\start.ps1" -Quant iq3s -Force`

If `RULES` or `EXAMPLE` changed:

```bash
node --test tests/*.test.cjs
git add tools/write_daily_prose.cjs tests/daily-prose.test.cjs
git commit -m "content(daily): tune the prose brief after the first Glimmer review

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: the page renders the paragraph, or falls back unchanged

**Files:**
- Modify: `daily-horoscope.js` (the `attach` function: state at line 7, `render()` at lines 15–28, the disclosure `<details>` at line 10)
- Modify: `sky/index.html:55-56` and `:74` (cache keys)
- Test: `tests/daily-horoscope.test.cjs`

**Interfaces:**
- Consumes: `/sky/daily/<day>.json` shaped `{day, signs: {aries: string, ...}}`; `DailyHoroscopeEngine.localDateKey()`, `.calculate(sign)`.
- Produces: markup `<p class="dh-prose">` inside `.dh-main` when a paragraph exists; the existing markup, byte for byte, when not.

- [ ] **Step 1: Write the failing tests**

Append to `tests/daily-horoscope.test.cjs`:

```js
function mount({fetch, setTimeout = () => 1, clock = new Date(2026, 8, 17, 12, 0, 0).getTime()} = {}) {
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } }
  const nodes = new Map();
  const root = {innerHTML: '', querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {innerHTML: '', textContent: '', hidden: false, value: '', listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; }});
    return nodes.get(selector);
  }};
  const document = {hidden: false, listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; }};
  const context = vm.createContext({Date: ClockDate, Intl, document, window: {addEventListener() {}}, clearTimeout() {}, setTimeout, AbortController, fetch,
    DailyHoroscopeEngine: {...engine, localDateKey: () => engine.localDateKey(new Date(clock)), calculate: sign => engine.calculate(sign, engine.localDateKey(new Date(clock)))}});
  vm.runInContext(fs.readFileSync(require.resolve('../daily-horoscope.js'), 'utf8') + '\nthis.attachHoroscope = DailyHoroscope.attach;', context);
  const ui = context.attachHoroscope(root);
  return {ui, output: nodes.get('[data-dh-reading]'), select: nodes.get('select')};
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('a model-written paragraph replaces the lens cards and keeps the phase line and question', async () => {
  const day = '2026-09-17';
  const paragraph = 'Discipline sits easily today. The Moon in your travel-and-belief sector trines Saturn in your sign.';
  let requested;
  const page = mount({fetch: async url => { requested = url; return {ok: true, json: async () => ({day, signs: {aries: paragraph}})}; }});
  assert.equal(page.output.innerHTML, '', 'drew before the fetch settled');
  await settle();
  assert.equal(requested, `/sky/daily/${day}.json`);
  assert.ok(page.output.innerHTML.includes(`<p class="dh-prose">${paragraph}</p>`));
  assert.ok(!page.output.innerHTML.includes('dh-lenses') && !page.output.innerHTML.includes('dh-action'));
  assert.match(page.output.innerHTML, /dh-moon/);
  assert.match(page.output.innerHTML, /<blockquote>/);
  page.select.value = '3'; page.select.listeners.change();          // Cancer has no paragraph: template, synchronously
  assert.match(page.output.innerHTML, /Today · Cancer/);
  assert.match(page.output.innerHTML, /dh-lenses/);
  assert.ok(!page.output.innerHTML.includes('dh-prose'));
});

test('no file, a timeout, or no fetch at all render the template reading byte for byte', async () => {
  const none = mount({fetch: undefined});
  assert.match(none.output.innerHTML, /dh-lenses/, 'no fetch: must draw synchronously');
  const missing = mount({fetch: async () => ({ok: false, status: 404, json: async () => { throw new Error('no body'); }})});
  const broken = mount({fetch: async () => ({ok: true, json: async () => ({day: '2026-09-17', signs: {aries: 7}})})});
  const slow = mount({
    fetch: (url, {signal}) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
    setTimeout: callback => { callback(); return 1; }                 // the two-second abort fires at once
  });
  await settle();
  assert.equal(missing.output.innerHTML, none.output.innerHTML);
  assert.equal(broken.output.innerHTML, none.output.innerHTML);
  assert.equal(slow.output.innerHTML, none.output.innerHTML);
});

test('the disclosure says when the paragraph is model-written and what happens when it is not', () => {
  const source = fs.readFileSync(require.resolve('../daily-horoscope.js'), 'utf8');
  assert.match(source, /language model running on our own hardware/);
  assert.match(source, /shorter template reading appears instead/);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/daily-horoscope.test.cjs`
Expected: the first FAILS (`drew before the fetch settled`: the current page draws synchronously), the second FAILS only if the harness itself breaks (it should PASS today, which is fine: it guards the fallback), the third FAILS on the missing sentence. Confirm the existing rollover test still passes.

- [ ] **Step 3: Implement**

In `daily-horoscope.js`, change the state line (line 7) to:

```js
    let selected = 0, profileSign = null, manual = false, renderedDay = '', timer;
    // Today's model-written paragraphs (docs/DAILY-HOROSCOPE.md, "The prose layer"): fetched once
    // per calendar day. `signs` stays null on any failure and the template reading draws instead.
    let prose = {day: '', signs: null, settled: true};
```

Add these two functions before `render()` and rename the existing `render` body to `draw`:

```js
    // True when a draw will follow once the fetch settles; false when draw() may run now.
    function loadProse(day) {
      if (prose.day === day) return !prose.settled;
      const mine = prose = {day, signs: null, settled: typeof fetch !== 'function'};
      if (mine.settled) return false;
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const abort = setTimeout(() => controller && controller.abort(), 2000);
      fetch(`/sky/daily/${day}.json`, controller ? {signal: controller.signal} : undefined)
        .then(res => res.ok ? res.json() : null)
        .then(json => { if (json && json.day === day && json.signs && typeof json.signs === 'object') mine.signs = json.signs; })
        .catch(() => {})
        .then(() => { clearTimeout(abort); mine.settled = true; if (prose === mine) draw(); });
      return true;
    }
    function render() {
      select.value = String(selected);
      profileButton.hidden = profileSign === null || (!manual && selected === profileSign);
      root.querySelector('[data-dh-source]').textContent = !manual && profileSign !== null ? 'Using the Sun sign from your birth sky.' : 'Explore any sign. No birth details needed.';
      let day = '';
      try { day = DailyHoroscopeEngine.localDateKey(); } catch (error) { day = ''; }
      if (!day || !loadProse(day)) draw();
    }
    function draw() {
      try {
        const reading = DailyHoroscopeEngine.calculate(selected);
        ...
```

`draw()` keeps the existing `try`/`catch`, minus the three control lines that moved into `render()`. Inside the `try`, after `const moon = ...`, build the prose branch so the fallback string is unchanged:

```js
        const key = reading.sign.toLowerCase();
        const paragraph = prose.signs && typeof prose.signs[key] === 'string' && prose.signs[key].trim() ? prose.signs[key].trim() : '';
        const main = paragraph
          ? `<div class="dh-main"><span class="dh-sign" aria-hidden="true">${reading.glyph}</span><div><p class="dh-label">${esc(reading.sign)} · Today</p><p class="dh-prose">${esc(paragraph)}</p></div></div>`
          : `<div class="dh-main"><span class="dh-sign" aria-hidden="true">${reading.glyph}</span><div><p class="dh-label">${esc(reading.sign)} · Today’s theme</p><h4>${esc(reading.title)}</h4><p>${esc(reading.overview)}</p></div></div>`;
        const tail = paragraph ? '' : `<div class="dh-lenses">${reading.lenses.map(lens=>`<section><h5>${lens.title}</h5><p>${esc(lens.text)}</p></section>`).join('')}</div><div class="dh-action"><p class="dh-label">One small action</p><p>${esc(reading.action)}</p></div>`;
        output.innerHTML = `<article class="dh-reading"><div class="dh-dateline"><time datetime="${reading.day}">${esc(dateLabel)}</time><span>Today · ${esc(reading.sign)}</span></div>${main}<div class="dh-moon"><span aria-hidden="true">☾</span><div><strong>Moon in ${moon.sign} · ${reading.phase}</strong><p>${reading.illumination}% illuminated at the daily snapshot. ${esc(reading.phasePrompt)}</p></div></div>${tail}<blockquote>${esc(reading.question)}</blockquote></article>`;
```

Copy the `dh-main`, `dh-moon`, `dh-lenses`, `dh-action` and `blockquote` fragments from the current line 23 character for character; the second test compares the fallback to a page with no `fetch`, so the two builds must agree, but the regression you are guarding is against today's markup, so diff the fallback string against `git show HEAD:daily-horoscope.js` before committing.

The retry button handler (`output.addEventListener('click', ...)`) and `setProfileSign` keep calling `render()`.

In the disclosure `<details>` (line 10), append a third paragraph before `</details>`:

```html
<p>On most days the paragraph is written by a language model running on our own hardware, from the positions and aspects computed for that day, and checked automatically before it is published. When no paragraph is available, the shorter template reading appears instead.</p>
```

No CSS change: `.dh-main p:last-child` already styles the paragraph. Check at 390px in the browser in Task 7 and add `.dh-prose { max-width: 62ch; }` to `daily-horoscope.css` (and bump its key to `?v=2`) only if the measure runs wide.

In `sky/index.html` set `daily-horoscope-engine.js?v=2`, `daily-horoscope.js?v=2`, `sky-calendar-engine.js?v=4`.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/daily-horoscope.test.cjs tests/pages.test.cjs tests/site-shell.test.cjs`
Expected: all PASS, including the pre-existing rollover test (its context has no `fetch`, so it draws synchronously as before).

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add daily-horoscope.js sky/index.html tests/daily-horoscope.test.cjs
git commit -m "feat(daily): render the model-written paragraph, template reading as the fallback

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: documentation

**Files:**
- Modify: `docs/DAILY-HOROSCOPE.md`, `docs/SKY.md` ("Copy" section), `docs/SKY.md` ("Out of scope" is unchanged)

- [ ] **Step 1: `docs/DAILY-HOROSCOPE.md`**

Append a section:

```markdown
## The prose layer (2026-09-17)

Design: `docs/superpowers/specs/2026-09-17-daily-prose-design.md`.

On most days the reading is one paragraph written by Muse Glimmer 30B (Apache 2.0) on Glenn's
llama.cpp server, never by a hosted API. `DailyHoroscopeEngine.factSheet(day)` computes what the
model may say: the Moon's sector for each sign (twelve plain-language `sectorNames`), every exact
Moon aspect that UTC day to Mercury through Pluto (`SkyCalendarEngine.moonAspects`) with the
partner's sector, the day's ingresses and stations (Sun and Mercury through Pluto; Moon ingresses
and Chiron excluded) with their sectors, the classical ruler and whether it is involved. The Moon's
sign is withheld from the model because the brief bans every sign name but the reader's own.

`tools/write_daily_prose.cjs` refuses to run unless `/props` reports the Glimmer alias, asks for
one paragraph per sign per day, validates each (60–120 words, one paragraph, names the Moon and its
sector, no forbidden phrase or "will", no planet or sign outside the sheet, no em dash, time or
degree), retries up to three times, and writes `output/daily-prose/<day>.json` (gitignored) as
`{day, generated, model, signs: {aries: "...", ...}}`. A sign that fails three times is omitted.
`--push` streams each file over `ssh vps` into `/opt/tarot-game/daily/`, which nginx serves at
`/sky/daily/`. The nightly task on GLENNHOMEPC (`Ishtar-Daily-Prose`, 03:30, wscript shim) writes
seven days ahead, so a night the PC is off changes nothing.

`daily-horoscope.js` fetches `/sky/daily/<day>.json` once per calendar day with a two-second
timeout and draws once after it settles; sign changes read the cached result. With a paragraph the
lens cards, title, overview and action are replaced by `<p class="dh-prose">`; the dateline, phase
line and question stay. Without one (404, timeout, bad JSON, missing sign) the markup is byte for
byte today's template reading. This is the page's only network request and it carries finished
copy, not positions.

Validation: `node --test tests/daily-prose.test.cjs tests/daily-horoscope.test.cjs`.
```

- [ ] **Step 2: `docs/SKY.md`**

In "Copy", after the paragraph on `sky-calendar-text.js`, add:

```markdown
The daily horoscope's paragraph is the one piece of copy on `/sky/` that is not in a text module:
it is written each night by a local language model from a computed fact sheet and validated
before publishing (`docs/DAILY-HOROSCOPE.md`, "The prose layer"). The template reading it replaces
still lives in `daily-horoscope-engine.js` and is what renders when no paragraph is available.
```

- [ ] **Step 3: Commit**

```bash
git add docs/DAILY-HOROSCOPE.md docs/SKY.md
git commit -m "docs: the daily prose layer

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: VPS: the daily directory, the nginx location, the first files, the static release

**Files:**
- VPS: `/etc/nginx/sites-available/ishtarinsights.com`, `/opt/tarot-game/daily/`, a new release directory
- Modify: `docs/deployment.md` (new entry at the top)

**Interfaces:**
- Consumes: the committed tree from Tasks 1–6; two generated day files from Task 4.
- Produces: `https://ishtarinsights.com/sky/daily/<day>.json` served as JSON; `/sky/` running the new page.

- [ ] **Step 1: The directory and the nginx location**

```bash
ssh vps 'mkdir -p /opt/tarot-game/daily && cp /etc/nginx/sites-available/ishtarinsights.com /etc/nginx/sites-available/ishtarinsights.com.before-daily-prose && grep -c "^    location / {" /etc/nginx/sites-available/ishtarinsights.com'
```

Expected count: `1`. Then insert the block before that line and test:

```bash
ssh vps 'sed -i "/^    location \/ {/i\\    location ^~ /sky/daily/ {\n        alias /opt/tarot-game/daily/;\n        default_type application/json;\n        add_header Cache-Control \"max-age=600\";\n        add_header X-Content-Type-Options nosniff;\n    }\n" /etc/nginx/sites-available/ishtarinsights.com && nginx -t && systemctl reload nginx && grep -n -A5 "sky/daily" /etc/nginx/sites-available/ishtarinsights.com'
```

If `nginx -t` fails, restore the `.before-daily-prose` copy and fix by hand; never reload a failing config.

- [ ] **Step 2: Push the two reviewed days and check the URL**

```bash
node tools/write_daily_prose.cjs --from 2026-09-18 --days 2 --out output/daily-prose --push
```

The files exist, so nothing is generated and the guard is not consulted before the push (the guard runs first; if the default model is loaded the script exits 2, so run this while Glimmer is loaded, or push by hand with the same `ssh vps 'cat > ... .tmp && mv -f ...'` line the script uses). Then:

```bash
curl -sI https://ishtarinsights.com/sky/daily/2026-09-18.json | grep -iE "^HTTP|content-type|cache-control"
curl -sI https://ishtarinsights.com/sky/daily/1999-01-01.json | head -1
```

Expected: `200`, `application/json`, `max-age=600`; and `404`.

- [ ] **Step 3: Release the four changed static files**

Follow the pattern in `docs/deployment.md` (hardlink copy, replace only the changed files, gate on hashes, switch atomically). Because the copy is hardlinked, `rm -f` each file before writing it, or the previous release changes too (memory: `tar --unlink-first` breaks on directories; remove the files by hand).

```bash
SHA=$(git rev-parse --short HEAD)
PREV=$(ssh vps 'readlink /opt/tarot-game/current')
NEW=/opt/tarot-game/releases/20260917-daily-prose-$SHA
ssh vps "cp -al $PREV $NEW && cd $NEW && rm -f daily-horoscope.js daily-horoscope-engine.js sky-calendar-engine.js sky/index.html"
git archive --format=tar HEAD daily-horoscope.js daily-horoscope-engine.js sky-calendar-engine.js sky/index.html | ssh vps "tar -xf - -C $NEW"
for f in daily-horoscope.js daily-horoscope-engine.js sky-calendar-engine.js sky/index.html; do
  echo "$(git show HEAD:$f | sha256sum | cut -c1-64)  $f"
done | ssh vps "cd $NEW && sha256sum -c -"
```

Expected: four `OK` lines. Only then:

```bash
ssh vps "ln -sfn $NEW /opt/tarot-game/current.new && mv -Tf /opt/tarot-game/current.new /opt/tarot-game/current && readlink /opt/tarot-game/current"
curl -s https://ishtarinsights.com/sky/ | grep -oE 'daily-horoscope(-engine)?\.js\?v=[0-9]+|sky-calendar-engine\.js\?v=[0-9]+'
curl -s https://ishtarinsights.com/daily-horoscope.js?v=2 | grep -c "dh-prose"
```

Expected: `v=2`, `v=2`, `v=4`; and `1` or more.

- [ ] **Step 4: Browser check**

Open `https://ishtarinsights.com/sky/` in the built-in browser. Set the device date is not possible, so check the two states the live site can show today: with no file for today's date the template reading renders with no console errors; then set the sign to one that has a paragraph on 2026-09-18 by loading the page after the file for the current day exists (push today's file if needed). Confirm: the paragraph shows, no lens cards, phase line and question present, no horizontal overflow at 390px, no console errors. Screenshot both.

- [ ] **Step 5: Record the deployment**

Add an entry at the top of `docs/deployment.md` in the house shape (Deployed `<sha>`, **Static plus one nginx location.**; Release; the gates; rollback line; Change; Cache keys; Validation), including the nginx block verbatim, the backup path `ishtarinsights.com.before-daily-prose`, and that `/opt/tarot-game/daily/` is written only by `tools/write_daily_prose.cjs --push` from GLENNHOMEPC.

```bash
git add docs/deployment.md
git commit -m "docs: record the daily prose deployment

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: the nightly task on GLENNHOMEPC

**Files:**
- Create (outside the repo): `C:\Users\glenn\Scripts\daily-prose.ps1`, `C:\Users\glenn\Scripts\daily-prose-hidden.vbs`
- Scheduled task: `Ishtar-Daily-Prose`

**Interfaces:**
- Consumes: `start.ps1 -Quant glimmer|iq3s -Force -WaitForReady`, `node`, the repo at `V:\tarot_game`, the `vps` ssh alias with its key.
- Produces: seven days of files on the VPS every night; a log at `C:\Users\glenn\Scripts\daily-prose.log`.

- [ ] **Step 1: The PowerShell script**

`C:\Users\glenn\Scripts\daily-prose.ps1`:

```powershell
# Nightly: write the next seven days of the daily prose horoscope with Muse Glimmer and push
# them to the VPS. Launched by daily-prose-hidden.vbs from the Ishtar-Daily-Prose task; runs in
# Glenn's interactive session because the model is on N: and the repo on V:, both session mounts.
$ErrorActionPreference = 'Continue'
$log = Join-Path $env:USERPROFILE 'Scripts\daily-prose.log'
$start = Join-Path $env:LOCALAPPDATA 'hermes\llama-server\start.ps1'
$rc = 1
"=== $(Get-Date -Format s) start" | Out-File $log -Append -Encoding utf8
try {
    if (-not (Test-Path 'N:\')) { throw 'N: is not mounted' }
    if (-not (Test-Path 'V:\tarot_game\tools\write_daily_prose.cjs')) { throw 'V:\tarot_game is not reachable' }
    & $start -Quant glimmer -Force -WaitForReady *>> $log
    Set-Location 'V:\tarot_game'
    & node tools\write_daily_prose.cjs --days 7 --push *>> $log
    $rc = $LASTEXITCODE
} catch {
    "ERROR $_" | Out-File $log -Append -Encoding utf8
} finally {
    & $start -Quant iq3s -Force *>> $log
    "=== $(Get-Date -Format s) end rc=$rc" | Out-File $log -Append -Encoding utf8
}
exit $rc
```

- [ ] **Step 2: The VBS shim**

`C:\Users\glenn\Scripts\daily-prose-hidden.vbs`, ASCII, CRLF, no control characters inside comment lines (memory: a stray CR in a `.vbs` shows a modal Windows Script Host error and the task hangs as "Running"):

```vbs
' Hidden launcher for the Ishtar-Daily-Prose scheduled task. Same reason as
' nas-coldstore-mount-hidden.vbs: Windows Terminal creates a console window at
' process creation for anything Task Scheduler launches into the interactive
' session, so the hide must happen here, in WScript.Shell.Run with window style 0.
Set sh = CreateObject("WScript.Shell")
script = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\Scripts\daily-prose.ps1"
cmd = """" & sh.ExpandEnvironmentStrings("%WINDIR%") & "\System32\WindowsPowerShell\v1.0\powershell.exe""" & _
      " -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & script & """"
rc = sh.Run(cmd, 0, True)
WScript.Quit rc
```

Verify: `[regex]::Matches((Get-Content -Raw C:\Users\glenn\Scripts\daily-prose-hidden.vbs), '[^\r\n\x20-\x7E]').Count` must be `0`.

- [ ] **Step 3: Register and test-run the task**

```powershell
schtasks /Create /TN "Ishtar-Daily-Prose" /SC DAILY /ST 03:30 /RL LIMITED /IT /TR "wscript.exe \"C:\Users\glenn\Scripts\daily-prose-hidden.vbs\"" /F
schtasks /Run /TN "Ishtar-Daily-Prose"
```

Wait for the log's `end rc=` line (about six minutes: 40 s load, seven days of generation, 10 s reload of Qwen), then:

```powershell
Get-Content C:\Users\glenn\Scripts\daily-prose.log -Tail 20
schtasks /Query /TN "Ishtar-Daily-Prose" /V /FO LIST | Select-String "Last Result|Status|Next Run"
```

Expected: `rc=0`, seven `pushed` lines (two of them `exists, skipped` then pushed), `Last Result: 0`. No console window appeared during the run. Then:

```bash
ssh vps 'ls -l /opt/tarot-game/daily/'
curl -s http://127.0.0.1:8088/props | grep -o '"model_alias":"[^"]*"'
```

Expected: seven files dated today; the alias is back to `qwen3.8-27b-local`.

- [ ] **Step 4: Record it**

Log to Honcho (`wiskey-journal`, session `infra-notes`, peer `Claude`, metadata `{type: 'infra-decision', source: 'claude', machine: 'glennhomepc', topics: 'ishtar-daily-prose-task'}`): the task name, schedule, the two script paths, the log path, that it swaps the loaded model for about six minutes at 03:30, the VPS directory and nginx location, and how to disable it (`schtasks /Change /TN "Ishtar-Daily-Prose" /DISABLE`).

Append to the deployment entry from Task 7 a line naming the scheduled task and its log path, and commit:

```bash
git add docs/deployment.md
git commit -m "docs: the nightly prose task

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Fact sheet and `moonAspects`: Tasks 1–2. Writer, brief, validator, output, push, model guard, idempotence: Task 3. Review gate before the first push: Task 4. Page fetch, single draw, replacement, fallback, disclosure, cache keys: Task 5. Docs: Tasks 6–8. Nginx and the daily directory: Task 7. Nightly task with VBS shim: Task 8. `.gitignore`: Task 3. Out-of-scope items are not planned.

**Placeholders.** None; every code step carries its code. Task 4 Step 3 lists the two most likely brief fixes concretely rather than "handle output issues".

**Type consistency.** `moonAspects` returns `{planet, aspect, date}` (Task 1) and Task 2 reads `h.planet`, `h.aspect`, `h.date`. `factSheet` sign entries carry `moonSector.name`, `aspects[].planet/name/planetSector/rulerInvolved`, `events[].body/detail/sector/rulerInvolved` (Task 2), which is what `validate` and `buildMessages` read (Task 3). The JSON key is the lowercase sign name in Task 3 and Task 5 reads `prose.signs[reading.sign.toLowerCase()]`. `sky-calendar-engine.js` changes in Task 1, so its cache key bump in Task 5 and its inclusion in the release in Task 7 are both required.
