# Relationship charts (C3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add composite and Davison relationship charts to the Two skies tab on `/charts/`, beside the existing synastry.

**Architecture:** One pure engine, `relationship-charts-engine.js`, builds the composite by midpoints and the Davison by one `NatalEngine.chartAtInstant` call. One pure render module, `relationship-charts.js`, turns either model into HTML, with the wheel drawing injected so it is testable under Node. `celestial-extras.js` gains a three-way method switch and wires both in.

**Tech Stack:** Vanilla ES2020 in plain `<script>` tags, no build step. UMD modules. Tests are `node --test tests/*.test.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-14-relationship-charts-design.md`

## Global Constraints

Each line says where it comes from: **[Glenn]** his instruction; **[codebase]** something the repo already enforces; **[program]** Part E of `docs/superpowers/specs/2026-09-13-site-expansion-design.md`; **[spec]** a decision in the C3b spec, taken under Glenn's instruction to complete C3 unattended; **[judgement]** mine in this plan.

- **No backend change, no journal kind, no saving.** Do not touch `server/`, `kinds.py`, the migrations or `rooms.js`. [spec]
- **Synastry is unchanged**: it stays the default method, and its output, filter and contact reading render exactly as today. [spec]
- **Composite planets use the near midpoint; an exactly opposed pair takes the point 90° forward of the first person's placement.** [spec]
- **The composite Ascendant lies east of the composite Midheaven** (0° < asc − mc < 180°). Quadrant-system cusps are side-chosen midpoints, kept in order. Whole Sign and Equal are recast from the composite Ascendant. Mismatched house systems give Equal houses with a notice. [spec]
- **Davison: the midpoint of the two UTC instants; the mean latitude; the near-midpoint longitude on the −180..180 scale; the reader's house system and orb scale.** [spec]
- Engines and render modules are pure UMD modules with no DOM access, tested under `node --test tests/*.test.cjs`. [program, codebase]
- The About disclosure names the conventions and exactly two sources: Robert Hand, *Planets in Composite* (1975), and Ronald Davison, *Synastry* (1977). Copy is checked by a test for predictive phrasing. [program, spec]
- Voice: reflective, never predictive, never a verdict on the relationship. British spelling, spaced em dashes, curly apostrophes. No sentence may assert a position, count or direction the data does not support. [codebase, judgement]
- Keyboard operable, reduced motion respected, verified at 390px and 1400px. [program]
- Guard globals with bare `typeof X !== 'undefined'`, never `window.X`: a top-level `const` in a classic script is not a property of `window`. [codebase]
- No new dependencies. [Glenn] Cache keys bumped on every changed file. [codebase] Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. [session attribution instruction]

---

### Task 1: Midpoints and the composite chart

**Files:**
- Create: `relationship-charts-engine.js`
- Create: `tests/relationship-charts.test.cjs`

**Interfaces:**
- Consumes: `NatalEngine.mod`, `.delta`, `.placement`, `.houseFor`, `.houseCusps`, `.aspectsFor`; ready charts from `NatalEngine.calculate` (`status`, `houseSystem`, `orbScale`, `angles.asc`, `angles.mc`, `cusps`, `points` with `kind`, `name`, `symbol`, `longitude`).
- Produces: `RelationshipChartsEngine.nearMidpoint(a, b)` → longitude in [0, 360); `RelationshipChartsEngine.composite(first, second)` → `{status:'ready', method:'composite', houseSystem, notice, orbScale, angles:{asc, mc, dc, ic}, points, axes, cusps, aspects, minorAspects:[]}` or `{status:'missing', message}`.

- [ ] **Step 1: Write the failing tests**

Create `tests/relationship-charts.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../natal-engine.js');
const R = require('../relationship-charts-engine.js');
const reference = require('./fixtures/natal-reference.json');

const charts = reference.cases.map(c => N.calculate(c.input)).filter(c => c.status === 'ready');
const close = (a, b, message) => assert.ok(Math.abs(N.delta(a, b)) < 1e-9, `${message}: ${a} vs ${b}`);
const arc = v => { const m = N.mod(v); return m > 360 - 1e-7 ? 0 : m; };

test('near midpoints take the shorter arc, across 0° as well', () => {
  close(R.nearMidpoint(350, 10), 0, 'across Aries');
  close(R.nearMidpoint(10, 350), 0, 'across Aries, reversed');
  close(R.nearMidpoint(20, 60), 40, 'ordinary');
  close(R.nearMidpoint(10, 200), 285, 'far side avoided');
  close(R.nearMidpoint(200, 10), 285, 'far side avoided, reversed');
});

test('an exactly opposed pair takes the point 90° forward of the first placement', () => {
  close(R.nearMidpoint(10, 190), 100, 'first at 10');
  close(R.nearMidpoint(190, 10), 280, 'first at 190');
  close(R.nearMidpoint(0, 180), 90, 'first at 0');
});

test('a composite of a chart with itself is that chart', () => {
  for (const chart of charts) {
    const c = R.composite(chart, chart);
    assert.equal(c.status, 'ready');
    close(c.angles.asc, chart.angles.asc, 'Ascendant');
    close(c.angles.mc, chart.angles.mc, 'Midheaven');
    chart.cusps.forEach((cusp, i) => close(c.cusps[i], cusp, `cusp ${i + 1}`));
    for (const p of chart.points.filter(p => p.kind === 'planet')) {
      close(c.points.find(q => q.name === p.name).longitude, p.longitude, p.name);
    }
  }
});

test('the composite does not depend on which chart comes first', () => {
  for (let i = 0; i < charts.length; i++) for (let j = i + 1; j < charts.length; j++) {
    const ab = R.composite(charts[i], charts[j]), ba = R.composite(charts[j], charts[i]);
    close(ab.angles.asc, ba.angles.asc, 'Ascendant');
    close(ab.angles.mc, ba.angles.mc, 'Midheaven');
    ab.cusps.forEach((cusp, k) => close(cusp, ba.cusps[k], `cusp ${k + 1}`));
    ab.points.forEach(p => {
      const a = charts[i].points.find(q => q.name === p.name).longitude;
      const b = charts[j].points.find(q => q.name === p.name).longitude;
      if (Math.abs(Math.abs(N.delta(a, b)) - 180) > 1e-6) close(p.longitude, ba.points.find(q => q.name === p.name).longitude, p.name);
    });
  }
});

test('composite houses stay in order, begin at the Ascendant and put the Midheaven on cusp 10', () => {
  for (let i = 0; i < charts.length; i++) for (let j = i + 1; j < charts.length; j++) {
    const c = R.composite(charts[i], charts[j]);
    const east = N.mod(c.angles.asc - c.angles.mc);
    assert.ok(east > 0 && east < 180, `Ascendant west of the Midheaven (${i},${j})`);
    // The two polar fixtures fall back to Whole Sign, whose first cusp is the start of the rising sign.
    if (c.houseSystem !== 'whole-sign') close(c.cusps[0], c.angles.asc, `cusp 1 (${i},${j})`);
    if (c.houseSystem === 'placidus' || c.houseSystem === 'regiomontanus') close(c.cusps[9], c.angles.mc, `cusp 10 (${i},${j})`);
    const arcs = c.cusps.map(cusp => arc(cusp - c.cusps[0]));
    for (let k = 1; k < 12; k++) assert.ok(arcs[k] > arcs[k - 1], `cusps out of order at ${k + 1} (${i},${j})`);
  }
});

// Minimal Equal-house chart: only the fields composite reads.
const equalChart = (asc, mc, planetAt = 0) => ({
  status: 'ready', houseSystem: 'equal', orbScale: 1, angles: {asc, mc},
  cusps: N.houseCusps({asc, mc}, 0, 'equal'),
  points: ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']
    .map((name, i) => ({name, symbol: name[0], kind: 'planet', longitude: N.mod(planetAt + i * 31)}))
});

test('the composite Ascendant is turned 180° when the plain midpoint would fall west of the Midheaven', () => {
  // Midheavens 0° and 200° meet at 280°; Ascendants 170° and 210° meet at 190°, which is west of 280°.
  const c = R.composite(equalChart(170, 0), equalChart(210, 200));
  close(c.angles.mc, 280, 'Midheaven');
  close(c.angles.asc, 10, 'Ascendant turned');
  close(c.cusps[0], 10, 'Equal houses recast from the turned Ascendant');
});

test('Whole Sign composites recast from the composite Ascendant; mismatched systems use Equal with a notice', () => {
  const whole = charts.slice(0, 2).map(c => N.calculate({...reference.cases[charts.indexOf(c)].input, houseSystem: 'whole-sign'}));
  const w = R.composite(whole[0], whole[1]);
  assert.equal(w.houseSystem, 'whole-sign');
  assert.deepEqual(w.cusps, N.houseCusps({asc: w.angles.asc, mc: w.angles.mc}, 0, 'whole-sign'));
  assert.equal(w.notice, '');
  const mixed = R.composite(charts[0], whole[1]);
  assert.equal(mixed.houseSystem, 'equal');
  close(mixed.cusps[0], mixed.angles.asc, 'Equal cusp 1');
  assert.match(mixed.notice, /Equal houses/);
});

test('composite aspects are the majors among the composite planets and angles, with no motion', () => {
  const c = R.composite(charts[0], charts[1]);
  const expected = N.aspectsFor([...c.points, ...c.axes.slice(0, 2)], c.orbScale).map(a => ({...a, applying: null}));
  assert.deepEqual(c.aspects, expected);
  assert.ok(c.aspects.every(a => a.applying === null));
  assert.equal(c.points.length, 10);
  assert.ok(c.points.every(p => p.house >= 1 && p.house <= 12 && typeof p.sign === 'string'));
  assert.deepEqual(c.axes.map(a => a.name), ['Ascendant', 'Midheaven', 'Descendant', 'Imum Coeli']);
});

test('the composite refuses charts that are not ready', () => {
  assert.equal(R.composite(charts[0], {status: 'missing'}).status, 'missing');
  assert.equal(R.composite(null, charts[0]).status, 'missing');
});
```

The "Whole Sign" test rebuilds the first two fixture charts in Whole Sign. `charts` is filtered from `reference.cases`, and every case is ready, so `charts.indexOf(c)` indexes `reference.cases` correctly. If any fixture case is not ready, index the input directly instead and say so in your report.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/relationship-charts.test.cjs`
Expected: FAIL, `Cannot find module '../relationship-charts-engine.js'`.

- [ ] **Step 3: Implement**

Create `relationship-charts-engine.js`:

```js
/* Relationship charts built from two birth charts: the composite (a chart of midpoints) and the
   Davison (the real sky at the midpoint in time and place). Arithmetic on two ready charts plus one
   chartAtInstant call; no DOM. Conventions and sources: docs/EXTENDED-ATLAS.md. */
const RelationshipChartsEngine = (() => {
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const {mod, delta} = natal;
  const MISSING = 'Both people need a birth date, recorded time and confirmed birthplace.';
  const QUADRANT = ['placidus', 'regiomontanus'];
  const ready = (a, b) => a?.status === 'ready' && b?.status === 'ready';
  // An arc from 0 to 360, with float noise just under 360 read as 0.
  const arc = value => { const v = mod(value); return v > 360 - 1e-7 ? 0 : v; };

  function nearMidpoint(a, b) {
    const span = delta(b, a);
    // delta returns −180 at exact opposition; test both signs so the rule never rests on that.
    if (Math.abs(Math.abs(span) - 180) < 1e-9) return mod(a + 90);
    return mod(a + span / 2);
  }

  function composite(first, second) {
    if (!ready(first, second)) return {status: 'missing', message: MISSING};
    const mc = nearMidpoint(first.angles.mc, second.angles.mc);
    let asc = nearMidpoint(first.angles.asc, second.angles.asc);
    // Every natal Ascendant lies east of its Midheaven; the midpoint of two can land on the wrong side.
    const east = mod(asc - mc);
    if (!(east > 0 && east < 180)) asc = mod(asc + 180);

    let houseSystem = first.houseSystem, notice = '', cusps;
    if (first.houseSystem !== second.houseSystem) {
      houseSystem = 'equal';
      notice = 'The two charts use different house systems, so this composite uses Equal houses from the composite Ascendant.';
    }
    if (QUADRANT.includes(houseSystem)) {
      cusps = first.cusps.map((cuspA, i) => {
        const cuspB = second.cusps[i];
        // Where this cusp sits from the Ascendant, on average; keep the midpoint on that side.
        const offset = (arc(cuspA - first.angles.asc) + arc(cuspB - second.angles.asc)) / 2;
        const target = mod(asc + offset), m = nearMidpoint(cuspA, cuspB);
        return Math.abs(delta(m, target)) <= 90 ? m : mod(m + 180);
      });
    } else {
      cusps = natal.houseCusps({asc, mc}, 0, houseSystem);
    }

    const secondByName = Object.fromEntries(second.points.filter(p => p.kind === 'planet').map(p => [p.name, p]));
    const points = first.points.filter(p => p.kind === 'planet').map(p => {
      const longitude = nearMidpoint(p.longitude, secondByName[p.name].longitude);
      return {name: p.name, symbol: p.symbol, kind: 'planet', speed: 0, retrograde: false, stationary: false, house: natal.houseFor(longitude, cusps), ...natal.placement(longitude)};
    });
    const axes = [['Ascendant', 'ASC', asc], ['Midheaven', 'MC', mc], ['Descendant', 'DSC', mod(asc + 180)], ['Imum Coeli', 'IC', mod(mc + 180)]]
      .map(([name, symbol, longitude]) => ({name, symbol, kind: 'angle', ...natal.placement(longitude), house: natal.houseFor(longitude, cusps)}));
    // Composite placements never move, so applying and separating mean nothing here.
    const aspects = natal.aspectsFor([...points, ...axes.slice(0, 2)], first.orbScale).map(a => ({...a, applying: null}));
    return {status: 'ready', method: 'composite', houseSystem, notice, orbScale: first.orbScale,
      angles: {asc, mc, dc: mod(asc + 180), ic: mod(mc + 180)}, points, axes, cusps, aspects, minorAspects: []};
  }

  return {nearMidpoint, composite};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = RelationshipChartsEngine;
```

Check two things against `natal-engine.js` before running. First, that `houseCusps` returns the Whole Sign and Equal cusps without reading `ramc` or `obliquity` (lines 49–52). Second, that `placement` returns `longitude`, so `points` keep their longitude. If either is not true, stop and report it.

- [ ] **Step 4: Run the tests and the suite**

```bash
node --test tests/relationship-charts.test.cjs
node --test tests/*.test.cjs
```

- [ ] **Step 5: Prove the order and self-composite tests bind**

The controller ran this plan's code against these tests before dispatch; expect the same results.

Temporarily replace the side choice with the plain midpoint (`return m;`) and run the tests: the controller saw "cusps out of order at 7 (1,2)". Restore the code. Then temporarily remove the Ascendant turn: the controller saw two failures, "Ascendant west of the Midheaven (1,8)" and "Ascendant turned: 190 vs 10". Restore it. Report what you saw, and flag any difference.

- [ ] **Step 6: Commit**

```bash
git add relationship-charts-engine.js tests/relationship-charts.test.cjs
git commit -m "feat(charts): the composite relationship chart"
```

---

### Task 2: The Davison chart

**Files:**
- Modify: `relationship-charts-engine.js`
- Modify: `tests/relationship-charts.test.cjs`

**Interfaces:**
- Consumes: ready charts' `date` (ISO UTC), `location.latitude`, `location.longitude`, `houseSystem`, `orbScale`; `NatalEngine.chartAtInstant(date, location, {houseSystem, orbScale})`.
- Produces: `RelationshipChartsEngine.davison(first, second)` → the `chartAtInstant` result with `method:'davison'`, or `{status:'missing', message}`.

- [ ] **Step 1: Write the failing tests**

Append:

```js
const place = (latitude, longitude, timeZone) => ({latitude, longitude, timeZone});

test('a Davison chart of a chart with itself is that chart', () => {
  for (const chart of charts) {
    const d = R.davison(chart, chart);
    assert.equal(d.status, 'ready');
    assert.equal(d.method, 'davison');
    assert.equal(d.date, chart.date);
    close(d.angles.asc, chart.angles.asc, 'Ascendant');
    for (const p of chart.points.filter(p => p.kind === 'planet')) close(d.points.find(q => q.name === p.name).longitude, p.longitude, p.name);
  }
});

test('the Davison chart is cast for the midpoint instant and place', () => {
  const a = charts[0], b = charts[3];
  const d = R.davison(a, b);
  const instant = new Date((Date.parse(a.date) + Date.parse(b.date)) / 2);
  const latitude = (a.location.latitude + b.location.latitude) / 2;
  let longitude = R.nearMidpoint(a.location.longitude, b.location.longitude);
  if (longitude > 180) longitude -= 360;
  const expected = N.chartAtInstant(instant, place(latitude, longitude, 'UTC'), {houseSystem: a.houseSystem, orbScale: a.orbScale});
  assert.equal(d.date, expected.date);
  close(d.angles.asc, expected.angles.asc, 'Ascendant');
  assert.equal(d.location.latitude, latitude);
  assert.equal(d.location.longitude, longitude);
  assert.equal(d.location.timeZone, 'UTC');
});

test('Davison longitudes meet across 180°, not across Greenwich', () => {
  const tokyo = N.calculate({birthday: '1985-04-10', time: '09:00', location: place(35.6895, 139.6917, 'Asia/Tokyo')});
  const honolulu = N.calculate({birthday: '1988-10-02', time: '18:30', location: place(21.3069, -157.8583, 'Pacific/Honolulu')});
  const d = R.davison(tokyo, honolulu);
  // 139.69°E and 157.86°W are 62.45° apart across the date line; their midpoint is near 170.9°E.
  assert.ok(Math.abs(d.location.longitude - 170.9167) < 1e-3, `longitude ${d.location.longitude}`);
  assert.ok(Math.abs(d.location.latitude - 28.4982) < 1e-3, `latitude ${d.location.latitude}`);
});

test('the Davison chart uses the reader’s house system and refuses charts that are not ready', () => {
  const whole = N.calculate({...reference.cases[0].input, houseSystem: 'whole-sign'});
  assert.equal(R.davison(whole, charts[1]).houseSystem, 'whole-sign');
  assert.equal(R.davison(charts[0], {status: 'missing'}).status, 'missing');
});
```

Hand-check the Tokyo and Honolulu numbers before running: (139.6917 + (−157.8583 + 360)) / 2 = 170.9167, and (35.6895 + 21.3069) / 2 = 28.4982.

- [ ] **Step 2: Run to verify failure, then implement**

Add to `relationship-charts-engine.js`, before the `return`:

```js
  function davison(first, second) {
    if (!ready(first, second)) return {status: 'missing', message: MISSING};
    const instant = new Date((Date.parse(first.date) + Date.parse(second.date)) / 2);
    const east = nearMidpoint(first.location.longitude, second.location.longitude);
    const location = {
      latitude: (first.location.latitude + second.location.latitude) / 2,
      longitude: east > 180 ? east - 360 : east,
      timeZone: 'UTC',
      label: 'Davison midpoint'
    };
    const chart = natal.chartAtInstant(instant, location, {houseSystem: first.houseSystem, orbScale: first.orbScale});
    return chart.status === 'ready' ? {...chart, method: 'davison'} : chart;
  }
```

Extend the return to `{nearMidpoint, composite, davison}`.

- [ ] **Step 3: Run the tests and the suite, then commit**

```bash
node --test tests/relationship-charts.test.cjs
node --test tests/*.test.cjs
git add relationship-charts-engine.js tests/relationship-charts.test.cjs
git commit -m "feat(charts): the Davison relationship chart"
```

---

### Task 3: The render module

**Files:**
- Create: `relationship-charts.js`
- Modify: `tests/relationship-charts.test.cjs`

**Interfaces:**
- Consumes: the composite and Davison models from Tasks 1–2.
- Produces: `RelationshipCharts.render(model, {wheel})` → an HTML string, or `''` when `model.status !== 'ready'`. `wheel` is a function `model => svgString`. The browser passes `m => NatalChart.renderWheel(m, {kind:'point', key:'Sun'}, false, true)`, and it defaults to `() => ''`.

- [ ] **Step 1: Write the failing tests**

Append:

```js
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const View = require('../relationship-charts.js');
// natal-chart.js is browser-only (a top-level const reading the NatalEngine global); load it in a
// context that supplies that global, so the real wheel is exercised against both models.
const NatalChart = vm.runInNewContext(`${fs.readFileSync(path.join(__dirname, '..', 'natal-chart.js'), 'utf8')}\nNatalChart`, {NatalEngine: N});
const realWheel = m => NatalChart.renderWheel(m, {kind: 'point', key: 'Sun'}, false, true);
const PREDICTIVE = /you will|will happen|is going to|destined|soulmate|meant to be|guarantee|compatib|\blucky\b|doomed/i;

test('both charts render with the real wheel, their placements, aspects and sources', () => {
  for (let i = 0; i + 1 < charts.length; i += 2) {
    for (const model of [R.composite(charts[i], charts[i + 1]), R.davison(charts[i], charts[i + 1])]) {
      const html = View.render(model, {wheel: realWheel});
      assert.match(html, /<svg/, `${model.method}: no wheel`);
      assert.match(html, new RegExp(`data-relationship-method="${model.method}"`));
      for (const p of model.points.filter(p => p.kind === 'planet')) assert.match(html, new RegExp(`<th scope="row">[^<]*${p.name}`), `${model.method}: no row for ${p.name}`);
      assert.match(html, /Planets in Composite/);
      assert.match(html, /Ronald Davison/);
      assert.match(html, /<details/);
      assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), PREDICTIVE, `${model.method}: predictive copy`);
    }
  }
});

test('the Davison view names its moment in UTC and its place; the composite names its method', () => {
  const d = R.davison(charts[0], charts[1]);
  const html = View.render(d);
  assert.match(html, new RegExp(d.date.slice(0, 16).replace('T', ' ')));
  assert.match(html, /UTC/);
  assert.match(View.render(R.composite(charts[0], charts[1])), /midpoint/i);
});

test('a notice is shown when the composite had to change house system, and nothing renders when not ready', () => {
  const whole = N.calculate({...reference.cases[1].input, houseSystem: 'whole-sign'});
  assert.match(View.render(R.composite(charts[0], whole)), /Equal houses/);
  assert.equal(View.render({status: 'missing', message: 'x'}), '');
});
```

If `vm.runInNewContext` cannot load `natal-chart.js` because it touches something at load time other than `NatalEngine`, add only the missing global to the context object and say which one in your report. Do not change `natal-chart.js`.

- [ ] **Step 2: Implement**

Create `relationship-charts.js` in the same UMD wrapper as `chart-depth.js`. It declares a top-level `const RelationshipCharts = (() => { ... })();` with a guarded `module.exports`, and it has its own small `esc`. `render(model, {wheel = () => ''} = {})` returns:

```html
<div class="relationship-chart" data-relationship-method="composite|davison">
  <header>  eyebrow "Composite chart" or "Davison chart", an h5, one or two lines of explanation  </header>
  (Davison only) a line naming the instant as `YYYY-MM-DD HH:MM UTC` and the place as latitude and longitude to two decimals with N/S and E/W
  (if model.notice) <p class="natal-notice">notice</p>
  <figure class="relationship-wheel">${wheel(model)}</figure>
  <div class="cx-table-wrap"><table> caption; header Body / Sign & degree / House; a row per planet, then Ascendant and Midheaven; row headers <th scope="row">symbol name</th> </table></div>
  aspects: a list, tightest orb first, each "A symbol B · Type · orb N.NN°", with one short reflective line per aspect type (five lines, written for a single chart of a relationship — not "your" and "their"); a plain sentence when there are none
  <details class="cx-method"><summary>About this chart</summary> ... </details>
</div>
```

The About must state, accurately and briefly:
- **Composite:** each placement is the midpoint of the two people's placements along the shorter arc. An exactly opposed pair takes the point 90° forward of the first person's placement. The Midheaven is the midpoint of the two Midheavens, and the Ascendant the midpoint of the two Ascendants, turned 180° if needed to keep it east of the Midheaven. Houses: for Placidus and Regiomontanus, midpoints of the corresponding cusps kept in order; Whole Sign and Equal are recast from the composite Ascendant. The composite is a symbolic chart, not the sky at any moment.
- **Davison:** the sky at the moment halfway between the two births in UTC, seen from the mean latitude and the midpoint of the longitudes along the shorter way round, in the reader's house system.
- **Sources (both views):** the composite midpoint chart was popularised by Robert Hand's *Planets in Composite* (1975). The Davison relationship chart is named for Ronald Davison, who described it in *Synastry* (1977). Name no other author.
- Neither chart is a verdict on the relationship.

Escape every interpolated value. Copy must be reflective, British, and use curly apostrophes and spaced em dashes. Write no sentence claiming a position, count or direction the data does not always support. For example, never say a composite house corresponds to either person's houses, and never name a specific planet or house in fixed copy.

- [ ] **Step 3: Run the tests and the suite, then commit**

```bash
node --test tests/relationship-charts.test.cjs
node --test tests/*.test.cjs
git add relationship-charts.js tests/relationship-charts.test.cjs
git commit -m "feat(charts): render composite and Davison charts"
```

---

### Task 4: The method switch in Two skies

**Files:**
- Modify: `celestial-extras.js`
- Modify: `celestial-extras.css`
- Modify: `charts/index.html`
- Modify: `tests/pages.test.cjs`

**Interfaces:**
- Consumes: `RelationshipChartsEngine.composite/davison`, `RelationshipCharts.render`, `NatalChart.renderWheel`.

- [ ] **Step 1: The switch**

In `celestial-extras.js`, inside `#cx-synastry`, add a group between the partner form and `#cx-synastry-output`: `<div class="cx-method-switch" role="group" aria-label="How to read the two charts">`. It holds three `<button type="button" data-cx-method="synastry|composite|davison" aria-pressed>` buttons. Each has a short label and a `<small>` line, matching the `cx-tabs` pattern: "Synastry · one sky against the other", "Composite · a chart of midpoints", "Davison · the sky between two births". Synastry starts pressed. Hold the choice in a new `method` variable beside `tab`.

- [ ] **Step 2: Rendering**

In `renderSynastry()`, keep the existing missing and empty handling exactly as it is. When both charts are ready:
- `method === 'synastry'`: call `renderComparison('synastry')`, exactly as today.
- otherwise: compute `RelationshipChartsEngine[method](chart, partner)`. If its status is not `'ready'`, show its message in a `cx-error` paragraph. If it is ready, set `#cx-synastry-output` to `RelationshipCharts.render(model, {wheel: m => NatalChart.renderWheel(m, {kind:'point', key:'Sun'}, false, true)})`.

Handle `data-cx-method` in the existing delegated click listener: set `method`, update each button's `aria-pressed`, call `renderSynastry()`, and restore focus to the pressed button. The partner and the sample pair must survive switching in both directions. The heading label "Two skies · synastry" may stay, or it may name the current method; if it names the method, update it on every switch.

Guard both new globals with bare `typeof` checks. If either is missing, show only Synastry and hide the switch.

- [ ] **Step 3: Styles, scripts, keys, page test**

- `celestial-extras.css`: style `.cx-method-switch` after the existing `.cx-tabs` rules, reusing their look at a smaller size. Style `.relationship-chart`: the wheel at most about 520px wide and centred, the table in the existing `.cx-table-wrap`, and a single column under 700px. Follow the file's existing phone patterns. A rule appended at the end of a flat CSS file beats earlier phone `@media` overrides, so check that you do not clobber them. Check that the natal wheel's own SVG styles still apply outside `#birthday-room`, because the wheel's CSS may be scoped to that section; if it is, add the minimum scoped rules for `.relationship-wheel`.
- `charts/index.html`: add `/relationship-charts-engine.js?v=1` and `/relationship-charts.js?v=1` after `natal-chart.js` and before `celestial-extras.js`. Bump `celestial-extras.js` and `celestial-extras.css`. Check whether any other page loads `celestial-extras.js` or `celestial-extras.css`, and bump them there too.
- `tests/pages.test.cjs`: add `relationship-charts-engine.js` (needs `natal-engine.js`) to `DEPENDENCIES`. For `celestial-extras.js`, record the new optional peers the way the file records guarded bare reads. Read the file's header comment for the rule, and use its `{when: ...}` or optional form as it applies.

- [ ] **Step 4: Suite and commit**

```bash
node --test tests/*.test.cjs
git add celestial-extras.js celestial-extras.css charts/index.html tests/pages.test.cjs
git commit -m "feat(charts): composite and Davison in Two skies"
```

Stage any other page whose keys you bumped, by name. Do not attempt browser verification; the controller does it.

---

### Task 5: Documentation

**Files:**
- Modify: `docs/EXTENDED-ATLAS.md`
- Modify: `docs/SITE-STRUCTURE.md`

- [ ] **Step 1:** In `docs/EXTENDED-ATLAS.md`, beside the existing synastry section and in the file's register, document composite and Davison. Cover the midpoint and tie rules, the composite angles and houses, the mismatched-house-system fallback, the Davison moment and place, and the two sources. Then describe how they are tested, including which properties (self-composite, symmetry, self-Davison, the date-line pair) prove what. Update any test count to the real number.
- [ ] **Step 2:** In `docs/SITE-STRUCTURE.md`, update the `/charts/` script chain to match `charts/index.html` exactly.
- [ ] **Step 3:** Check every factual sentence against the code. Then run the suite and commit:

```bash
node --test tests/*.test.cjs
git add docs/EXTENDED-ATLAS.md docs/SITE-STRUCTURE.md
git commit -m "docs: composite and Davison relationship charts"
```

---

## Notes for the executor

- **Stop the dev preview servers before any merge.** A running static server on `V:` makes `git merge --squash` fail with `Permission denied`.
- **Never `git add -A`.**
- **PowerShell 5.1 strips inner double quotes from native arguments.** Commit messages containing quotes must go through `git commit -F <file>`.
- **Commands on `V:` can exceed two minutes.** A timeout is not a failure; check the result.
- The suite before this plan starts is 480 passing.
