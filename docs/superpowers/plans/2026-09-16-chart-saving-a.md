# Chart saving, part A (C5a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in reader can save a birth chart, a solar or lunar return, a progressed chart or a horary chart from `/charts/` and reopen it from the journal as the chart it was.

**Architecture:** A new pure module `chart-rooms.js` owns the payload shape, validation, computing a chart from a saved birth, the summaries, the save-control and banner markup, and the restored gate. `chart-in-time.js`, `horary.js` and `natal-room.js` each register their rooms with `Rooms` on attach and keep their own `current()`/`load()`. The server learns the `composite` and `davison` kinds now, so C5b is static only.

**Tech Stack:** Vanilla ES2020, no build step; `node --test tests/*.test.cjs`; Django 5 (`server/ishtar`, run tests with `.venv/Scripts/python.exe manage.py test` from that directory).

**Spec:** `docs/superpowers/specs/2026-09-16-chart-saving-design.md`

**Plan decisions (rulings on the spec):**
- The spec's `birthInputs(profile)` is realised as `birthFromChart(chart)`: every module already holds the resolved natal chart, which carries `birthday`, `time`, `location`, `houseSystem` and `orbScale`; `NatalEngine.calculate` now also returns `fold` so the chart carries everything a payload needs. No module gains a `BirthProfile` dependency.
- A return chart's `target` is the date the reading was saved (the engine's `reference`), so reopening reproduces the same return; `offset` is the return index. A reference at noon UTC of that date is accepted as close enough.
- `chart-rooms.js` validates every kind in the spec's table, including C5b's, so C5b only wires modules.
- `natal-room.js` has no Node wiring test: its IIFE reaches nine globals and a live DOM. Its `current()`/`load()` are thin calls into `chart-rooms.js`, which is unit-tested, and the controller verifies the natal room in the browser before merge.
- `data-room="natal"` goes on `#birthday-output` itself.

## Global Constraints

Tags: **[Glenn]** his instruction; **[codebase]** already enforced; **[program]** Part E; **[spec]** a C5 decision; **[judgement]** mine.

- No new dependencies. [Glenn]
- Every payload embeds its inputs and reopens without the live profile. [spec]
- Saving is explicit and disclosed beside the button; nothing is stored on the reader's behalf. [spec]
- `chart-rooms.js` is a pure UMD module tested with `node --test`; UI modules register with `Rooms` on attach. [program, codebase]
- Bare `typeof` guards, never `window.X`. British spelling, curly apostrophes. [codebase]
- Keyboard operable; `role="status"` banners; 390px and 1400px verified. [program]
- Cache keys bumped on every changed file, on every page that loads it. Exact keys are given in each task. [codebase]
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. [session attribution instruction]
- Never `git add -A`. Commands on `V:` can exceed two minutes. [codebase]

---

### Task 1: The `composite` and `davison` kinds on the server

**Files:**
- Modify: `server/ishtar/readings/kinds.py`
- Create: `server/ishtar/readings/migrations/0006_reading_kind_c5.py`
- Test: `server/ishtar/readings/tests/test_readings.py`

**Interfaces:**
- Produces: two accepted kinds, `composite` and `davison`, category `charts`, labels `Composite chart` and `Davison chart`.

- [ ] **Step 1: Write the failing tests.** In `test_readings.py`, next to `test_c4_kinds_are_divination`:

```python
    def test_c5_kinds_are_charts(self):
        for kind in ('composite', 'davison'):
            self.assertIn(kind, KINDS)
            self.assertEqual(KINDS[kind][1], 'charts')
        self.assertEqual(KINDS['composite'][0], 'Composite chart')
        self.assertEqual(KINDS['davison'][0], 'Davison chart')
```

and in the API test class, next to `test_grand_tableau_saves_and_reads_back`:

```python
    def test_two_person_chart_kinds_save(self):
        birth = {'date': '1980-03-12', 'time': '06:30', 'place': {'name': 'London', 'lat': 51.5, 'lon': -0.12, 'tz': 'Europe/London'}, 'houseSystem': 'placidus', 'fold': '', 'orbScale': 1}
        for kind in ('composite', 'davison'):
            created = self.create({'kind': kind, 'layout': 'placidus', 'payload': {'v': 1, 'birth': birth, 'partner': birth}})
            self.assertEqual(created.status_code, 201, kind)
            self.assertEqual(created.json()['reading']['category'], 'charts')
```

Check the response shape of `self.create(...).json()` against `test_grand_tableau_saves_and_reads_back` and use the same key path.

- [ ] **Step 2: Run the tests.** From `server/ishtar`: `.venv/Scripts/python.exe manage.py test readings`. Expected: the two new tests fail (`composite` not in KINDS; 400 from the API).

- [ ] **Step 3: Add the kinds.** In `kinds.py`, after the `'synastry'` line:

```python
    'composite': ('Composite chart', 'charts'),
    'davison': ('Davison chart', 'charts'),
```

- [ ] **Step 4: Make the migration.** From `server/ishtar`: `.venv/Scripts/python.exe manage.py makemigrations readings -n reading_kind_c5`. The generated file must be `0006_reading_kind_c5.py`, depend on `('readings', '0005_reading_kind_c4')`, and contain one `AlterField` on `reading.kind` whose `choices` list is the C4 list with `('composite', 'Composite chart'), ('davison', 'Davison chart')` after `('synastry', 'Synastry')`. Run `manage.py migrate` locally.

- [ ] **Step 5: Run the tests.** Expected: all readings tests pass.

- [ ] **Step 6: Commit.** `git add server/ishtar/readings/kinds.py server/ishtar/readings/migrations/0006_reading_kind_c5.py server/ishtar/readings/tests/test_readings.py`; message `feat(server): composite and davison reading kinds`.

---

### Task 2: The new kinds in `rooms.js`

**Files:**
- Modify: `rooms.js`; the `rooms.js?v=c4-kinds-1` script tag on all eight pages: `account/index.html`, `charts/index.html`, `divination/index.html`, `eastern/index.html`, `index.html`, `numerology/index.html`, `sky/index.html`, `tarot/index.html`.
- Test: `tests/rooms.test.cjs`

**Interfaces:**
- Produces: `Rooms.pageFor('composite') === '/charts/'`, `Rooms.labelFor('davison') === 'Davison chart'`.

- [ ] **Step 1: Update the test.** In `tests/rooms.test.cjs`, the test `labelFor and pageFor cover every kind…` asserts `expected.length` is `20`; change it to `22`.

- [ ] **Step 2: Run it.** `node --test tests/rooms.test.cjs`. Expected: fails on the count.

- [ ] **Step 3: Add the entries.** In `PAGES`, after `synastry: '/charts/'`, add `composite: '/charts/', davison: '/charts/'`. In `LABELS`, after `synastry: 'Synastry'`, add `composite: 'Composite chart', davison: 'Davison chart'`.

- [ ] **Step 4: Bump the key.** Replace `/rooms.js?v=c4-kinds-1` with `/rooms.js?v=c5-kinds-1` on all eight pages.

- [ ] **Step 5: Run the suite.** `node --test tests/*.test.cjs`. Expected: all pass (pages.test.cjs checks the script tags).

- [ ] **Step 6: Commit.** `git add rooms.js tests/rooms.test.cjs account/index.html charts/index.html divination/index.html eastern/index.html index.html numerology/index.html sky/index.html tarot/index.html`; message `feat(rooms): composite and davison kinds`.

---

### Task 3: `chart-rooms.js`

**Files:**
- Create: `chart-rooms.js`, `tests/chart-rooms.test.cjs`
- Modify: `natal-engine.js:157` (the `calculate` return adds `fold`); the `natal-engine.js?v=chart-depth-1` tag on `charts/index.html`, `eastern/index.html`, `index.html`, `numerology/index.html`, `sky/index.html`; `charts/index.html` (load `chart-rooms.js`); `account.css` and its `account.css?v=journal-filters-1` tag on the eight pages of Task 2; `tests/pages.test.cjs` (`DEPENDENCIES`).

**Interfaces:**
- Produces `ChartRooms` (UMD; in Node `require('../chart-rooms.js')`):
  - `birthFromChart(chart)` → `{date, time, place: {name, lat, lon, tz}, houseSystem, fold, orbScale}` from a ready natal chart, or `null`.
  - `placeFrom(location)` → `{name, lat, lon, tz}` from `{label, latitude, longitude, timeZone}`; `locationFrom(place)` → the reverse, with `label`.
  - `validate(kind, payload)` → a sanitised payload or `null`.
  - `natalFrom(birth)` → `NatalEngine.calculate(...)` for a saved birth.
  - `reading(kind, {payload, summary, layout, question})` → the object `current()` returns.
  - `describe(birth)` → `'12 March 1980 at 06:30, London'`; `describeMoment(moment)` → the same shape for a horary moment.
  - `summaries.natal(chart)`, `summaries.solarReturn(model)`, `summaries.lunarReturn(model)`, `summaries.progressed({target, method})`, `summaries.horary({result, house, date})`.
  - `saveControl(kind, note)` and `banner(text, {live})` → markup strings; `NOTES.one`, `NOTES.two`, `NOTES.horary`.
  - `restoredGate()` → `{set(value), clear(), get(), active()}`.

- [ ] **Step 1: Write the failing tests.** Create `tests/chart-rooms.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');

const BIRTH = {date: '1990-07-15', time: '14:30', place: {name: 'New York, United States', lat: 40.7143, lon: -74.006, tz: 'America/New_York'}, houseSystem: 'placidus', fold: '', orbScale: 1};
const chart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}});

test('birthFromChart and natalFrom round-trip a chart', () => {
  assert.equal(chart.status, 'ready');
  assert.equal(chart.fold, '');
  const birth = R.birthFromChart(chart);
  assert.deepEqual(birth, BIRTH);
  const again = R.natalFrom(birth);
  assert.equal(again.status, 'ready');
  assert.equal(again.points[0].longitude, chart.points[0].longitude);
  assert.equal(R.birthFromChart({status: 'missing'}), null);
  assert.deepEqual(R.locationFrom(BIRTH.place), {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'});
});

test('validate accepts each kind and refuses bad payloads', () => {
  const ok = {
    natal: {v: 1, birth: BIRTH},
    'solar-return': {v: 1, birth: BIRTH, target: '2026-09-16', offset: -1, place: null},
    'lunar-return': {v: 1, birth: BIRTH, target: '2026-09-16', offset: 2, place: {name: 'Paris', lat: 48.85, lon: 2.35, tz: 'Europe/Paris'}},
    progressed: {v: 1, birth: BIRTH, target: '2026-09-16', method: 'solar-arc'},
    synastry: {v: 1, birth: BIRTH, partner: BIRTH},
    composite: {v: 1, birth: BIRTH, partner: BIRTH},
    davison: {v: 1, birth: BIRTH, partner: BIRTH},
    horary: {v: 1, moment: {date: '2026-09-16', time: '14:02', place: BIRTH.place}, house: 7},
    jyotish: {v: 1, birth: BIRTH, tab: 'gochar', gochar: '2026-09-16'},
    bazi: {v: 1, birth: BIRTH, pillar: 2},
  };
  for (const [kind, payload] of Object.entries(ok)) assert.deepEqual(R.validate(kind, payload), payload, kind);
  // Unknown fields are dropped; numbers arrive as numbers.
  assert.deepEqual(R.validate('natal', {v: 1, birth: {...BIRTH, extra: 1}, extra: 2}), {v: 1, birth: BIRTH});
  assert.deepEqual(R.validate('bazi', {v: 1, birth: BIRTH, pillar: '3'}), {v: 1, birth: BIRTH, pillar: 3});
  const bad = [
    ['natal', null], ['natal', {v: 2, birth: BIRTH}], ['natal', {v: 1}], ['made-up', ok.natal],
    ['natal', {v: 1, birth: {...BIRTH, date: '1990-7-15'}}],
    ['natal', {v: 1, birth: {...BIRTH, time: '25:00'}}],
    ['natal', {v: 1, birth: {...BIRTH, place: {...BIRTH.place, lat: 95}}}],
    ['natal', {v: 1, birth: {...BIRTH, place: {...BIRTH.place, lon: -200}}}],
    ['natal', {v: 1, birth: {...BIRTH, place: {...BIRTH.place, tz: ''}}}],
    ['natal', {v: 1, birth: {...BIRTH, houseSystem: 'koch'}}],
    ['natal', {v: 1, birth: {...BIRTH, fold: 'maybe'}}],
    ['natal', {v: 1, birth: {...BIRTH, orbScale: 2}}],
    ['solar-return', {v: 1, birth: BIRTH, target: 'today', offset: 0, place: null}],
    ['solar-return', {v: 1, birth: BIRTH, target: '2026-09-16', offset: 1.5, place: null}],
    ['progressed', {v: 1, birth: BIRTH, target: '2026-09-16', method: 'primary'}],
    ['synastry', {v: 1, birth: BIRTH}],
    ['horary', {v: 1, moment: {date: '2026-09-16', time: '14:02', place: BIRTH.place}, house: 13}],
    ['horary', {v: 1, moment: {date: '2026-09-16', time: '14:02'}, house: 7}],
    ['jyotish', {v: 1, birth: BIRTH, tab: 'moon', gochar: '2026-09-16'}],
    ['bazi', {v: 1, birth: BIRTH, pillar: 4}],
  ];
  for (const [kind, payload] of bad) assert.equal(R.validate(kind, payload), null, `${kind} ${JSON.stringify(payload)}`);
});

test('reading clips to the server caps and describe reads well', () => {
  const r = R.reading('natal', {payload: {v: 1, birth: BIRTH}, summary: 'x'.repeat(130), layout: 'y'.repeat(50), question: 'q'.repeat(250)});
  assert.deepEqual(Object.keys(r).sort(), ['deck', 'focus', 'kind', 'layout', 'payload', 'question', 'summary']);
  assert.equal(r.kind, 'natal'); assert.equal(r.deck, ''); assert.equal(r.focus, '');
  assert.equal(r.summary.length, 120); assert.equal(r.layout.length, 40); assert.equal(r.question.length, 240);
  assert.equal(R.reading('natal', {payload: {}, summary: 's'}).question, '');
  assert.equal(R.describe(BIRTH), '15 July 1990 at 14:30, New York, United States');
  assert.equal(R.describe({...BIRTH, place: {...BIRTH.place, name: ''}}), '15 July 1990 at 14:30, 40.7143, -74.006');
  assert.equal(R.describeMoment({date: '2026-09-16', time: '14:02', place: {name: 'London', lat: 51.5, lon: -0.1, tz: 'Europe/London'}}), '16 September 2026 at 14:02, London');
});

test('summaries name what the chart showed', () => {
  assert.equal(R.summaries.natal(chart), `Sun ${chart.points[0].sign} · Moon ${chart.points[1].sign} · Ascendant ${chart.axes[0].sign}`);
  const solar = {moment: '2026-07-15T02:11:00.000Z', chart: {axes: [{sign: 'Scorpio'}]}};
  assert.equal(R.summaries.solarReturn(solar), 'Solar return 2026 · Ascendant Scorpio');
  assert.equal(R.summaries.lunarReturn({moment: '2026-03-12T22:40:00.000Z', chart: {axes: [{sign: 'Leo'}]}}), 'Lunar return 12 Mar 2026 · Ascendant Leo');
  assert.equal(R.summaries.progressed({target: '2026-09-16', method: 'secondary'}), 'Progressed to 2026 · secondary');
  assert.equal(R.summaries.horary({result: {chart: {axes: [{sign: 'Gemini'}]}}, house: 7, date: '2026-09-16'}), 'House 7 · Ascendant Gemini · 16 Sep 2026');
});

test('save control, banner and gate', () => {
  const control = R.saveControl('natal', R.NOTES.one);
  assert.match(control, /^<p class="save-reading"><button type="button" data-save-reading="natal">Sign in to save this chart<\/button><span role="status" aria-live="polite"><\/span><span class="save-note">Saving stores the birth details this chart was cast from\.<\/span><\/p>$/);
  assert.match(R.saveControl('horary', R.NOTES.horary), /moment, the place and your question/);
  assert.match(R.NOTES.two, /both people’s birth details/);
  assert.equal(R.banner('Saved chart · cast for <x>', {live: 'natal'}), '<p class="restored-chart" role="status">Saved chart · cast for &lt;x&gt; <button type="button" data-chart-live="natal">Use my chart</button></p>');
  assert.equal(R.banner('Saved question'), '<p class="restored-chart" role="status">Saved question</p>');
  const gate = R.restoredGate();
  assert.equal(gate.active(), false);
  gate.set({a: 1});
  assert.equal(gate.active(), true); assert.deepEqual(gate.get(), {a: 1});
  gate.clear();
  assert.equal(gate.active(), false); assert.equal(gate.get(), null);
});
```

- [ ] **Step 2: Run it.** `node --test tests/chart-rooms.test.cjs`. Expected: fails, module not found.

- [ ] **Step 3: Return `fold` from the engine.** In `natal-engine.js`, the last line of `calculate` reads `return {...chart,birthday,time,offsetMinutes:resolved.offsetMinutes,ambiguousTime:candidates.length>1};`. Change it to `return {...chart,birthday,time,fold,offsetMinutes:resolved.offsetMinutes,ambiguousTime:candidates.length>1};`.

- [ ] **Step 4: Create `chart-rooms.js`.**

```js
/* Shared saving contract for the chart rooms on /charts/ and /eastern/: the payload shape
   and its validation, a chart computed from a saved birth, the journal summaries, the
   save control and restored banner markup, and the gate that keeps a reopened chart on
   screen while the live profile changes. Spec: docs/superpowers/specs/2026-09-16-chart-saving-design.md */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./natal-engine.js'));
  else root.ChartRooms = factory(NatalEngine);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (natal) {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  const HOUSE_SYSTEMS = ['placidus', 'whole-sign', 'equal', 'regiomontanus'];
  const METHODS = ['secondary', 'tertiary', 'solar-arc'];
  const JYOTISH_TABS = ['rashi', 'nakshatras', 'dashas', 'navamsa', 'gochar'];
  const KINDS = ['natal', 'solar-return', 'lunar-return', 'progressed', 'synastry', 'composite', 'davison', 'horary', 'jyotish', 'bazi'];
  const NOTES = {
    one: 'Saving stores the birth details this chart was cast from.',
    two: 'Saving stores both people’s birth details.',
    horary: 'Saving stores the moment, the place and your question.'
  };

  const clip = (value, max) => String(value ?? '').slice(0, max);
  const isDate = value => typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
  const isTime = value => typeof value === 'string' && TIME.test(value);

  function place(value) {
    if (!value || typeof value !== 'object') return null;
    const lat = Number(value.lat), lon = Number(value.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    if (typeof value.tz !== 'string' || !value.tz.trim() || value.tz.length > 64) return null;
    return {name: clip(typeof value.name === 'string' ? value.name : '', 120), lat, lon, tz: value.tz};
  }
  function birth(value) {
    if (!value || typeof value !== 'object') return null;
    const where = place(value.place);
    if (!isDate(value.date) || !isTime(value.time) || !where) return null;
    if (!HOUSE_SYSTEMS.includes(value.houseSystem) || !['', 'earlier', 'later'].includes(value.fold)) return null;
    const orbScale = Number(value.orbScale);
    if (![0.75, 1, 1.25].includes(orbScale)) return null;
    return {date: value.date, time: value.time, place: where, houseSystem: value.houseSystem, fold: value.fold, orbScale};
  }
  const integer = (value, min, max) => { const n = Number(value); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

  // A sanitised payload for the kind, or null. Fields the table does not name are dropped.
  function validate(kind, payload) {
    if (!KINDS.includes(kind) || !payload || typeof payload !== 'object' || payload.v !== 1) return null;
    if (kind === 'horary') {
      const moment = payload.moment && typeof payload.moment === 'object' ? payload.moment : null;
      const where = moment && place(moment.place), house = integer(payload.house, 1, 12);
      if (!moment || !isDate(moment.date) || !isTime(moment.time) || !where || house === null) return null;
      return {v: 1, moment: {date: moment.date, time: moment.time, place: where}, house};
    }
    const own = birth(payload.birth);
    if (!own) return null;
    const out = {v: 1, birth: own};
    if (kind === 'solar-return' || kind === 'lunar-return') {
      const offset = integer(payload.offset, -1000, 1000);
      if (!isDate(payload.target) || offset === null) return null;
      const override = payload.place === null || payload.place === undefined ? null : place(payload.place);
      if (payload.place && !override) return null;
      return {...out, target: payload.target, offset, place: override};
    }
    if (kind === 'progressed') {
      if (!isDate(payload.target) || !METHODS.includes(payload.method)) return null;
      return {...out, target: payload.target, method: payload.method};
    }
    if (kind === 'synastry' || kind === 'composite' || kind === 'davison') {
      const partner = birth(payload.partner);
      return partner ? {...out, partner} : null;
    }
    if (kind === 'jyotish') {
      if (!JYOTISH_TABS.includes(payload.tab) || !isDate(payload.gochar)) return null;
      return {...out, tab: payload.tab, gochar: payload.gochar};
    }
    if (kind === 'bazi') {
      const pillar = integer(payload.pillar, 0, 3);
      return pillar === null ? null : {...out, pillar};
    }
    return out;
  }

  const placeFrom = location => ({name: location.label || '', lat: location.latitude, lon: location.longitude, tz: location.timeZone});
  const locationFrom = where => ({latitude: where.lat, longitude: where.lon, timeZone: where.tz, label: where.name});
  function birthFromChart(chart) {
    if (!chart || chart.status !== 'ready' || !chart.location) return null;
    return {date: chart.birthday, time: chart.time, place: placeFrom(chart.location), houseSystem: chart.houseSystem, fold: chart.fold || '', orbScale: chart.orbScale};
  }
  const natalFrom = value => natal.calculate({birthday: value.date, time: value.time, location: locationFrom(value.place), houseSystem: value.houseSystem, fold: value.fold, orbScale: value.orbScale});

  const reading = (kind, {payload, summary = '', layout = '', question = ''}) =>
    ({kind, deck: '', layout: clip(layout, 40), question: clip(question, 240), focus: '', summary: clip(summary, 120), payload});

  // Fixed tables, not toLocaleDateString: newer ICU spells September "Sept" in en-GB.
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const longDate = date => { const d = new Date(date + 'T00:00:00Z'); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  const shortDate = value => { const d = new Date(value); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`; };
  const whereText = where => where.name || `${where.lat}, ${where.lon}`;
  const describe = value => `${longDate(value.date)} at ${value.time}, ${whereText(value.place)}`;
  const describeMoment = describe;

  const summaries = {
    natal: chart => `Sun ${chart.points[0].sign} · Moon ${chart.points[1].sign} · Ascendant ${chart.axes[0].sign}`,
    solarReturn: model => `Solar return ${new Date(model.moment).getUTCFullYear()} · Ascendant ${model.chart.axes[0].sign}`,
    lunarReturn: model => `Lunar return ${shortDate(model.moment)} · Ascendant ${model.chart.axes[0].sign}`,
    progressed: ({target, method}) => `Progressed to ${target.slice(0, 4)} · ${method}`,
    horary: ({result, house, date}) => `House ${house} · Ascendant ${result.chart.axes[0].sign} · ${shortDate(date + 'T00:00:00Z')}`
  };

  const saveLabel = () => typeof IshtarAccount !== 'undefined' && IshtarAccount.state().signedIn ? 'Save this chart to my journal' : 'Sign in to save this chart';
  const saveControl = (kind, note) => `<p class="save-reading"><button type="button" data-save-reading="${kind}">${saveLabel()}</button><span role="status" aria-live="polite"></span><span class="save-note">${esc(note)}</span></p>`;
  const banner = (text, {live} = {}) => `<p class="restored-chart" role="status">${esc(text)}${live ? ` <button type="button" data-chart-live="${live}">Use my chart</button>` : ''}</p>`;

  // While a reopened chart is on screen, profile pushes leave it alone; "Use my chart" clears it.
  function restoredGate() {
    let value = null;
    return {set(next) { value = next; }, clear() { value = null; }, get: () => value, active: () => value !== null};
  }

  return {KINDS, NOTES, validate, birthFromChart, placeFrom, locationFrom, natalFrom, reading, describe, describeMoment, summaries, saveControl, banner, restoredGate};
});
```

- [ ] **Step 5: Run the tests.** `node --test tests/chart-rooms.test.cjs tests/natal-engine.test.cjs`. Expected: pass. If a `describe` string differs only by the locale's formatting of the month, keep `en-GB` and adjust nothing else.

- [ ] **Step 6: Load it on `/charts/` and style the control.** In `charts/index.html`, after the `natal-engine.js` tag add `<script src="/chart-rooms.js?v=1"></script>`. Change `/natal-engine.js?v=chart-depth-1` to `/natal-engine.js?v=c5-1` on `charts/index.html`, `eastern/index.html`, `index.html`, `numerology/index.html` and `sky/index.html`. Append to `account.css`:

```css
.save-reading .save-note { flex-basis: 100%; font-size: 12px; line-height: 1.7; color: rgba(255,250,244,.7); }
.restored-chart { margin: 0 0 16px; padding: 12px 16px; border: 1px solid var(--gold, #c9a86a); border-radius: 8px; font-size: 14px; line-height: 1.6; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.restored-chart button { min-height: 44px; padding: 8px 16px; border: 1px solid currentColor; border-radius: 22px; background: transparent; color: inherit; font-size: 13px; }
```

Change `/account.css?v=journal-filters-1` to `/account.css?v=c5-1` on the same eight pages as Task 2. Check `account.css` is loaded on `/charts/` (it is, in the `<head>`); if `.save-reading` there sets a light background that clashes with the dark chart sections, scope the new rules under `.charts-page` or the page's body class instead and say so in the report.

- [ ] **Step 7: Record the dependency.** In `tests/pages.test.cjs` `DEPENDENCIES`, add `'chart-rooms.js': ['natal-engine.js'],` with the comment `// The UMD factory receives the bare NatalEngine.`

- [ ] **Step 8: Run the suite.** `node --test tests/*.test.cjs`. Expected: all pass.

- [ ] **Step 9: Commit.** `git add chart-rooms.js tests/chart-rooms.test.cjs natal-engine.js account.css tests/pages.test.cjs charts/index.html eastern/index.html index.html numerology/index.html sky/index.html account/index.html divination/index.html tarot/index.html`; message `feat(charts): chart-rooms, the shared saving contract for chart rooms`.

---

### Task 4: Saving solar returns, lunar returns and progressed charts

**Files:**
- Modify: `chart-in-time.js`; `charts/index.html` (`chart-in-time.js?v=1` → `v=2`; `data-room` on `#chart-in-time`); `tests/pages.test.cjs`
- Test: `tests/chart-in-time-room.test.cjs` (new)

**Interfaces:**
- Consumes: `ChartRooms` from Task 3; `Rooms.register` from `rooms.js`.
- Produces: rooms `solar-return`, `lunar-return`, `progressed` registered inside `ChartInTime.attach`. Payloads: returns `{v: 1, birth, target, offset, place}`; progressed `{v: 1, birth, target, method}`.

- [ ] **Step 1: Write the failing test.** Create `tests/chart-in-time-room.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const Rooms = require('../rooms.js');
const ChartRooms = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');
const ChartInTimeEngine = require('../chart-in-time-engine.js');
const ChartInTimeText = require('../chart-in-time-text.js');

// A minimal stand-in DOM element: properties are plain fields, queries return cached children.
const el = () => { const cache = {}; return {innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false, open: false, min: '', dataset: {}, style: {},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); },
  addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}}; };

const chart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}});
const other = NatalEngine.calculate({birthday: '1985-11-29', time: '09:15', location: {latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London', label: 'London, United Kingdom'}});

function boot() {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  const src = fs.readFileSync(path.join(__dirname, '../chart-in-time.js'), 'utf8');
  const BirthplaceSearch = {attach: () => ({getSelection: () => null, restore() {}})};
  const ChartInTime = new Function('BirthplaceSearch', 'ChartInTimeEngine', 'ChartInTimeText', 'BiWheel', 'NatalEngine', 'Rooms', 'ChartRooms', 'document', src + '\nreturn ChartInTime;')
    (BirthplaceSearch, ChartInTimeEngine, ChartInTimeText, {render: () => ''}, NatalEngine, Rooms, ChartRooms, {querySelector: () => el()});
  // A real <select> defaults to its first option; the stub must be seeded before attach renders.
  root.querySelector('#cit-method').value = 'secondary';
  const api = ChartInTime.attach(root, {});
  return {root, listeners, api};
}

test('chart in time registers three rooms and their readings round-trip', () => {
  const {root, listeners, api} = boot();
  assert.deepEqual(Rooms.list().map(r => r.kind).sort(), ['lunar-return', 'progressed', 'solar-return']);
  assert.equal(Rooms.get('solar-return').current(), null, 'nothing to save before a chart');
  api.setBirthChart(chart);
  const solar = Rooms.get('solar-return').current();
  assert.equal(solar.kind, 'solar-return');
  assert.deepEqual(solar.payload.birth, ChartRooms.birthFromChart(chart));
  assert.match(solar.payload.target, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(solar.payload.offset, 0); assert.equal(solar.payload.place, null);
  assert.match(solar.summary, /^Solar return \d{4} · Ascendant /);
  assert.equal(solar.layout, 'placidus');
  assert.match(root.querySelector('#cit-solar-output').innerHTML, /data-save-reading="solar-return"/);
  assert.match(root.querySelector('#cit-solar-output').innerHTML, /Saving stores the birth details this chart was cast from\./);

  // Progressed: the inputs come from the two controls.
  root.querySelector('#cit-method').value = 'tertiary'; root.querySelector('#cit-target').value = '2026-09-16';
  listeners.click({target: {closest: () => ({dataset: {citTab: 'progressed'}})}});
  const prog = Rooms.get('progressed').current();
  assert.deepEqual({...prog.payload, birth: undefined}, {v: 1, birth: undefined, target: '2026-09-16', method: 'tertiary'});
  assert.equal(prog.summary, 'Progressed to 2026 · tertiary'); assert.equal(prog.layout, 'tertiary');

  // Reopen a lunar return from a saved reading with a place override and an offset.
  const saved = ChartRooms.reading('lunar-return', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), target: '2026-03-01', offset: 1, place: {name: 'Paris', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'}}});
  assert.equal(Rooms.get('lunar-return').load(saved), true);
  const out = root.querySelector('#cit-lunar-output').innerHTML;
  assert.match(out, /class="restored-chart" role="status">Saved chart · cast for 29 November 1985 at 09:15, London, United Kingdom/);
  assert.match(out, /data-chart-live="lunar-return"/);
  assert.match(out, /cast for Paris/);
  const reopened = Rooms.get('lunar-return').current();
  assert.deepEqual(reopened.payload, saved.payload, 'current() of a reopened chart is the saved payload');
  assert.match(reopened.summary, /^Lunar return \d{1,2} \w{3} 2026 · Ascendant /);

  // A profile push while restored changes nothing on screen; "Use my chart" returns to the live chart.
  api.setBirthChart(chart);
  assert.deepEqual(Rooms.get('lunar-return').current().payload.birth, ChartRooms.birthFromChart(other));
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'lunar-return'}})}});
  assert.deepEqual(Rooms.get('lunar-return').current().payload.birth, ChartRooms.birthFromChart(chart));
  assert.doesNotMatch(root.querySelector('#cit-lunar-output').innerHTML, /restored-chart/);

  // Bad payloads are refused and leave the state alone.
  assert.equal(Rooms.get('progressed').load({payload: {v: 1, birth: ChartRooms.birthFromChart(other), target: '2026-09-16', method: 'primary'}}), false);
  assert.deepEqual(Rooms.get('lunar-return').current().payload.birth, ChartRooms.birthFromChart(chart));
  // The sample chart is never saved.
  listeners.click({target: {closest: () => ({dataset: {citSample: ''}})}});
  assert.equal(Rooms.get('solar-return').current(), null);
});
```

- [ ] **Step 2: Run it.** `node --test tests/chart-in-time-room.test.cjs`. Expected: fails (no rooms registered).

- [ ] **Step 3: Implement.** In `chart-in-time.js`, inside `attach`:

  - After `const offsets = {solar:0, lunar:0};` add:
    ```js
    const restored = ChartRooms.restoredGate();   // {birth, chart, place, reference} while a saved chart is open
    const lastModel = {solar: null, lunar: null, progressed: null};
    const KIND_OF = {solar: 'solar-return', lunar: 'lunar-return', progressed: 'progressed'};
    const TAB_OF = {'solar-return': 'solar', 'lunar-return': 'lunar', progressed: 'progressed'};
    ```
  - Change `place()` to: `function place() { if (restored.active()) { const r = restored.get(); return r.place ? ChartRooms.locationFrom(r.place) : chart.location; } return manualLocation || placePicker.getSelection() || chart?.location || null; }`
  - In `renderReturn`, change the engine call's `reference:new Date()` to `reference: restored.active() ? new Date(restored.get().reference + 'T12:00:00Z') : new Date()`. After the `error` early return, add `lastModel[kind] = model;` (set `lastModel[kind] = null` in both early returns). Prepend `restoredBanner(KIND_OF[kind])` to the output template and append `saveControl(KIND_OF[kind])` after the final `</details>`.
  - In `renderProgressed`, likewise set `lastModel.progressed` and add the banner and control.
  - Add, before `renderActive`:
    ```js
    const restoredBanner = kind => restored.active() ? ChartRooms.banner(`Saved chart · cast for ${ChartRooms.describe(restored.get().birth)}`, {live: kind}) : '';
    const saveControl = kind => usingSample ? '' : ChartRooms.saveControl(kind, ChartRooms.NOTES.one);
    function selectTab(name) {
      tab = name;
      root.querySelectorAll('[data-cit-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.citTab === tab)));
      root.querySelectorAll('.cit-view').forEach(panel => panel.hidden = panel.id !== `cit-${tab}`);
      renderActive();
    }
    function current(kind) {
      const key = TAB_OF[kind];
      if (!chart || usingSample || !lastModel[key]) return null;
      const birth = restored.active() ? restored.get().birth : ChartRooms.birthFromChart(chart);
      if (!birth) return null;
      if (kind === 'progressed') {
        const target = $('#cit-target').value, method = $('#cit-method').value;
        return ChartRooms.reading(kind, {payload: {v: 1, birth, target, method}, summary: ChartRooms.summaries.progressed({target, method}), layout: method});
      }
      const r = restored.get();
      const payload = {v: 1, birth, target: r ? r.reference : today(), offset: offsets[key], place: r ? r.place : (chosenPlace() ? ChartRooms.placeFrom(chosenPlace()) : null)};
      const summary = kind === 'solar-return' ? ChartRooms.summaries.solarReturn(lastModel[key]) : ChartRooms.summaries.lunarReturn(lastModel[key]);
      return ChartRooms.reading(kind, {payload, summary, layout: birth.houseSystem});
    }
    function load(kind, reading) {
      const payload = ChartRooms.validate(kind, reading?.payload);
      if (!payload) return false;
      const natal = ChartRooms.natalFrom(payload.birth);
      if (natal.status !== 'ready') return false;
      const key = TAB_OF[kind];
      usingSample = false;
      restored.set({birth: payload.birth, chart: natal, place: payload.place || null, reference: payload.target});
      chart = natal;
      if (kind === 'progressed') { $('#cit-target').value = payload.target; $('#cit-method').value = payload.method; }
      else offsets[key] = payload.offset;
      targetFloor(); profileStatus(); selectTab(key);
      if (!lastModel[key]) { restored.clear(); chart = savedChart; renderActive(); return false; }
      if (typeof MobileSections !== 'undefined') MobileSections.reveal(root);
      return true;
    }
    ```
  - In the click handler, replace the `citTab` branch body with `selectTab(data.citTab);` and add:
    ```js
    if ('chartLive' in data) { restored.clear(); chart = usingSample ? chart : savedChart; targetFloor(); profileStatus(); renderActive(); }
    ```
    and at the top of the `citSample` branch add `restored.clear();`.
  - In `profileStatus`, when `restored.active()` show `Saved chart · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected place'}` instead of the "Your birth sky" line.
  - In `setBirthChart`, after `savedChart = ...`, add `if (restored.active()) return;`.
  - At the end of `attach`, before `return {`, register:
    ```js
    if (typeof Rooms !== 'undefined' && typeof ChartRooms !== 'undefined') {
      for (const [kind, label] of [['solar-return', 'Solar return'], ['lunar-return', 'Lunar return'], ['progressed', 'Progressed chart']]) {
        Rooms.register(kind, {label, category: 'charts', current: () => current(kind), load: reading => load(kind, reading)});
      }
    }
    ```
  - `ChartRooms` is read bare inside `attach`, and Node's `typeof ChartRooms` guard above covers the registration only; `restored` uses it unconditionally, so `chart-rooms.js` is a hard dependency.

- [ ] **Step 4: Run the test.** `node --test tests/chart-in-time-room.test.cjs tests/chart-in-time.test.cjs`. Expected: pass. If the stand-in DOM lacks a property the module reads, add that property to `el()` rather than changing the module.

- [ ] **Step 5: Page and dependency.** In `charts/index.html`: `chart-in-time.js?v=1` → `v=2`; add `data-room="solar-return lunar-return progressed"` to `<section id="chart-in-time"`. In `tests/pages.test.cjs`, extend `'chart-in-time.js'` with `'chart-rooms.js', 'rooms.js'` and the comment `// ChartRooms.restoredGate() at attach; Rooms.register behind a typeof guard, but without it saving silently disappears.`

- [ ] **Step 6: Run the suite.** `node --test tests/*.test.cjs`. Expected: all pass.

- [ ] **Step 7: Commit.** `git add chart-in-time.js tests/chart-in-time-room.test.cjs tests/pages.test.cjs charts/index.html`; message `feat(charts): save and reopen solar returns, lunar returns and progressed charts`.

---

### Task 5: Saving horary charts

**Files:**
- Modify: `horary.js`; `charts/index.html` (`horary.js?v=1` → `v=2`; `data-room="horary"` on `#horary`); `tests/pages.test.cjs`
- Test: `tests/horary-room.test.cjs` (new)

**Interfaces:**
- Consumes: `ChartRooms`, `Rooms`.
- Produces: room `horary`; payload `{v: 1, moment: {date, time, place}, house}`; `reading.question` is the question text.

- [ ] **Step 1: Write the failing test.** Create `tests/horary-room.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const Rooms = require('../rooms.js');
const ChartRooms = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');
const ClassicalEngine = require('../classical-engine.js');
const HoraryEngine = require('../horary-engine.js');
const HoraryText = require('../horary-text.js');

const el = () => { const cache = {}; return {innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false, open: false, dataset: {}, style: {},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); },
  addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}}; };

test('the horary room saves the moment, the house and the question, and reopens them', async () => {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  // The question form's submit listener is captured so the test can cast from the form.
  root.querySelector('#ho-question-form').addEventListener = (type, fn) => { listeners.submitQuestion = () => fn({preventDefault() {}}); };
  const src = fs.readFileSync(path.join(__dirname, '../horary.js'), 'utf8');
  const Horary = new Function('BirthplaceSearch', 'HoraryEngine', 'HoraryText', 'HoraryChart', 'ClassicalEngine', 'NatalEngine', 'Rooms', 'ChartRooms', src + '\nreturn Horary;')
    ({attach: () => ({getSelection: () => null, restore() {}})}, HoraryEngine, HoraryText, {render: () => ''}, ClassicalEngine, NatalEngine, Rooms, ChartRooms);
  Horary.attach(root);
  const room = Rooms.get('horary');
  assert.ok(room);
  assert.equal(room.current(), null, 'nothing to save before a cast');

  const saved = ChartRooms.reading('horary', {payload: {v: 1, moment: {date: '2026-09-16', time: '14:02', place: {name: 'London, United Kingdom', lat: 51.5085, lon: -0.1257, tz: 'Europe/London'}}, house: 7}, question: 'Will the roof hold through winter?', layout: 'regiomontanus'});
  assert.equal(room.load(saved), true);
  assert.equal(root.querySelector('#ho-question-text').value, 'Will the roof hold through winter?');
  assert.equal(root.querySelector('#ho-house-matter').value, '7');
  assert.equal(root.querySelector('#ho-date').value, '2026-09-16');
  assert.equal(root.querySelector('#ho-manual').checked, true);
  assert.equal(root.querySelector('#ho-zone').value, 'Europe/London');
  const out = root.querySelector('#ho-question-output').innerHTML;
  assert.match(out, /class="restored-chart" role="status">Saved question · 16 September 2026 at 14:02, London, United Kingdom</);
  assert.doesNotMatch(out, /data-chart-live/);
  assert.match(out, /data-save-reading="horary"/);
  assert.match(out, /Saving stores the moment, the place and your question\./);
  const again = room.current();
  assert.deepEqual(again.payload, saved.payload);
  assert.equal(again.question, saved.question);
  assert.equal(again.layout, 'regiomontanus');
  assert.match(again.summary, /^House 7 · Ascendant \w+ · 16 Sep 2026$/);

  // A cast from the form replaces the restored banner; the new question is clipped to 240.
  root.querySelector('#ho-question-text').value = 'x'.repeat(300);
  root.querySelector('#ho-house-matter').value = '2';
  global.requestAnimationFrame = fn => fn();   // castQuestion defers through rAF and setTimeout(…, 0)
  listeners.submitQuestion();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(room.current().question.length, 240);
  assert.equal(room.current().payload.house, 2);
  assert.doesNotMatch(root.querySelector('#ho-question-output').innerHTML, /restored-chart/);
  // A refused load leaves the state alone.
  assert.equal(room.load({payload: {v: 1, moment: {date: '2026-13-01', time: '14:02', place: saved.payload.moment.place}, house: 7}}), false);
  assert.equal(room.current().payload.house, 2);
});
```

- [ ] **Step 2: Run it.** `node --test tests/horary-room.test.cjs`. Expected: fails (no room).

- [ ] **Step 3: Implement.** In `horary.js`:

  - In the template, change `<small>stays on this page only, never saved</small>` to `<small>saved only if you save the chart</small>`.
  - After `let dateTouched = false, electDateTouched = false;` add `let lastCast = null, restoredMoment = null;` (`lastCast` is `{moment, house, question}` for the result on screen).
  - In `resolvedLocation`, the manual label becomes `` $('#ho-place').value.trim() || `Custom coordinates (${latitude}, ${longitude})` ``.
  - Split `castQuestion`: the synchronous part becomes
    ```js
    function castNow({instant, location, houseMatter, dateValue, timeValue}) {
      try {
        const cast = HoraryEngine.cast({date: instant, location, houseMatter});
        if (cast.status !== 'ready') { result = null; lastCast = null; $('#ho-cast-status').textContent = cast.message; return false; }
        result = cast;
        lastCast = {moment: {date: dateValue, time: timeValue, place: ChartRooms.placeFrom(location)}, house: houseMatter, question: $('#ho-question-text').value.trim().slice(0, 240)};
        return true;
      } catch (error) { result = null; lastCast = null; $('#ho-cast-status').textContent = error.message || 'Could not cast this chart.'; return false; }
    }
    ```
    and `castQuestion`'s `requestAnimationFrame` body calls `restoredMoment = null; const ok = castNow({instant, location, houseMatter: houseMatterValue, dateValue, timeValue}); if (ok) $('#ho-cast-status').textContent = \`Chart cast for ${location.label || 'the selected place'}.${dstNote}\`;` then the existing button re-enable and renders.
  - In `renderQuestionOutput`, before the wheel, prepend `restoredMoment ? ChartRooms.banner(\`Saved question · ${ChartRooms.describeMoment(restoredMoment)}\`) : ''` and after `${conventions()}` append `ChartRooms.saveControl('horary', ChartRooms.NOTES.horary)`.
  - Add:
    ```js
    function current() {
      if (!result || !lastCast) return null;
      return ChartRooms.reading('horary', {payload: {v: 1, moment: lastCast.moment, house: lastCast.house}, summary: ChartRooms.summaries.horary({result, house: lastCast.house, date: lastCast.moment.date}), layout: 'regiomontanus', question: lastCast.question});
    }
    function load(reading) {
      const payload = ChartRooms.validate('horary', reading?.payload);
      if (!payload) return false;
      const location = ChartRooms.locationFrom(payload.moment.place);
      let candidates;
      try { candidates = NatalEngine.localTimeCandidates(payload.moment.date, payload.moment.time, location.timeZone); } catch { return false; }
      if (!candidates.length) return false;
      $('#ho-question-text').value = typeof reading.question === 'string' ? reading.question.slice(0, 240) : '';
      $('#ho-house-matter').value = String(payload.house);
      $('#ho-date').value = payload.moment.date; $('#ho-time').value = payload.moment.time; dateTouched = true;
      $('#ho-place').value = payload.moment.place.name;
      $('#ho-manual').checked = true; $('#ho-manual-fields').disabled = false; $('.ho-custom-place').open = true;
      // Strings, as a real input would hold: resolvedLocation() trims them on the next cast.
      $('#ho-lat').value = String(payload.moment.place.lat); $('#ho-lon').value = String(payload.moment.place.lon); $('#ho-zone').value = payload.moment.place.tz;
      if (!castNow({instant: candidates[0].utc, location, houseMatter: payload.house, dateValue: payload.moment.date, timeValue: payload.moment.time})) return false;
      restoredMoment = payload.moment;
      $('#ho-cast-status').textContent = `Saved chart, cast for ${location.label || 'the saved place'}.`;
      selectTab('question');
      if (typeof MobileSections !== 'undefined') MobileSections.reveal(root);
      return true;
    }
    ```
  - Before `return {`, register: `if (typeof Rooms !== 'undefined' && typeof ChartRooms !== 'undefined') Rooms.register('horary', {label: 'Horary chart', category: 'charts', current, load});`

- [ ] **Step 4: Run the tests.** `node --test tests/horary-room.test.cjs tests/horary.test.cjs`. Expected: pass.

- [ ] **Step 5: Page and dependency.** `charts/index.html`: `horary.js?v=1` → `v=2`; `data-room="horary"` on `<section id="horary"`. `tests/pages.test.cjs`: extend `'horary.js'` with `'chart-rooms.js', 'rooms.js'`, comment `// ChartRooms.placeFrom in castNow; Rooms.register behind a typeof guard, without it saving silently disappears.`

- [ ] **Step 6: Run the suite.** Expected: all pass.

- [ ] **Step 7: Commit.** `git add horary.js tests/horary-room.test.cjs tests/pages.test.cjs charts/index.html`; message `feat(charts): save and reopen horary charts with their question`.

---

### Task 6: Saving the birth chart

**Files:**
- Modify: `natal-room.js`; `charts/index.html` (`natal-room.js?v=8` → `v=9`, also on `eastern/index.html` and `sky/index.html`; `data-room="natal"` on `#birthday-output`); `tests/pages.test.cjs`

**Interfaces:**
- Consumes: `ChartRooms`, `Rooms`, `BirthProfile.current()`.
- Produces: room `natal`; payload `{v: 1, birth}`.

No Node test (see the plan decisions); the controller verifies this task in the browser. Keep every change inside the existing `if (birthdayOutput)` guards so `/eastern/` and `/sky/`, which load this module without `#birthday-output` or `chart-rooms.js`, are untouched.

- [ ] **Step 1: Extract the render.** Turn the body of `BirthProfile.subscribe(state => { … })` (from `if (!birthdayOutput) return;` to the end of the `birthdayOutput.innerHTML = …` assignment) into `function renderPortrait(state, saved)` where `saved` is `null` or the restored `{birth, natal}`. The subscriber becomes:
  ```js
  let restored = null;   // {birth, natal} while a saved chart is open
  BirthProfile.subscribe(state => { if (restored) return; renderPortrait(state, null); });
  ```
  Inside `renderPortrait`, keep `natalModel` handling as it is. Two additions to the template: at the very start of the `birthday-sky` div insert `${saved ? ChartRooms.banner(\`Saved chart · cast for ${ChartRooms.describe(saved.birth)}\`, {live: 'natal'}) : ''}`, and after `chartDepth()` in the `natalModel ? … : …` expression append `+ ChartRooms.saveControl('natal', ChartRooms.NOTES.one)`. When `saved`, the closing `<p class="birthday-privacy">` reads `Showing a saved chart. Your birth profile is unchanged.` instead.

- [ ] **Step 2: Add `current`, `load` and the registration.** Inside `if (birthdayOutput) {`, after the `change` listener:
  ```js
  birthdayOutput.addEventListener("click", event => {
    if (!event.target.closest("[data-chart-live]")) return;
    restored = null;
    renderPortrait(BirthProfile.current(), null);
  });
  if (typeof Rooms !== "undefined" && typeof ChartRooms !== "undefined") Rooms.register("natal", {
    label: "Birth chart", category: "charts",
    current: () => {
      const birth = restored ? restored.birth : ChartRooms.birthFromChart(natalModel);
      return natalModel && birth ? ChartRooms.reading("natal", {payload: {v: 1, birth}, summary: ChartRooms.summaries.natal(natalModel), layout: birth.houseSystem}) : null;
    },
    load: reading => {
      const payload = ChartRooms.validate("natal", reading?.payload);
      if (!payload) return false;
      const natal = ChartRooms.natalFrom(payload.birth);
      if (natal.status !== "ready") return false;
      restored = {birth: payload.birth, natal};
      const b = payload.birth;
      renderPortrait({profile: {birthday: b.date, time: b.time, place: b.place.name, placeLocation: ChartRooms.locationFrom(b.place), houseSystem: b.houseSystem, fold: b.fold, orbScale: b.orbScale}, natal}, restored);
      if (typeof MobileSections !== "undefined") MobileSections.reveal(birthdayOutput);
      return true;
    }
  });
  ```
  The existing click listener's early `return`s are unaffected because the new listener is separate.

- [ ] **Step 3: Page and dependency.** `charts/index.html`: `<div id="birthday-output" class="birthday-output" aria-live="polite" data-room="natal">`; `natal-room.js?v=8` → `v=9` on `charts/index.html`, `eastern/index.html`, `sky/index.html`. `tests/pages.test.cjs`: in `'natal-room.js'`, change the `birthday-output` entry to `{when: 'birthday-output', needs: ['natal-chart.js', 'sky-chart.js', 'birthday-insights.js', 'chart-rooms.js', 'rooms.js']}` with the comment `// ChartRooms.banner/saveControl in renderPortrait and Rooms.register, all inside if (birthdayOutput).`

- [ ] **Step 4: Run the suite.** `node --test tests/*.test.cjs`. Expected: all pass.

- [ ] **Step 5: Commit.** `git add natal-room.js tests/pages.test.cjs charts/index.html eastern/index.html sky/index.html`; message `feat(charts): save and reopen the birth chart`.

---

### Task 7: Documentation

**Files:**
- Modify: `docs/ACCOUNTS.md`, `docs/SITE-STRUCTURE.md`, `docs/CHART-IN-TIME.md`, `docs/HORARY.md`, `docs/NATAL-CHART.md`

- [ ] **Step 1: `docs/ACCOUNTS.md`.** Add a section `## Saved charts (C5a, 2026-09-16)`: the `chart-rooms.js` contract (each exported name in one line), the payload table for the five C5a kinds copied from the spec with the field names as implemented, the three disclosure notes verbatim, the restored gate rule (profile pushes ignored while a saved chart is open; "Use my chart" clears it; horary has no gate because a cast always replaces the result), the `?reading=` route, and that C5b adds the two-person charts, BaZi and Jyotish. Name the tests: `tests/chart-rooms.test.cjs` (5 tests), `tests/chart-in-time-room.test.cjs` (1), `tests/horary-room.test.cjs` (1), and the Django tests.
- [ ] **Step 2: `docs/SITE-STRUCTURE.md`.** Update the `/charts/` script chain (`chart-rooms.js` after `natal-engine.js`), the `data-room` list (natal, solar-return, lunar-return, progressed and horary are registered now; synastry, composite, davison, bazi, jyotish remain forward declarations), and the `PAGES` map with `composite` and `davison`.
- [ ] **Step 3: The three chart docs.** `docs/CHART-IN-TIME.md` and `docs/HORARY.md` each gain a short "Saving" paragraph (what the payload holds, the note shown, what reopening does) and lose any claim that nothing saves; `docs/NATAL-CHART.md` gains the same for the birth chart. Check every claim against the code and use the real test counts (`grep -c "^test(" tests/<file>`).
- [ ] **Step 4: Commit.** `git add docs/ACCOUNTS.md docs/SITE-STRUCTURE.md docs/CHART-IN-TIME.md docs/HORARY.md docs/NATAL-CHART.md`; message `docs: chart saving, part A`.

---

## Notes for the executor

- Stop dev preview servers before any merge.
- Deployment is two-stage: backend (`kinds.py`, migration 0006, with the C4b wrapper's DB backup and health checks), then the static release. The static release replaces `rooms.js`, `natal-engine.js`, `account.css`, `chart-in-time.js`, `horary.js`, `natal-room.js`, `charts/index.html` and the seven other pages' HTML, and adds `chart-rooms.js`.
- Before the merge, the controller checks in the browser: save-control markup and the note on each of the five outputs; reopening a saved reading of each kind through `?reading=`, then a profile change leaving it in place, then "Use my chart"; 390px and 1400px. Signed-in saves need Glenn's login.
- The node suite before this plan is 546 passing.
