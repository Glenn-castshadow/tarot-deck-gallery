# Chart depth (C3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add annual profections, the Part of Fortune, minor aspects and aspect patterns to the natal chart on the charts page.

**Architecture:** One new pure engine, `chart-depth-engine.js`, for profections, the Lot and patterns; the four minor aspects added to `natal-engine.js` as a separate table behind an option, so the existing five-aspect output stays byte-identical; one small render module and a section under the existing natal report.

**Tech Stack:** Vanilla ES2020 in plain `<script>` tags, no build step. UMD modules. Tests are `node --test tests/*.test.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-14-chart-depth-design.md`

## Global Constraints

Each line says where it comes from: **[Glenn]** his instruction, **[codebase]** something the repo already enforces, **[program]** Part E of `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, **[spec]** a decision taken in the C3a spec under Glenn's instruction to complete C3 unattended, **[judgement]** mine in this plan.

- **No backend change and no journal kind.** Nothing on the charts page saves; the spec records why. Do not touch `server/`, `kinds.py`, the migrations or `rooms.js`. [spec]
- **The existing five-aspect output must not change.** `NatalEngine.aspectsFor(points, orbScale)` called without the new option, and `chart.aspects` on every chart, must stay byte-identical. `tests/natal-engine.test.cjs` must pass untouched. [spec]
- **Minor aspects live in a separate field, `chart.minorAspects`**, never merged into `chart.aspects`, because every existing consumer of `chart.aspects` — the wheel, the report, synastry, chart in time — expects exactly the five majors. [judgement, refining the spec's "stores them"]
- **Profections count whole sign from the Ascendant**, whatever house system the chart displays. [spec]
- **The Part of Fortune is sect-sensitive**: day `Asc + Moon − Sun`, night `Asc + Sun − Moon`, sect from `ClassicalEngine.sect(chart)`. [spec]
- **Minor aspect orbs are a fixed 2°**, never multiplied by `orbScale`. [spec]
- **Patterns are computed from majors and minors together, whatever the display toggle says.** [spec]
- Engines are pure UMD modules with no DOM access, tested under `node --test tests/*.test.cjs`. [program, codebase]
- An About disclosure names conventions and sources; copy is checked by a text test for forbidden phrasing. [program]
- Voice: symbolic reflection, no predictions. British spelling, spaced em dashes, curly apostrophes. [codebase]
- Keyboard operable, reduced motion respected, verified at 390px and 1400px. [program]
- No new dependencies. [Glenn] Cache keys bumped on every changed file. [codebase] Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. [session attribution instruction]
- **pyswisseph is not installed in this environment**, so no task regenerates a fixture file; the program's fixture rule is met as the spec's Testing section describes. [spec]

---

### Task 1: Minor aspects in the natal engine

**Files:**
- Modify: `natal-engine.js` (the aspect table, `aspectsFor`, `chartAtInstant`, the export list)
- Create: `tests/chart-depth.test.cjs`

**Interfaces:**
- Produces: `NatalEngine.minorAspectTypes` (array of four); `NatalEngine.aspectsFor(points, orbScale = 1, {minor = false} = {})`; every chart gains `minorAspects`, an array in the same shape as `aspects`.

- [ ] **Step 1: Write the failing tests**

Create `tests/chart-depth.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../natal-engine.js');
const reference = require('./fixtures/natal-reference.json');

const at = (name, longitude, kind = 'planet') => ({name, longitude, speed: 0, kind});

test('the four minor aspects are defined at a fixed two-degree orb', () => {
  const byName = Object.fromEntries(N.minorAspectTypes.map(t => [t.name, t]));
  assert.deepEqual(Object.keys(byName).sort(), ['Quincunx', 'Semi-sextile', 'Semi-square', 'Sesquiquadrate']);
  assert.equal(byName['Semi-sextile'].angle, 30);
  assert.equal(byName['Semi-square'].angle, 45);
  assert.equal(byName['Sesquiquadrate'].angle, 135);
  assert.equal(byName['Quincunx'].angle, 150);
  for (const t of N.minorAspectTypes) assert.equal(t.orb, 2);
});

test('minors are found at their angle and at the orb edge, and not beyond it', () => {
  for (const t of N.minorAspectTypes) {
    const exact = N.aspectsFor([at('A', 0), at('B', t.angle)], 1, {minor: true});
    assert.ok(exact.some(a => a.type === t.name), `${t.name} not found at exactly ${t.angle}°`);
    const edge = N.aspectsFor([at('A', 0), at('B', t.angle + 2)], 1, {minor: true});
    assert.ok(edge.some(a => a.type === t.name), `${t.name} not found at the 2° edge`);
    const beyond = N.aspectsFor([at('A', 0), at('B', t.angle + 2.1)], 1, {minor: true});
    assert.ok(!beyond.some(a => a.type === t.name), `${t.name} found beyond its orb`);
  }
});

test('the orb scale does not widen the minors', () => {
  // 2.4° from a quincunx is outside a fixed 2° orb, but inside 2 × 1.25 = 2.5.
  const wide = N.aspectsFor([at('A', 0), at('B', 152.4)], 1.25, {minor: true});
  assert.ok(!wide.some(a => a.type === 'Quincunx'), 'the orb scale widened a minor aspect');
});

test('omitting the option reproduces the five-aspect output exactly', () => {
  // Every existing caller passes two arguments. If this ever diverges, the wheel, the report,
  // synastry and chart in time all change behaviour at once.
  for (const c of reference.cases) {
    const chart = N.calculate(c.input);
    if (chart.status !== 'ready') continue;
    const points = [...chart.points, ...chart.axes.slice(0, 2)];
    assert.deepEqual(N.aspectsFor(points, chart.orbScale), chart.aspects, `${c.id}: default output moved`);
    assert.deepEqual(N.aspectsFor(points, chart.orbScale, {}), chart.aspects, `${c.id}: empty options moved`);
    assert.ok(chart.aspects.every(a => ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition'].includes(a.type)),
      `${c.id}: a minor aspect leaked into chart.aspects`);
  }
});

test('every chart carries its minor aspects in a separate field', () => {
  const c = reference.cases[0];
  const chart = N.calculate(c.input);
  assert.ok(Array.isArray(chart.minorAspects));
  assert.ok(chart.minorAspects.every(a => ['Semi-sextile', 'Semi-square', 'Sesquiquadrate', 'Quincunx'].includes(a.type)));
});
```

The fixture shape is confirmed: each case has `id`, `input` (passed straight to `calculate`, as `tests/natal-engine.test.cjs` does), `asc`, and `points.<Name>.longitude`. `chart.points` also carries the two nodes with `kind: 'node'`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/chart-depth.test.cjs`
Expected: FAIL, `N.minorAspectTypes` is undefined.

- [ ] **Step 3: Add the table and the option**

In `natal-engine.js`, directly after the existing `aspectTypes` line, add:

```js
  // Minor aspects. A fixed 2° orb that the chart's orb scale deliberately does not multiply: the
  // scale is a statement about how loose the five major aspects are, and these are already the
  // fine-grained layer. Kept in their own table so every existing consumer of aspectTypes, and of
  // chart.aspects, still sees exactly the five majors.
  const minorAspectTypes=[{name:'Semi-sextile',angle:30,orb:2,symbol:'⚺',tone:'adjustment'},{name:'Semi-square',angle:45,orb:2,symbol:'∠',tone:'strain'},{name:'Sesquiquadrate',angle:135,orb:2,symbol:'⚼',tone:'strain'},{name:'Quincunx',angle:150,orb:2,symbol:'⚻',tone:'adjustment'}];
```

Replace `aspectsFor` so the loop runs over the majors with scaling and, only when asked, the minors without it:

```js
  function aspectsFor(points,orbScale=1,{minor=false}={}) {
    const aspects=[];
    const types=minor?[...aspectTypes.map(t=>({...t,scaled:true})),...minorAspectTypes.map(t=>({...t,scaled:false}))]:aspectTypes.map(t=>({...t,scaled:true}));
    for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++) {
      const a=points[i],b=points[j];
      // The nodal axis is inherently opposite; report its contacts with planets instead.
      if((a.kind==='node' && b.kind==='node') || (a.kind==='angle' && b.kind==='angle')) continue;
      const separation=Math.abs(delta(a.longitude,b.longitude));
      for(const type of types) {
        const orb=Math.abs(separation-type.angle),limit=type.scaled?type.orb*orbScale:type.orb;
        if(orb<=limit) {
          const later=Math.abs(delta(a.longitude+a.speed/24,b.longitude+b.speed/24));
          aspects.push({id:`${a.name}-${b.name}-${type.name}`,a:a.name,b:b.name,type:type.name,angle:type.angle,symbol:type.symbol,tone:type.tone,orb,limit,applying:a.kind==='angle'||b.kind==='angle'?null:Math.abs(later-type.angle)<orb});
        }
      }
    }
    return aspects.sort((a,b)=>a.orb-b.orb);
  }
```

**Check the byte-identical claim before moving on.** The pushed object must have exactly the fields it had before — `scaled` is an internal marker on the type and must not appear on the aspect. Confirm the pushed literal is unchanged from the original, character for character.

- [ ] **Step 4: Store the minors on every chart**

In `chartAtInstant`, the chart's `aspects` is built as `aspectsFor([...points,...axes.slice(0,2)],orbScale)`. Leave that line exactly as it is, and alongside it compute the minors from the same point set:

```js
minorAspects: aspectsFor([...points,...axes.slice(0,2)],orbScale,{minor:true}).filter(a=>minorAspectTypes.some(t=>t.name===a.type)),
```

Add `minorAspects` to the returned chart object next to `aspects`. Add `minorAspectTypes` to the module's return statement.

- [ ] **Step 5: Run the tests, then the whole suite**

```bash
node --test tests/chart-depth.test.cjs
node --test tests/*.test.cjs
```

Expected: PASS. `tests/natal-engine.test.cjs` must pass **untouched** — it is the proof the five majors did not move.

- [ ] **Step 6: Prove the byte-identical test binds**

Temporarily change the major orb for Square from `6` to `7` in `aspectTypes`, run `tests/chart-depth.test.cjs`, and confirm "omitting the option reproduces the five-aspect output exactly" fails. Restore it. Then temporarily remove the `.filter(...)` from the `minorAspects` line so the majors leak in, run again, and confirm "every chart carries its minor aspects in a separate field" fails. Restore it. Report both failure messages.

- [ ] **Step 7: Commit**

```bash
git add natal-engine.js tests/chart-depth.test.cjs
git commit -m "feat(charts): minor aspects in their own field"
```

---

### Task 2: Annual profections

**Files:**
- Create: `chart-depth-engine.js`
- Modify: `tests/chart-depth.test.cjs`

**Interfaces:**
- Consumes: a ready natal chart (`chart.birthday` as `YYYY-MM-DD`, `chart.angles.asc`); `ClassicalEngine.rulers`.
- Produces: `ChartDepthEngine.profection(chart, targetDate)` → `{status:'ready', age, house, sign, signIndex, lord, from, to}` or `{status:'missing'}` when the chart is not ready.

- [ ] **Step 1: Write the failing tests**

Append to `tests/chart-depth.test.cjs`:

```js
const D = require('../chart-depth-engine.js');
const C = require('../classical-engine.js');

// A minimal chart: only the fields profections read.
const chartWith = (birthday, ascLongitude) => ({status: 'ready', birthday, angles: {asc: ascLongitude}});

test('profections advance one house a year and return to the first every twelve', () => {
  const chart = chartWith('2000-06-15', 5); // Aries ascendant
  const at = (y, m, d) => D.profection(chart, new Date(y, m - 1, d));
  assert.equal(at(2000, 6, 15).house, 1);   // age 0
  assert.equal(at(2001, 6, 15).house, 2);   // age 1
  assert.equal(at(2011, 6, 15).house, 12);  // age 11
  assert.equal(at(2012, 6, 15).house, 1);   // age 12
  assert.equal(at(2024, 6, 15).house, 1);   // age 24
});

test('the profection year runs birthday to birthday', () => {
  const chart = chartWith('2000-06-15', 5);
  assert.equal(D.profection(chart, new Date(2010, 5, 14)).age, 9, 'the day before the tenth birthday');
  assert.equal(D.profection(chart, new Date(2010, 5, 15)).age, 10, 'the tenth birthday itself');
});

test('the profected sign advances whole sign from the Ascendant and wraps at Pisces', () => {
  const chart = chartWith('2000-01-01', 340); // Pisces ascendant, sign index 11
  assert.equal(D.profection(chart, new Date(2000, 0, 1)).sign, 'Pisces');
  assert.equal(D.profection(chart, new Date(2001, 0, 1)).sign, 'Aries');
  assert.equal(D.profection(chart, new Date(2002, 0, 1)).sign, 'Taurus');
});

test('the time lord is the traditional ruler of the profected sign, for all twelve', () => {
  for (let signIndex = 0; signIndex < 12; signIndex++) {
    const chart = chartWith('2000-01-01', signIndex * 30 + 10);
    const p = D.profection(chart, new Date(2000, 0, 1)); // age 0, house 1, the Ascendant's own sign
    assert.equal(p.signIndex, signIndex);
    assert.equal(p.lord, C.rulers[signIndex]);
  }
});

test('profections refuse a chart that is not ready, and a target before birth', () => {
  assert.equal(D.profection({status: 'missing'}, new Date()).status, 'missing');
  assert.throws(() => D.profection(chartWith('2000-06-15', 5), new Date(1999, 0, 1)), RangeError);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/chart-depth.test.cjs`
Expected: FAIL, `Cannot find module '../chart-depth-engine.js'`.

- [ ] **Step 3: Create the module with profections**

Create `chart-depth-engine.js`:

```js
/* Techniques read off an existing natal chart: annual profections, the Part of Fortune and aspect
   patterns. Pure arithmetic on the chart in hand — no ephemeris calls, no DOM. Conventions and
   sources: docs/NATAL-CHART.md. */
const ChartDepthEngine = (() => {
  const classical = typeof ClassicalEngine !== 'undefined' ? ClassicalEngine : require('./classical-engine.js');
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const mod = (v, m = 360) => ((v % m) + m) % m;

  // Profections count WHOLE SIGN from the Ascendant, whatever house system the chart displays.
  // That is the technique's own convention; the page says so beside the result.
  function profection(chart, targetDate) {
    if (!chart || chart.status !== 'ready') return {status: 'missing'};
    if (!(targetDate instanceof Date) || !Number.isFinite(+targetDate)) throw new RangeError('Choose a valid date.');
    const [by, bm, bd] = String(chart.birthday).split('-').map(Number);
    const ty = targetDate.getFullYear(), tm = targetDate.getMonth() + 1, td = targetDate.getDate();
    // Completed years: birthday to birthday.
    let age = ty - by;
    if (tm < bm || (tm === bm && td < bd)) age -= 1;
    if (age < 0) throw new RangeError('Choose a date on or after the birth date.');
    const house = (age % 12) + 1;
    const ascSign = Math.floor(mod(chart.angles.asc) / 30);
    const signIndex = mod(ascSign + house - 1, 12);
    const from = new Date(by + age, bm - 1, bd);
    const to = new Date(by + age + 1, bm - 1, bd);
    return {status: 'ready', age, house, sign: SIGNS[signIndex], signIndex, lord: classical.rulers[signIndex], from, to};
  }

  return {profection};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ChartDepthEngine;
```

The module follows `classical-engine.js`'s wrapper exactly — a top-level `const` plus a guarded `module.exports`. Guard on the bare identifier `ClassicalEngine`, never `window.ClassicalEngine`: a top-level `const` in a classic script is never a property of `window`.

- [ ] **Step 4: Run the tests and the suite, then commit**

```bash
node --test tests/chart-depth.test.cjs
node --test tests/*.test.cjs
git add chart-depth-engine.js tests/chart-depth.test.cjs
git commit -m "feat(charts): annual profections"
```

---

### Task 3: The Part of Fortune

**Files:**
- Modify: `chart-depth-engine.js`
- Modify: `tests/chart-depth.test.cjs`

**Interfaces:**
- Consumes: a ready chart's `angles.asc`, its `points` (the Sun and Moon by name), and `cusps`; `ClassicalEngine.sect(chart)`, which returns the bare string `'day'` or `'night'`; `NatalEngine.houseFor(longitude, cusps)`.
- Produces: `ChartDepthEngine.partOfFortune(chart)` → `{status:'ready', longitude, sign, signIndex, degrees, house, sect, formula}`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/chart-depth.test.cjs`:

```js
const mod360 = v => ((v % 360) + 360) % 360;

test('the Lot uses Asc + Moon − Sun by day and Asc + Sun − Moon by night', () => {
  const asc = 123.4, sun = 200.1, moon = 47.9;
  assert.ok(Math.abs(D.fortuneLongitude(asc, sun, moon, 'day') - mod360(asc + moon - sun)) < 1e-9);
  assert.ok(Math.abs(D.fortuneLongitude(asc, sun, moon, 'night') - mod360(asc + sun - moon)) < 1e-9);
  assert.throws(() => D.fortuneLongitude(asc, sun, moon, 'dusk'), RangeError);
});

test('the day and night Lots are reflections about the Ascendant', () => {
  // This catches a sign error in EITHER formula, which a single hand-computed value would not:
  // the two must sit the same arc either side of the Ascendant, and differ by twice Moon − Sun.
  for (const [asc, sun, moon] of [[123.4, 200.1, 47.9], [0, 359.5, 0.5], [270, 10, 190], [45.25, 45.25, 300]]) {
    const day = D.fortuneLongitude(asc, sun, moon, 'day');
    const night = D.fortuneLongitude(asc, sun, moon, 'night');
    assert.ok(Math.abs(mod360(day - asc) - mod360(asc - night)) < 1e-9, `not reflected for asc ${asc}`);
    assert.ok(Math.abs(mod360(day - night) - mod360(2 * (moon - sun))) < 1e-9, `wrong separation for asc ${asc}`);
  }
});

test('the Lot is read off the right three positions of every fixture chart', () => {
  // The fixture's positions are Swiss-derived, so this checks the engine takes the Ascendant,
  // Sun and Moon from the chart it is handed — the failure a formula test cannot see.
  for (const c of reference.cases) {
    const chart = N.calculate(c.input);
    if (chart.status !== 'ready') continue;
    const lot = D.partOfFortune(chart);
    const sect = C.sect(chart);
    const expected = sect === 'day'
      ? mod360(c.asc + c.points.Moon.longitude - c.points.Sun.longitude)
      : mod360(c.asc + c.points.Sun.longitude - c.points.Moon.longitude);
    const diff = Math.abs(((lot.longitude - expected + 540) % 360) - 180);
    assert.ok(diff < 0.1, `${c.id}: Lot ${lot.longitude} against ${expected} (${sect})`);
    assert.equal(lot.sect, sect);
  }
});

test('the Lot reports its sign, house and which formula it used', () => {
  const c = reference.cases[0];
  const chart = N.calculate(c.input);
  const lot = D.partOfFortune(chart);
  assert.ok(lot.signIndex >= 0 && lot.signIndex < 12);
  assert.ok(lot.house >= 1 && lot.house <= 12);
  assert.match(lot.formula, lot.sect === 'day' ? /Moon − Sun/ : /Sun − Moon/);
  assert.equal(D.partOfFortune({status: 'missing'}).status, 'missing');
});
```

The tolerance of 0.1° allows for the fixture's 0.03° planet tolerance compounding across three positions.

- [ ] **Step 2: Run to verify failure, then implement**

Add to `chart-depth-engine.js`, before the `return`:

```js
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');

  // The traditional sect-sensitive pair. A lot of modern software uses the day formula for every
  // chart, which reflects the Lot across the Ascendant for night births; the page names which
  // formula was used.
  function fortuneLongitude(asc, sun, moon, sect) {
    if (sect === 'day') return mod(asc + moon - sun);
    if (sect === 'night') return mod(asc + sun - moon);
    throw new RangeError('Sect must be day or night.');
  }

  function partOfFortune(chart) {
    if (!chart || chart.status !== 'ready') return {status: 'missing'};
    const sun = chart.points.find(p => p.name === 'Sun');
    const moon = chart.points.find(p => p.name === 'Moon');
    const sect = classical.sect(chart);
    const longitude = fortuneLongitude(chart.angles.asc, sun.longitude, moon.longitude, sect);
    const place = natal.placement(longitude);
    return {
      status: 'ready', longitude, sign: place.sign, signIndex: place.index, degrees: place.degrees,
      house: natal.houseFor(longitude, chart.cusps), sect,
      formula: sect === 'day' ? 'Ascendant + Moon − Sun, for a day chart' : 'Ascendant + Sun − Moon, for a night chart'
    };
  }
```

Add `fortuneLongitude` and `partOfFortune` to the return statement.

- [ ] **Step 3: Run the tests and the suite**

```bash
node --test tests/chart-depth.test.cjs
node --test tests/*.test.cjs
```

- [ ] **Step 4: Prove the reflection test binds**

Temporarily swap the night formula to `mod(asc + moon - sun)` — the day formula — and confirm the reflection test fails. Restore it. Report the failure message.

- [ ] **Step 5: Commit**

```bash
git add chart-depth-engine.js tests/chart-depth.test.cjs
git commit -m "feat(charts): the sect-sensitive Part of Fortune"
```

---

### Task 4: Aspect patterns

**Files:**
- Modify: `chart-depth-engine.js`
- Modify: `tests/chart-depth.test.cjs`

**Interfaces:**
- Consumes: an aspect list in the shape `aspectsFor` returns (`{a, b, type}`), and a point list (`{name, kind, longitude}`).
- Produces: `ChartDepthEngine.patterns(aspects, points)` → array of `{type, members, apex}` where `type` is one of `'Stellium'`, `'Grand trine'`, `'T-square'`, `'Grand cross'`, `'Yod'`, `members` is a sorted array of planet names, and `apex` is a planet name or `null`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/chart-depth.test.cjs`:

```js
// Hand-built aspects: patterns only read {a, b, type}.
const asp = (a, b, type) => ({a, b, type});
const planet = (name, longitude) => ({name, kind: 'planet', longitude});

test('a stellium is three or more planets in one sign, and two is not', () => {
  const three = [planet('Sun', 1), planet('Mercury', 10), planet('Venus', 20), planet('Mars', 100)];
  assert.deepEqual(D.patterns([], three).filter(p => p.type === 'Stellium').map(p => p.members),
    [['Mercury', 'Sun', 'Venus']]);
  const two = [planet('Sun', 1), planet('Mercury', 10), planet('Mars', 100)];
  assert.equal(D.patterns([], two).filter(p => p.type === 'Stellium').length, 0);
});

test('the nodes are not counted towards a stellium', () => {
  const points = [planet('Sun', 1), planet('Mercury', 10), {name: 'North Node', kind: 'node', longitude: 15}];
  assert.equal(D.patterns([], points).filter(p => p.type === 'Stellium').length, 0);
});

test('a grand trine is three planets each trine the other two', () => {
  const aspects = [asp('Sun', 'Moon', 'Trine'), asp('Moon', 'Mars', 'Trine'), asp('Sun', 'Mars', 'Trine')];
  const found = D.patterns(aspects, []).filter(p => p.type === 'Grand trine');
  assert.deepEqual(found.map(p => p.members), [['Mars', 'Moon', 'Sun']]);
});

test('a T-square names its apex', () => {
  const aspects = [asp('Sun', 'Moon', 'Opposition'), asp('Sun', 'Mars', 'Square'), asp('Moon', 'Mars', 'Square')];
  const t = D.patterns(aspects, []).filter(p => p.type === 'T-square');
  assert.equal(t.length, 1);
  assert.equal(t[0].apex, 'Mars');
});

test('a grand cross is reported once, not as its constituent T-squares', () => {
  const aspects = [
    asp('Sun', 'Moon', 'Opposition'), asp('Mars', 'Venus', 'Opposition'),
    asp('Sun', 'Mars', 'Square'), asp('Mars', 'Moon', 'Square'),
    asp('Moon', 'Venus', 'Square'), asp('Venus', 'Sun', 'Square')
  ];
  const found = D.patterns(aspects, []);
  assert.equal(found.filter(p => p.type === 'Grand cross').length, 1);
  assert.equal(found.filter(p => p.type === 'T-square').length, 0, 'the grand cross was also reported as T-squares');
});

test('a yod needs a sextile and two quincunxes, and names its apex', () => {
  const yod = [asp('Sun', 'Moon', 'Sextile'), asp('Sun', 'Mars', 'Quincunx'), asp('Moon', 'Mars', 'Quincunx')];
  const found = D.patterns(yod, []).filter(p => p.type === 'Yod');
  assert.equal(found.length, 1);
  assert.equal(found[0].apex, 'Mars');
  const noQuincunx = [asp('Sun', 'Moon', 'Sextile'), asp('Sun', 'Mars', 'Trine'), asp('Moon', 'Mars', 'Trine')];
  assert.equal(D.patterns(noQuincunx, []).filter(p => p.type === 'Yod').length, 0);
});

test('patterns ignore aspects to the angles', () => {
  const aspects = [asp('Sun', 'Moon', 'Trine'), asp('Moon', 'Ascendant', 'Trine'), asp('Sun', 'Ascendant', 'Trine')];
  const points = [planet('Sun', 0), planet('Moon', 120), {name: 'Ascendant', kind: 'angle', longitude: 240}];
  assert.equal(D.patterns(aspects, points).filter(p => p.type === 'Grand trine').length, 0);
});
```

- [ ] **Step 2: Run to verify failure, then implement**

Add to `chart-depth-engine.js`:

```js
  const PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

  // Patterns are found from majors AND minors together, whatever the display toggle says: a yod
  // needs quincunxes, and a pattern that appeared and vanished with a display toggle would be a bug.
  function patterns(aspects, points) {
    const planetary = aspects.filter(x => PLANETS.includes(x.a) && PLANETS.includes(x.b));
    const has = (a, b, type) => planetary.some(x => x.type === type && ((x.a === a && x.b === b) || (x.a === b && x.b === a)));
    const found = [];
    const sorted = names => [...names].sort();
    const key = (type, names) => `${type}:${sorted(names).join(',')}`;
    const seen = new Set();
    const add = (type, members, apex = null) => {
      const k = key(type, members);
      if (seen.has(k)) return;
      seen.add(k);
      found.push({type, members: sorted(members), apex});
    };

    // Stellium: three or more of the ten planets in one sign. The nodes and angles do not count.
    const bySign = new Map();
    for (const p of points.filter(p => p.kind === 'planet' && PLANETS.includes(p.name))) {
      const s = Math.floor(mod(p.longitude) / 30);
      bySign.set(s, [...(bySign.get(s) || []), p.name]);
    }
    for (const names of bySign.values()) if (names.length >= 3) add('Stellium', names);

    const names = PLANETS;
    // Grand cross first, so its constituent T-squares can be suppressed.
    const crossMembers = new Set();
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const [a, b] = [names[i], names[j]];
      if (!has(a, b, 'Opposition')) continue;
      for (let k = 0; k < names.length; k++) for (let l = k + 1; l < names.length; l++) {
        const [c, d] = [names[k], names[l]];
        if ([a, b].includes(c) || [a, b].includes(d) || !has(c, d, 'Opposition')) continue;
        if (has(a, c, 'Square') && has(c, b, 'Square') && has(b, d, 'Square') && has(d, a, 'Square')) {
          add('Grand cross', [a, b, c, d]);
          crossMembers.add(key('x', [a, b, c, d]));
        }
      }
    }
    const inCross = trio => [...crossMembers].some(k => trio.every(n => k.includes(n)));

    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) for (let k = j + 1; k < names.length; k++) {
      const [a, b, c] = [names[i], names[j], names[k]];
      if (has(a, b, 'Trine') && has(b, c, 'Trine') && has(a, c, 'Trine')) add('Grand trine', [a, b, c]);
      // T-square and yod: try each of the three as the apex.
      for (const [x, y, apex] of [[a, b, c], [a, c, b], [b, c, a]]) {
        if (has(x, y, 'Opposition') && has(x, apex, 'Square') && has(y, apex, 'Square') && !inCross([x, y, apex])) add('T-square', [x, y, apex], apex);
        if (has(x, y, 'Sextile') && has(x, apex, 'Quincunx') && has(y, apex, 'Quincunx')) add('Yod', [x, y, apex], apex);
      }
    }
    return found;
  }
```

Add `patterns` to the return statement.

**Before committing, check the grand-cross suppression actually works.** `inCross` compares planet names against a key string with `includes`, which can false-match a name that is a substring of another. None of the ten planet names is a substring of another today, but verify that rather than assuming it, and if you find a cleaner membership test than string inclusion, use it.

- [ ] **Step 3: Run the tests and the suite, then commit**

```bash
node --test tests/chart-depth.test.cjs
node --test tests/*.test.cjs
git add chart-depth-engine.js tests/chart-depth.test.cjs
git commit -m "feat(charts): aspect patterns"
```

---

### Task 5: The section on the charts page

**Files:**
- Create: `chart-depth.js`
- Modify: `natal-room.js:113`
- Modify: `natal-chart.js` (the report's aspect list and the wheel)
- Modify: `charts/index.html` (script tags, cache keys)
- Modify: `celestial-room.css`

**Interfaces:**
- Consumes: `ChartDepthEngine.profection`, `.partOfFortune`, `.patterns`; `chart.minorAspects`.
- Produces: `ChartDepth.render(chart, {year})` → HTML string.

- [ ] **Step 1: A render module, pure and tested**

Create `chart-depth.js` as a UMD module in the same wrapper as `chart-depth-engine.js` — a top-level `const ChartDepth = (() => { ... })();` plus the guarded `module.exports` — so its copy is testable under Node. It requires `chart-depth-engine.js` the same way. It exports `render(chart, {year})`, a pure function returning an HTML string and touching no DOM, with three parts:

1. **This year's profection**, with a `<select data-profection-year>` running from the birth year to the current year plus ten, `year` selected. It shows the profected house, its sign and its time lord, and a one-line note that profections count whole sign from the Ascendant, so the house may differ from the chart's displayed house system. The target date is the reader's birthday in `year` — the profection that begins that year.
2. **The Part of Fortune**, showing sign, degree and house, and a line naming the formula used.
3. **Aspect patterns**, from `ChartDepthEngine.patterns([...chart.aspects, ...chart.minorAspects], chart.points)`, listing each with its members and apex, or a plain sentence when there are none.

Include an About disclosure (`<details>`) naming the conventions: whole-sign profections from the Ascendant, the sect-sensitive Lot, and that patterns are read from majors and minors together. The wrapper element carries `class="chart-depth"` so it can be replaced in place.

Escape every interpolated string. Copy is reflective, never predictive: a profection year is a year given to a planet's themes, not a forecast of events. Return `''` for a chart whose status is not `'ready'`.

Append to `tests/chart-depth.test.cjs`:

```js
const View = require('../chart-depth.js');
// "Fortune" is the Lot's own name, so it cannot be banned the way horary bans it.
const PREDICTIVE = /you will|will happen|is going to|lucky|unlucky|destined|guarantee|expect (?:good|bad)/i;

test('the section renders all three parts for every fixture chart, in a reflective voice', () => {
  for (const c of reference.cases) {
    const chart = N.calculate(c.input);
    if (chart.status !== 'ready') continue;
    const html = View.render(chart, {year: 2030});
    assert.match(html, /class="chart-depth"/);
    assert.match(html, /data-profection-year/);
    assert.match(html, /Part of Fortune/);
    assert.match(html, /<details/);
    assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), PREDICTIVE, `${c.id}: predictive copy`);
  }
  assert.equal(View.render({status: 'missing'}, {year: 2030}), '');
});

test('the rendered profection moves with the chosen year', () => {
  const chart = N.calculate(reference.cases[0].input);
  const lordIn = year => D.profection(chart, new Date(year, Number(chart.birthday.slice(5, 7)) - 1, Number(chart.birthday.slice(8, 10)))).lord;
  assert.match(View.render(chart, {year: 2030}), new RegExp(lordIn(2030)));
  assert.notEqual(View.render(chart, {year: 2030}), View.render(chart, {year: 2031}));
});
```

- [ ] **Step 2: Mount it under the natal report**

In `natal-room.js`, immediately after the `NatalChart.report(...)` interpolation at line 113, add `${natalModel && typeof ChartDepth !== 'undefined' ? ChartDepth.render(natalModel, {year: new Date().getFullYear()}) : ''}`. Wire the year selector's change event (delegated, the way the existing `[data-natal-view]` click handler is) so it replaces the `.chart-depth` element in place without re-rendering the whole birthday output, and restores focus to the selector. The section must also survive `refreshNatalReport`, which replaces only `.natal-report`. Guard on the bare identifier `ChartDepth`, never `window.ChartDepth`.

- [ ] **Step 3: The minor aspect toggle**

In `natal-chart.js`, add a toggle to the report's aspect list, off by default, that appends `chart.minorAspects` to the listed aspects. When it is on, the wheel draws minor aspect lines as well, visibly lighter than the majors. The toggle must change only what is listed and drawn — never the pattern list, which is computed from both regardless.

- [ ] **Step 4: Scripts and cache keys**

In `charts/index.html`, add `/chart-depth-engine.js?v=1` after `classical-engine.js` and `/chart-depth.js?v=1` before `natal-room.js`. Bump the cache keys of `natal-engine.js`, `natal-chart.js`, `natal-room.js` and `celestial-room.css`. **`natal-engine.js` is also loaded by other pages** — check `eastern/index.html`, `sky/index.html` and every other page for it and bump the key everywhere it appears.

- [ ] **Step 5: Styles, suite, commit**

Add styles for the section to `celestial-room.css`, following that file's existing patterns. Run the suite. Do not attempt browser verification; the controller performs it.

```bash
node --test tests/*.test.cjs
git add chart-depth.js natal-room.js natal-chart.js charts/index.html celestial-room.css tests/chart-depth.test.cjs
git commit -m "feat(charts): profections, the Lot and patterns on the page"
```

If other pages' cache keys were bumped, stage those HTML files too, by name.

---

### Task 6: Documentation

**Files:**
- Modify: `docs/NATAL-CHART.md`
- Modify: `docs/SITE-STRUCTURE.md`

- [ ] **Step 1: Document the four techniques**

In `docs/NATAL-CHART.md`, add a section covering each technique's convention and its reason, matching the file's existing register: whole-sign profections from the Ascendant, birthday to birthday; the sect-sensitive Part of Fortune and the modern day-only alternative it does not use; the four minor aspects at a fixed 2° orb and why the orb scale does not apply; the five patterns with their definitions, and that they are read from majors and minors together.

**Record the validation limitation plainly.** The Lot's formula is pinned by hand-computed cases and the reflection property; its wiring is checked against the existing Swiss-derived fixtures. It is not validated against an independently computed Lot, because pyswisseph was not available when this was built. Say so.

Update the test count.

- [ ] **Step 2: Script order**

In `docs/SITE-STRUCTURE.md`, add `chart-depth-engine.js` and `chart-depth.js` to the `/charts/` script chain.

- [ ] **Step 3: Commit**

```bash
node --test tests/*.test.cjs
git add docs/NATAL-CHART.md docs/SITE-STRUCTURE.md
git commit -m "docs: profections, the Lot, minor aspects and patterns"
```

---

## Notes for the executor

- **Stop the dev preview servers before any merge.** A running static server on the `V:` drive makes `git merge --squash` fail with `Permission denied`.
- **Never `git add -A`.** Two large untracked PNGs sit in `output/imagegen/`.
- **`window.X` guards do not work here.** Guard bare identifiers with `typeof`.
- **Commands on the `V:` drive can exceed two minutes.** A timeout is not a failure; check the result.
- The full suite before this plan starts is 456 passing.
