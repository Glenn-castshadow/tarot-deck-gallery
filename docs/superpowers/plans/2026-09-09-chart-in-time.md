# Chart in Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add solar returns, lunar returns and progressed charts (secondary, solar arc, tertiary) to Ishtar Insights, derived from the existing natal chart and shown against it in a two-ring wheel.

**Architecture:** A new pure engine module derives an instant (a return moment, or a progressed instant) and hands it to the existing natal machinery, so houses, angles, aspects and the polar Placidus fallback stay identical to the birth chart beside them. A new UI section follows the tabs/wheel/contact-picker shape the atlas sections already use. The two-ring SVG renderer currently private to celestial-extras.js is extracted so both sections share one copy.

**Tech Stack:** Vanilla ES2020, no build step. Astronomy Engine 2.1.19 (vendored, MIT). `node --test` with `node:assert/strict`. pyswisseph in a throwaway venv for validation fixtures only.

**Spec:** `docs/superpowers/specs/2026-09-09-chart-in-time-design.md`

**Worktree:** `V:\tarot_game-chart-in-time`, branch `chart-in-time`. All paths below are relative to that worktree root. Run all commands from there.

## Global Constraints

- All calculation happens in the browser. No birth detail reaches the network.
- Swiss Ephemeris is a validation tool only. Never shipped, never imported by site code.
- Supported range is 1901-2100. A derived chart outside it returns `error`, never an extrapolation.
- Interpretations describe traditional symbolism for reflection. No predictions, no event forecasts, no scores.
- Vanilla JS, no build step, one module per feature area.
- Optional persistence goes through `IshtarStorage` from `storage-preferences.js`. Never call `localStorage` directly.
- New sections register with `mobile-sections.js` as a main fold.
- No new runtime dependency. Astronomy Engine 2.1.19 covers everything needed.
- Every module that needs testing ends with `if (typeof module !== 'undefined' && module.exports) module.exports = X;` and resolves its dependencies with the dual-global pattern used across this codebase:
  ```js
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  ```
- Bump the `?v=` cache key on any `index.html` script or stylesheet tag you touch.

## Constants used throughout

```js
const TROPICAL_YEAR = 365.2422;      // days, secondary progressions and solar returns
const SIDEREAL_MONTH = 27.321582;    // days, tertiary progressions and lunar returns
```

The synodic month (29.530589) is deliberately **not** used. Tertiary progressions here are keyed to the sidereal month. Do not "fix" this.

---

### Task 1: Extract the two-ring wheel renderer

The renderer at `celestial-extras.js:23-33` is a private const inside that module's IIFE. Extract it to `bi-wheel.js` without changing a byte of its output, guarded by a golden fixture captured from the current code *before* the change.

**Files:**
- Create: `tools/capture_bi_wheel_golden.cjs`, `tests/fixtures/bi-wheel-golden.json`, `bi-wheel.js`, `tests/bi-wheel.test.cjs`
- Modify: `celestial-extras.js:23-33` (delete local `wheel`, call shared), `celestial-extras.js` last line (`return {attach,wheel}`), `index.html` (script tag)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `BiWheel.render({inner, outer, contact, labels, centerSymbol, centerLabel}) -> string` (SVG markup). `inner` and `outer` are arrays of points carrying `{name, symbol, longitude, sign, degrees}`. `contact` is `{type, symbol, aLongitude, bLongitude}` or null. `labels` is `[innerLabel, outerLabel]`. `centerSymbol` defaults to `'✧'`, `centerLabel` to `'TWO SKIES'`.

- [ ] **Step 1: Write the capture script**

`celestial-extras.js` is browser-only with no `module.exports`, but its IIFE body only *defines* things at the top level — `BirthplaceSearch.attach` is called inside `attach()`, never at load. So it is safe to evaluate in a `vm` context with only `NatalEngine` stubbed in.

Create `tools/capture_bi_wheel_golden.cjs`:

```js
/* Captures the pre-extraction wheel output so bi-wheel.js can be proven identical. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = {NatalEngine: require(path.join(root, 'natal-engine.js')), module: undefined};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'celestial-extras.js'), 'utf8'), context);

const point = (name, symbol, longitude) => ({name, symbol, longitude, ...context.NatalEngine.placement(longitude)});
const inner = [point('Sun', '☉', 12.5), point('Moon', '☾', 100.25), point('Mars', '♂', 187.75)];
const outer = [point('Venus', '♀', 42), point('Jupiter', '♃', 250.5), point('Saturn', '♄', 333.125)];
const cases = {
  'with-contact': [inner, outer, {type: 'Square', symbol: '□', aLongitude: 12.5, bLongitude: 100.25}, ['Birth sky', 'Selected day']],
  'no-contact': [inner, outer, null, ['Your birth sky', 'Other person']],
  'crowded-labels': [
    [point('Sun', '☉', 10), point('Mercury', '☿', 13), point('Venus', '♀', 15), point('Mars', '♂', 18)],
    outer, null, ['Birth sky', 'Selected day']
  ]
};

const golden = Object.fromEntries(Object.entries(cases).map(([key, args]) => [key, context.CelestialExtras.wheel(...args)]));
fs.writeFileSync(path.join(root, 'tests/fixtures/bi-wheel-golden.json'), JSON.stringify({cases, golden}, null, 2) + '\n');
console.log('captured', Object.keys(golden).length, 'cases');
```

The `crowded-labels` case matters: the renderer has a label-separation loop that only fires when points are within 12° of each other, and a naive extraction that drops it would still pass the other two cases.

- [ ] **Step 2: Run the capture against the UNCHANGED celestial-extras.js**

Run: `node tools/capture_bi_wheel_golden.cjs`
Expected: `captured 3 cases`, and `tests/fixtures/bi-wheel-golden.json` exists.

This must happen before any edit to `celestial-extras.js`. If you have already edited it, `git checkout celestial-extras.js` first.

- [ ] **Step 3: Write the failing parity test**

Create `tests/bi-wheel.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const BiWheel = require('../bi-wheel.js');
const reference = require('./fixtures/bi-wheel-golden.json');

for (const [name, args] of Object.entries(reference.cases)) test(`renders identically to the pre-extraction wheel: ${name}`, () => {
  const [inner, outer, contact, labels] = args;
  assert.equal(BiWheel.render({inner, outer, contact, labels}), reference.golden[name]);
});

test('centre symbol and label are parameterised', () => {
  const [inner, outer, , labels] = reference.cases['no-contact'];
  const svg = BiWheel.render({inner, outer, contact: null, labels, centerSymbol: '☉', centerLabel: 'YOUR YEAR AHEAD'});
  assert.ok(svg.includes('>☉</text>'));
  assert.ok(svg.includes('YOUR YEAR AHEAD'));
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `node --test tests/bi-wheel.test.cjs`
Expected: FAIL, `Cannot find module '../bi-wheel.js'`

- [ ] **Step 5: Create bi-wheel.js**

Copy lines 23-33 of `celestial-extras.js` verbatim into the module below, then apply exactly these five substitutions and nothing else:

| Find | Replace with |
|---|---|
| `function wheel(first,second,contact,labels) {` | `function render({inner, outer, contact, labels, centerSymbol = '✧', centerLabel = 'TWO SKIES'}) {` |
| `marks(first,158,'#e8cd93')` | `marks(inner,158,'#e8cd93')` |
| `marks(second,214,'#97d3d6')` | `marks(outer,214,'#97d3d6')` |
| `contact?.symbol \|\| '✧'` | `contact?.symbol \|\| centerSymbol` |
| `contact?.type.toUpperCase() \|\| 'TWO SKIES'` | `contact?.type.toUpperCase() \|\| centerLabel` |

Every `NatalEngine.` reference inside the copied body becomes `natal.` (there are three: `NatalEngine.signGlyphs` and two `NatalEngine.mod`). Change nothing else — not whitespace inside template literals, not attribute order, not number formatting. The test compares byte-for-byte.

```js
/* Two-ring comparison chart, shared by the extra-charts and chart-in-time sections. */
const BiWheel = (() => {
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function render({inner, outer, contact, labels, centerSymbol = '✧', centerLabel = 'TWO SKIES'}) {
    // <- copied body from celestial-extras.js:23-33 with the five substitutions above
  }
  return {render};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BiWheel;
```

Rename the two parameters but change nothing else — not whitespace inside template literals, not attribute order, not number formatting. The test compares byte-for-byte.

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test tests/bi-wheel.test.cjs`
Expected: PASS, 4 tests

If the parity cases fail, diff the strings rather than adjusting the golden file. The golden file is the specification here.

- [ ] **Step 7: Switch celestial-extras.js to the shared renderer**

Delete the local `wheel` function (`celestial-extras.js:23-33`). Replace the three call sites — search for `wheel(` — with:

```js
BiWheel.render({inner: first, outer: second, contact: diagramContact, labels})
```

Change the module's final `return {attach,wheel};` to `return {attach};`.

Add to `index.html` immediately **before** the `celestial-extras-engine.js` tag:

```html
<script src="bi-wheel.js?v=1"></script>
```

and bump `celestial-extras.js?v=1` to `?v=2`.

- [ ] **Step 8: Verify nothing regressed**

Run: `node --check celestial-extras.js && node --check bi-wheel.js && node --test tests/*.test.cjs`
Expected: all existing tests still pass, plus the 4 new ones.

Then confirm no orphan references: `grep -n "CelestialExtras.wheel\|[^.]wheel(" celestial-extras.js` should return nothing.

- [ ] **Step 9: Commit**

```bash
git add bi-wheel.js celestial-extras.js index.html tests/bi-wheel.test.cjs tests/fixtures/bi-wheel-golden.json tools/capture_bi_wheel_golden.cjs
git commit -m "refactor: extract shared bi-wheel renderer from celestial-extras"
```

---

### Task 2: Expose `chartAtInstant` on the natal engine

`NatalEngine.calculate()` accepts civil `birthday` + `time` strings at `HH:MM` precision. A solved return moment carries seconds, and dropping them shifts the Ascendant by up to 0.125° — well outside the 0.01° tolerance this codebase holds itself to. So the derived-chart path needs an instant-based entry point.

This is a behaviour-preserving refactor. The existing 27 natal tests are the guard and must pass unchanged.

**Files:**
- Modify: `natal-engine.js` (extract the post-resolution body of `calculate` into `chartAtInstant`, add to the exports object)
- Test: `tests/natal-engine.test.cjs` (add cases; change nothing existing)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `NatalEngine.chartAtInstant(date, location, {houseSystem, orbScale}) -> chart`. `date` is a JS `Date`. Returns the same shape `calculate` returns minus `birthday`, `time`, `offsetMinutes` and `ambiguousTime`. Status is `ready`, `missing` (bad location) or `error` (bad or out-of-range instant).

- [ ] **Step 1: Write the failing tests**

Append to `tests/natal-engine.test.cjs`:

```js
test('chartAtInstant reproduces calculate for the same resolved instant',()=>{
  const fixture=reference.cases[1];
  const viaCalculate=engine.calculate(fixture.input);
  const viaInstant=engine.chartAtInstant(new Date(viaCalculate.date),fixture.input.location,{houseSystem:viaCalculate.houseSystem,orbScale:1});
  assert.equal(viaInstant.status,'ready');
  assert.equal(viaInstant.angles.asc,viaCalculate.angles.asc);
  assert.equal(viaInstant.angles.mc,viaCalculate.angles.mc);
  assert.deepEqual(viaInstant.cusps,viaCalculate.cusps);
  assert.deepEqual(viaInstant.points.map(p=>p.longitude),viaCalculate.points.map(p=>p.longitude));
});

test('chartAtInstant keeps sub-minute precision that a HH:MM round trip would lose',()=>{
  const location=reference.cases[1].input.location;
  const base=new Date('2024-01-15T14:30:00Z');
  const shifted=new Date('2024-01-15T14:30:45Z');
  const a=engine.chartAtInstant(base,location),b=engine.chartAtInstant(shifted,location);
  assert.ok(Math.abs(engine.delta(a.angles.asc,b.angles.asc))>0.1,'45 seconds must move the ascendant');
});

test('chartAtInstant rejects invalid and out-of-range instants without inventing angles',()=>{
  const location=reference.cases[1].input.location;
  assert.equal(engine.chartAtInstant(new Date('nope'),location).status,'error');
  assert.equal(engine.chartAtInstant(new Date('1899-01-01T00:00:00Z'),location).status,'error');
  assert.equal(engine.chartAtInstant(new Date('2101-01-01T00:00:00Z'),location).status,'error');
  assert.equal(engine.chartAtInstant(new Date('2000-01-01T00:00:00Z'),null).status,'missing');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/natal-engine.test.cjs`
Expected: FAIL, `engine.chartAtInstant is not a function`

- [ ] **Step 3: Extract chartAtInstant**

In `natal-engine.js`, add before `calculate`:

```js
  function chartAtInstant(date,location,{houseSystem='placidus',orbScale=1}={}) {
    if(!['placidus','whole-sign','equal'].includes(houseSystem)) houseSystem='placidus';
    if(![0.75,1,1.25].includes(Number(orbScale))) orbScale=1;
    orbScale=Number(orbScale);
    if(!(date instanceof Date) || !Number.isFinite(+date)) return {status:'error',message:'A valid instant is required.'};
    if(date.getUTCFullYear()<1901 || date.getUTCFullYear()>2100) return {status:'error',message:'Calculations support dates from 1901 to 2100.'};
    if(!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || Math.abs(location.latitude)>=90 || Math.abs(location.longitude)>180 || !location.timeZone) return {status:'missing',message:'Select a city suggestion, or enter coordinates and a time zone, to calculate this chart.'};
    const angles=anglesAt(date,location.latitude,location.longitude);
    let cusps=houseCusps(angles,location.latitude,houseSystem),notice='';
    if(!cusps) {houseSystem='whole-sign'; cusps=houseCusps(angles,location.latitude,houseSystem); notice='Placidus is unavailable at this latitude/time. This chart uses Whole Sign houses.';}
    const before=new Date(+date-43200000),after=new Date(+date+43200000);
    const points=planetNames.map((name,index)=>{
      const longitude=longitudeAt(name,date),speed=delta(longitudeAt(name,after),longitudeAt(name,before));
      return {name,symbol:symbols[index],kind:'planet',longitude,speed,retrograde:speed<0,stationary:Math.abs(speed)<0.005,house:houseFor(longitude,cusps),...placement(longitude)};
    });
    const t=astro.MakeTime(date).tt/36525;
    const node=mod(125.0445479-1934.1362891*t+0.0020754*t*t+t*t*t/467441-t*t*t*t/60616000);
    for(const [name,symbol,longitude] of [['North Node','☊',node],['South Node','☋',mod(node+180)]]) points.push({name,symbol,kind:'node',longitude,speed:-0.0529539,retrograde:true,stationary:false,house:houseFor(longitude,cusps),...placement(longitude)});
    const axes=[['Ascendant','ASC',angles.asc],['Midheaven','MC',angles.mc],['Descendant','DSC',angles.dc],['Imum Coeli','IC',angles.ic]].map(([name,symbol,longitude])=>({name,symbol,kind:'angle',longitude,...placement(longitude),house:houseFor(longitude,cusps)}));
    const planets=points.filter(point=>point.kind==='planet');
    const balance={elements:Object.fromEntries(elements.map(name=>[name,planets.filter(point=>point.element===name).length])),qualities:Object.fromEntries(qualities.map(name=>[name,planets.filter(point=>point.quality===name).length]))};
    const illumination=astro.Illumination('Moon',date);
    return {status:'ready',date:date.toISOString(),timeZone:location.timeZone,location,houseSystem,notice,points,axes,cusps,angles,aspects:aspectsFor([...points,...axes.slice(0,2)],orbScale),orbScale,balance,moonIllumination:illumination.phase_fraction,moonPhase:astro.MoonPhase(date)};
  }
```

That body is lifted verbatim from the tail of `calculate`. Now shrink `calculate` to delegate. Keep its existing location check exactly where it is — `localTimeCandidates` needs `location.timeZone` and would throw without it, and an existing test asserts a missing location returns `missing` before any time resolution:

```js
    const resolved=candidates[fold==='later'?candidates.length-1:0],date=resolved.utc;
    const chart=chartAtInstant(date,location,{houseSystem,orbScale});
    if(chart.status!=='ready') return chart;
    return {...chart,birthday,time,offsetMinutes:resolved.offsetMinutes,ambiguousTime:candidates.length>1};
```

Add `chartAtInstant` to the returned object.

- [ ] **Step 4: Run the full natal suite**

Run: `node --test tests/natal-engine.test.cjs`
Expected: PASS, all pre-existing tests plus the 3 new ones. Any pre-existing failure means the extraction changed behaviour — fix the extraction, not the test.

- [ ] **Step 5: Commit**

```bash
git add natal-engine.js tests/natal-engine.test.cjs
git commit -m "refactor(natal): expose chartAtInstant for derived charts"
```

---

### Task 3: Return charts

**Files:**
- Create: `chart-in-time-engine.js`, `tests/chart-in-time.test.cjs`
- Test: `tests/chart-in-time.test.cjs`

**Interfaces:**
- Consumes: `NatalEngine.chartAtInstant` (Task 2), `NatalEngine.delta`, `NatalEngine.mod`, `NatalEngine.placement`, `NatalEngine.aspectTypes`.
- Produces:
  - `ChartInTimeEngine.solveReturn(body, natalLongitude, seedMs) -> Date | null` where `body` is `'Sun'` or `'Moon'`.
  - `ChartInTimeEngine.returnChart({chart, kind, location, index, reference}) -> result`. `kind` is `'solar' | 'lunar'`. Ready result carries `{status:'ready', kind, index, moment, chart, natalPoints, contacts}` where `moment` is an ISO string and `chart` is a full `chartAtInstant` result.
  - Constants `ChartInTimeEngine.TROPICAL_YEAR`, `ChartInTimeEngine.SIDEREAL_MONTH`.

- [ ] **Step 1: Write the failing tests**

Create `tests/chart-in-time.test.cjs`:

```js
const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../chart-in-time-engine.js');
const natal=require('../natal-engine.js');
const astro=require('../vendor/astronomy-engine/astronomy.js');

const BIRTH={birthday:'1990-07-15',time:'14:30',location:{latitude:40.7143,longitude:-74.006,timeZone:'America/New_York',label:'New York, United States'}};
const chart=natal.calculate(BIRTH);
const LONDON={latitude:51.5085,longitude:-0.1257,timeZone:'Europe/London',label:'London, United Kingdom'};
const lonOf=(body,date)=>astro.Ecliptic(astro.GeoVector(body,date,true)).elon;

test('a solar return puts the Sun back on its natal longitude',()=>{
  const result=engine.returnChart({chart,kind:'solar',location:chart.location,reference:new Date('2024-03-01T00:00:00Z')});
  assert.equal(result.status,'ready');
  const natalSun=chart.points.find(p=>p.name==='Sun').longitude;
  assert.ok(Math.abs(natal.delta(lonOf('Sun',new Date(result.moment)),natalSun))<1e-6);
});

test('the returned solar moment agrees with Astronomy Engine SearchSunLongitude',()=>{
  const result=engine.returnChart({chart,kind:'solar',location:chart.location,reference:new Date('2024-03-01T00:00:00Z')});
  const natalSun=chart.points.find(p=>p.name==='Sun').longitude;
  const independent=astro.SearchSunLongitude(natalSun,new Date(+new Date(result.moment)-3*86400000),6);
  assert.ok(Math.abs(+independent.date-+new Date(result.moment))<1000,'within one second');
});

test('the governing solar return is the last one at or before the reference date',()=>{
  const reference=new Date('2024-03-01T00:00:00Z');
  const current=engine.returnChart({chart,kind:'solar',location:chart.location,reference});
  const next=engine.returnChart({chart,kind:'solar',location:chart.location,reference,index:1});
  assert.ok(+new Date(current.moment)<=+reference);
  assert.ok(+new Date(next.moment)>+reference);
  assert.equal(current.chart.date.slice(0,4),'2023');
});

test('a lunar return puts the Moon back on its natal longitude',()=>{
  const result=engine.returnChart({chart,kind:'lunar',location:chart.location,reference:new Date('2024-03-01T00:00:00Z')});
  assert.equal(result.status,'ready');
  const natalMoon=chart.points.find(p=>p.name==='Moon').longitude;
  assert.ok(Math.abs(natal.delta(lonOf('Moon',new Date(result.moment)),natalMoon))<1e-6);
});

test('lunar returns are monotonic, ~27.32 days apart, 13 or 14 per calendar year',()=>{
  const reference=new Date('2024-01-01T00:00:00Z');
  const moments=[];
  for(let i=0;i<15;i++) {
    const result=engine.returnChart({chart,kind:'lunar',location:chart.location,reference,index:i});
    assert.equal(result.status,'ready');
    moments.push(+new Date(result.moment));
  }
  for(let i=1;i<moments.length;i++) {
    assert.ok(moments[i]>moments[i-1],'monotonic');
    const gapDays=(moments[i]-moments[i-1])/86400000;
    assert.ok(gapDays>27 && gapDays<27.7,`gap ${gapDays}`);
  }
  const within=moments.filter(ms=>new Date(ms).getUTCFullYear()===2024).length;
  assert.ok(within===13 || within===14,`${within} returns in 2024`);
});

test('relocating a return moves the angles and leaves the planets alone',()=>{
  const reference=new Date('2024-03-01T00:00:00Z');
  const home=engine.returnChart({chart,kind:'solar',location:chart.location,reference});
  const away=engine.returnChart({chart,kind:'solar',location:LONDON,reference});
  assert.equal(home.moment,away.moment,'the instant does not depend on the observer');
  assert.deepEqual(home.chart.points.map(p=>p.longitude),away.chart.points.map(p=>p.longitude));
  assert.ok(Math.abs(natal.delta(home.chart.angles.asc,away.chart.angles.asc))>1);
});

test('a 29 February birth resolves returns in common years',()=>{
  const leap=natal.calculate({...BIRTH,birthday:'1992-02-29'});
  const result=engine.returnChart({chart:leap,kind:'solar',location:leap.location,reference:new Date('2023-06-01T00:00:00Z')});
  assert.equal(result.status,'ready');
  const natalSun=leap.points.find(p=>p.name==='Sun').longitude;
  assert.ok(Math.abs(natal.delta(lonOf('Sun',new Date(result.moment)),natalSun))<1e-6);
});

test('returns outside 1901-2100 and charts without a birth time do not invent answers',()=>{
  assert.equal(engine.returnChart({chart,kind:'solar',location:chart.location,reference:new Date('2024-03-01T00:00:00Z'),index:200}).status,'error');
  assert.equal(engine.returnChart({chart:natal.calculate({...BIRTH,time:''}),kind:'solar',location:chart.location}).status,'missing');
  assert.equal(engine.returnChart({chart,kind:'quarterly',location:chart.location}).status,'error');
});

test('a return before the birth date is refused rather than extrapolated',()=>{
  const result=engine.returnChart({chart,kind:'solar',location:chart.location,reference:new Date('1991-01-01T00:00:00Z'),index:-5});
  assert.equal(result.status,'error');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/chart-in-time.test.cjs`
Expected: FAIL, `Cannot find module '../chart-in-time-engine.js'`

- [ ] **Step 3: Write the engine**

Create `chart-in-time-engine.js`:

```js
/* Solar and lunar returns, and progressed charts, derived from a natal chart.
   Instants are solved here; the chart itself comes from the natal engine so
   houses, angles and the polar fallback stay identical to the birth chart. */
const ChartInTimeEngine = (() => {
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');

  const TROPICAL_YEAR = 365.2422, SIDEREAL_MONTH = 27.321582, DAY_MS = 86400000;
  const MIN_MS = Date.UTC(1901,0,1), MAX_MS = Date.UTC(2100,11,31,23,59,59,999);
  const longitudeOf = (body,time) => astro.Ecliptic(astro.GeoVector(body,time,true)).elon;

  // The equation of centre can put the true Sun ~2 degrees (~2 days) away from a
  // mean-motion estimate, so a Newton step precedes the bracket. Both bodies are
  // prograde, so the crossing is ascending, which is what Search requires.
  function solveReturn(body, natalLongitude, seedMs) {
    if (!Number.isFinite(seedMs)) return null;
    const meanSpeed = 360 / (body === 'Sun' ? TROPICAL_YEAR : SIDEREAL_MONTH);
    const f = time => natal.delta(longitudeOf(body,time), natalLongitude);
    const seed = astro.MakeTime(new Date(seedMs));
    const corrected = seed.AddDays(-f(seed) / meanSpeed);
    const found = astro.Search(f, corrected.AddDays(-2), corrected.AddDays(2), {dt_tolerance_seconds:0.01});
    if (!found) return null;
    if (Math.abs(natal.delta(longitudeOf(body,found), natalLongitude)) > 1e-6) return null;
    return found.date;
  }

  function returnChart({chart, kind, location, index = 0, reference = new Date()}) {
    if (chart?.status !== 'ready') return {status:'missing',message:'Add your birth time and a confirmed birthplace above to calculate return charts.'};
    if (!['solar','lunar'].includes(kind)) return {status:'error',message:'Unknown return type.'};
    const place = location || chart.location;
    const body = kind === 'solar' ? 'Sun' : 'Moon';
    const period = kind === 'solar' ? TROPICAL_YEAR : SIDEREAL_MONTH;
    const natalLongitude = chart.points.find(point => point.name === body).longitude;
    const birthMs = +new Date(chart.date), referenceMs = +new Date(reference);
    if (!Number.isFinite(referenceMs)) return {status:'error',message:'Choose a valid date.'};

    // Seed the return number from mean motion, then settle it against the
    // reference so index 0 is always the return governing that moment.
    let k = Math.max(0, Math.floor((referenceMs - birthMs) / (period * DAY_MS)));
    for (let guard = 0; guard < 4; guard++) {
      const current = solveReturn(body, natalLongitude, birthMs + k * period * DAY_MS);
      if (!current) break;
      if (+current > referenceMs && k > 0) { k -= 1; continue; }
      const next = solveReturn(body, natalLongitude, birthMs + (k + 1) * period * DAY_MS);
      if (next && +next <= referenceMs) { k += 1; continue; }
      break;
    }
    k += index;
    if (k < 0) return {status:'error',message:'That would fall before the birth date.'};

    const moment = solveReturn(body, natalLongitude, birthMs + k * period * DAY_MS);
    if (!moment) return {status:'error',message:'This return could not be resolved. Try a nearer date.'};
    if (+moment < MIN_MS || +moment > MAX_MS) return {status:'error',message:'Return charts support dates from 1901 to 2100.'};

    const cast = natal.chartAtInstant(moment, place, {houseSystem:chart.houseSystem, orbScale:chart.orbScale});
    if (cast.status !== 'ready') return cast;
    return {status:'ready', kind, index, returnNumber:k, moment:moment.toISOString(),
      chart:cast, natalPoints:chart.points.filter(point => point.kind === 'planet'),
      contacts:contactsTo(cast.points.filter(point => point.kind === 'planet'), chart.points.filter(point => point.kind === 'planet'), 2)};
  }

  function contactsTo(moving, birth, orbLimit) {
    const contacts = [];
    for (const a of moving) for (const b of birth) {
      const separation = Math.abs(natal.delta(a.longitude, b.longitude));
      for (const type of natal.aspectTypes) {
        const orb = Math.abs(separation - type.angle);
        if (orb <= orbLimit) contacts.push({id:`${a.name}-${b.name}-${type.name}`, a:a.name, b:b.name,
          type:type.name, symbol:type.symbol, angle:type.angle, orb, limit:orbLimit,
          aLongitude:a.longitude, bLongitude:b.longitude});
      }
    }
    return contacts.sort((x,y) => x.orb - y.orb || x.id.localeCompare(y.id));
  }

  return {solveReturn, returnChart, contactsTo, TROPICAL_YEAR, SIDEREAL_MONTH};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ChartInTimeEngine;
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/chart-in-time.test.cjs`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add chart-in-time-engine.js tests/chart-in-time.test.cjs
git commit -m "feat(chart-in-time): solar and lunar return charts"
```

---

### Task 4: Progressed charts

**Files:**
- Modify: `chart-in-time-engine.js` (add `progressedChart`, `lunationPhase`)
- Test: `tests/chart-in-time.test.cjs` (append)

**Interfaces:**
- Consumes: everything from Task 3, plus `NatalEngine.chartAtInstant`.
- Produces: `ChartInTimeEngine.progressedChart({chart, targetDate, method}) -> result`. `method` is `'secondary' | 'tertiary' | 'solar-arc'`, `targetDate` is a `YYYY-MM-DD` string. Ready result carries `{status:'ready', method, targetDate, progressedInstant, arc, points, axes, cusps, angles, contacts, lunation}`. `arc` is `null` for secondary and tertiary. `lunation` is `{angle, index, name}`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/chart-in-time.test.cjs`:

```js
test('a secondary progressed chart at the birth date reproduces the natal chart',()=>{
  // targetDate resolves to noon UTC, ~6.5h from this 18:30 UTC birth instant.
  // Divided by the tropical year that is ~64 seconds of ephemeris offset, so the
  // chart should be the natal chart to within a minute of the Moon's motion.
  const result=engine.progressedChart({chart,targetDate:chart.birthday,method:'secondary'});
  assert.equal(result.status,'ready');
  const offsetSeconds=Math.abs(+new Date(result.progressedInstant)-+new Date(chart.date))/1000;
  assert.ok(offsetSeconds<120,`offset ${offsetSeconds}s`);
  chart.points.forEach((point,index)=>{
    assert.ok(Math.abs(natal.delta(result.points[index].longitude,point.longitude))<0.02,point.name);
  });
  assert.ok(Math.abs(natal.delta(result.angles.asc,chart.angles.asc))<0.6,'ascendant');
});

test('secondary progressions advance one day of ephemeris per tropical year',()=>{
  const result=engine.progressedChart({chart,targetDate:'2020-07-15',method:'secondary'});
  const elapsedDays=(+new Date('2020-07-15T12:00:00Z')-+new Date(chart.date))/86400000;
  const expected=+new Date(chart.date)+(elapsedDays/engine.TROPICAL_YEAR)*86400000;
  assert.ok(Math.abs(+new Date(result.progressedInstant)-expected)<1000);
});

test('tertiary progressions use the sidereal lunar month, not the synodic one',()=>{
  const result=engine.progressedChart({chart,targetDate:'2020-07-15',method:'tertiary'});
  const elapsedDays=(+new Date('2020-07-15T12:00:00Z')-+new Date(chart.date))/86400000;
  const sidereal=+new Date(chart.date)+(elapsedDays/27.321582)*86400000;
  const synodic=+new Date(chart.date)+(elapsedDays/29.530589)*86400000;
  assert.ok(Math.abs(+new Date(result.progressedInstant)-sidereal)<1000);
  assert.ok(Math.abs(+new Date(result.progressedInstant)-synodic)>86400000);
});

test('the solar arc equals the secondary progressed Sun minus the natal Sun',()=>{
  const secondary=engine.progressedChart({chart,targetDate:'2020-07-15',method:'secondary'});
  const arcChart=engine.progressedChart({chart,targetDate:'2020-07-15',method:'solar-arc'});
  const natalSun=chart.points.find(p=>p.name==='Sun').longitude;
  const progressedSun=secondary.points.find(p=>p.name==='Sun').longitude;
  assert.ok(Math.abs(arcChart.arc-natal.mod(progressedSun-natalSun))<1e-9);
  // ~30 years of life is ~30 degrees of arc; mod() not delta(), so it never wraps at 180.
  assert.ok(arcChart.arc>28 && arcChart.arc<32,`arc ${arcChart.arc}`);
});

test('solar arc advances every natal point and angle by the same arc',()=>{
  const result=engine.progressedChart({chart,targetDate:'2020-07-15',method:'solar-arc'});
  chart.points.forEach((point,index)=>{
    assert.ok(Math.abs(natal.delta(result.points[index].longitude,point.longitude+result.arc))<1e-9,point.name);
  });
  assert.ok(Math.abs(natal.delta(result.angles.asc,chart.angles.asc+result.arc))<1e-9);
});

test('the progressed lunation phase reads from the progressed Sun and Moon',()=>{
  const result=engine.progressedChart({chart,targetDate:'2020-07-15',method:'secondary'});
  const sun=result.points.find(p=>p.name==='Sun').longitude;
  const moon=result.points.find(p=>p.name==='Moon').longitude;
  assert.equal(result.lunation.angle,natal.mod(moon-sun));
  assert.equal(result.lunation.index,Math.floor(natal.mod(moon-sun)/45));
  assert.ok(['New','Crescent','First Quarter','Gibbous','Full','Disseminating','Last Quarter','Balsamic'].includes(result.lunation.name));
});

test('progression contacts use tight orbs',()=>{
  const secondary=engine.progressedChart({chart,targetDate:'2020-07-15',method:'secondary'});
  const arcChart=engine.progressedChart({chart,targetDate:'2020-07-15',method:'solar-arc'});
  assert.ok(secondary.contacts.every(c=>c.orb<=2));
  assert.ok(arcChart.contacts.every(c=>c.orb<=1));
});

test('progressions reject bad input without inventing a chart',()=>{
  assert.equal(engine.progressedChart({chart,targetDate:'2020-07-15',method:'quinary'}).status,'error');
  assert.equal(engine.progressedChart({chart,targetDate:'not-a-date',method:'secondary'}).status,'error');
  assert.equal(engine.progressedChart({chart,targetDate:'2101-01-01',method:'secondary'}).status,'error');
  assert.equal(engine.progressedChart({chart:natal.calculate({...BIRTH,time:''}),targetDate:'2020-07-15'}).status,'missing');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/chart-in-time.test.cjs`
Expected: FAIL, `engine.progressedChart is not a function`

- [ ] **Step 3: Implement**

Add to `chart-in-time-engine.js` before the `return` statement:

```js
  const PHASES = ['New','Crescent','First Quarter','Gibbous','Full','Disseminating','Last Quarter','Balsamic'];
  function lunationPhase(points) {
    const sun = points.find(point => point.name === 'Sun').longitude;
    const moon = points.find(point => point.name === 'Moon').longitude;
    const angle = natal.mod(moon - sun), index = Math.floor(angle / 45);
    return {angle, index, name:PHASES[index]};
  }

  function progressedChart({chart, targetDate, method = 'secondary'}) {
    if (chart?.status !== 'ready') return {status:'missing',message:'Add your birth time and a confirmed birthplace above to calculate progressed charts.'};
    if (!['secondary','tertiary','solar-arc'].includes(method)) return {status:'error',message:'Unknown progression method.'};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate || '')) return {status:'error',message:'Choose a valid calendar date.'};
    const target = new Date(`${targetDate}T12:00:00Z`);
    if (!Number.isFinite(+target) || target.toISOString().slice(0,10) !== targetDate) return {status:'error',message:'Choose a valid calendar date.'};
    if (+target < MIN_MS || +target > MAX_MS) return {status:'error',message:'Progressed charts support dates from 1901 to 2100.'};

    const birthMs = +new Date(chart.date);
    const elapsedDays = (+target - birthMs) / DAY_MS;
    // Solar arc needs the secondary progressed Sun, so only tertiary changes the ratio.
    const ratio = method === 'tertiary' ? SIDEREAL_MONTH : TROPICAL_YEAR;
    const progressedInstant = new Date(birthMs + (elapsedDays / ratio) * DAY_MS);
    const cast = natal.chartAtInstant(progressedInstant, chart.location, {houseSystem:chart.houseSystem, orbScale:chart.orbScale});
    if (cast.status !== 'ready') return cast;

    const base = {status:'ready', method, targetDate, elapsedDays, progressedInstant:progressedInstant.toISOString()};
    if (method !== 'solar-arc') return {...base, arc:null, points:cast.points, axes:cast.axes,
      cusps:cast.cusps, angles:cast.angles, lunation:lunationPhase(cast.points),
      contacts:contactsTo(cast.points.filter(point => point.kind === 'planet'), chart.points.filter(point => point.kind === 'planet'), 2)};

    // mod(), not delta(): the accumulated arc exceeds 180 degrees past age ~180
    // and delta() would wrap it to a negative value.
    const arc = natal.mod(cast.points.find(point => point.name === 'Sun').longitude - chart.points.find(point => point.name === 'Sun').longitude);
    // Directed points carry no meaningful daily motion, so speed is zeroed and
    // applying/separating is not reported for this method.
    const shift = point => {const longitude = natal.mod(point.longitude + arc); return {...point, longitude, speed:0, retrograde:false, stationary:false, house:natal.houseFor(longitude, chart.cusps), ...natal.placement(longitude)};};
    const points = chart.points.map(shift), axes = chart.axes.map(shift);
    return {...base, arc, points, axes, cusps:chart.cusps,
      angles:{asc:natal.mod(chart.angles.asc + arc), mc:natal.mod(chart.angles.mc + arc), dc:natal.mod(chart.angles.dc + arc), ic:natal.mod(chart.angles.ic + arc)},
      lunation:lunationPhase(points),
      contacts:contactsTo(points.filter(point => point.kind === 'planet'), chart.points.filter(point => point.kind === 'planet'), 1)};
  }
```

Update the returned object to `{solveReturn, returnChart, progressedChart, lunationPhase, contactsTo, TROPICAL_YEAR, SIDEREAL_MONTH}`.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/chart-in-time.test.cjs`
Expected: PASS, 17 tests

- [ ] **Step 5: Commit**

```bash
git add chart-in-time-engine.js tests/chart-in-time.test.cjs
git commit -m "feat(chart-in-time): secondary, tertiary and solar arc progressions"
```

---

### Task 5: Independent Swiss Ephemeris validation

The behavioural tests so far prove internal consistency. This task proves the return instants agree with an independent implementation.

**Files:**
- Create: `tools/build_chart_in_time_fixtures.py`, `tests/fixtures/chart-in-time-reference.json`
- Modify: `tests/chart-in-time.test.cjs` (append)

**Interfaces:**
- Consumes: `ChartInTimeEngine.returnChart` (Task 3).
- Produces: `tests/fixtures/chart-in-time-reference.json` with shape `{swissVersion, cases:[{id, input:{birthday,time,location}, kind, reference, moment, chartLongitudes:{...}}]}`.

- [ ] **Step 1: Set up the validation environment**

pyswisseph is not installed in the default Python on this machine, despite `tools/build_natal_fixtures.py` depending on it. Create a throwaway venv:

```bash
python -m venv /tmp/swisseph-venv && /tmp/swisseph-venv/Scripts/python -m pip install -q pyswisseph && /tmp/swisseph-venv/Scripts/python -c "import swisseph; print(swisseph.version)"
```

Expected: a version string. The venv is disposable and must not be committed.

- [ ] **Step 2: Write the fixture builder**

Create `tools/build_chart_in_time_fixtures.py`:

```python
"""Independent validation fixtures; Swiss Ephemeris is a test tool, not shipped code.

Run with pyswisseph installed in a validation environment. Uses Moshier mode,
which needs no downloaded ephemeris files. Fixtures are synthetic examples.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import swisseph as swe

CASES = [
    ("solar-nyc", "1990-07-15", "14:30", 40.7143, -74.006, "America/New_York", "solar", "2024-03-01"),
    ("solar-southern", "1975-11-02", "06:15", -33.8688, 151.2093, "Australia/Sydney", "solar", "2020-01-15"),
    ("solar-leap-birth", "1992-02-29", "12:00", 51.5085, -0.1257, "Europe/London", "solar", "2023-06-01"),
    ("lunar-nyc", "1990-07-15", "14:30", 40.7143, -74.006, "America/New_York", "lunar", "2024-03-01"),
    ("lunar-early-range", "1905-04-10", "09:45", 35.6762, 139.6503, "Asia/Tokyo", "lunar", "1950-08-20"),
]
BODIES = {"Sun": swe.SUN, "Moon": swe.MOON}
FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED


def julian(moment):
    return swe.julday(moment.year, moment.month, moment.day,
                      moment.hour + moment.minute / 60 + moment.second / 3600 + moment.microsecond / 3.6e9)


def from_julian(jd):
    year, month, day, hours = swe.revjul(jd)
    return datetime(year, month, day, tzinfo=timezone.utc) + timedelta(hours=hours)


def main():
    cases = []
    for key, birthday, time, latitude, longitude, zone, kind, reference in CASES:
        birth = datetime.fromisoformat(f"{birthday}T{time}").replace(tzinfo=ZoneInfo(zone)).astimezone(timezone.utc)
        body = "Sun" if kind == "solar" else "Moon"
        natal_longitude = swe.calc_ut(julian(birth), BODIES[body], FLAGS)[0][0]

        # The governing return: the last crossing at or before the reference date.
        reference_jd = julian(datetime.fromisoformat(f"{reference}T00:00:00").replace(tzinfo=timezone.utc))
        period = 365.2422 if kind == "solar" else 27.321582
        cross = swe.solcross_ut if kind == "solar" else swe.mooncross_ut
        found = cross(natal_longitude, reference_jd - period, FLAGS)
        while True:
            following = cross(natal_longitude, found + 1, FLAGS)
            if following > reference_jd:
                break
            found = following

        moment = from_julian(found)
        longitudes = {name: swe.calc_ut(found, index, FLAGS)[0][0] for name, index in
                      [("Sun", swe.SUN), ("Moon", swe.MOON), ("Mercury", swe.MERCURY), ("Venus", swe.VENUS),
                       ("Mars", swe.MARS), ("Jupiter", swe.JUPITER), ("Saturn", swe.SATURN),
                       ("Uranus", swe.URANUS), ("Neptune", swe.NEPTUNE), ("Pluto", swe.PLUTO)]}
        cases.append({
            "id": key, "kind": kind, "reference": reference,
            "input": {"birthday": birthday, "time": time,
                      "location": {"latitude": latitude, "longitude": longitude, "timeZone": zone}},
            "moment": moment.isoformat().replace("+00:00", "Z"),
            "chartLongitudes": longitudes,
        })
    output = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
    output.mkdir(parents=True, exist_ok=True)
    (output / "chart-in-time-reference.json").write_text(
        json.dumps({"swissVersion": swe.version, "cases": cases}, indent=2) + "\n")
    print(f"wrote {len(cases)} cases, Swiss Ephemeris {swe.version}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Generate the fixtures**

Run: `/tmp/swisseph-venv/Scripts/python tools/build_chart_in_time_fixtures.py`
Expected: `wrote 5 cases, Swiss Ephemeris 2.10.x`

Open `tests/fixtures/chart-in-time-reference.json` and sanity-check that each `moment` is at or before its `reference` date and that solar moments cluster near the birthday's month and day.

- [ ] **Step 4: Write the validation test**

Append to `tests/chart-in-time.test.cjs`:

Name the import `swissReference`, not `reference` — several tests written in Tasks 3 and 4 already declare a local `const reference` for the reference *date*, and a module-level `reference` would be legal but silently shadowed inside exactly those tests.

```js
const swissReference=require('./fixtures/chart-in-time-reference.json');

for(const fixture of swissReference.cases) test(`independent ephemeris: ${fixture.id}`,()=>{
  const birth=natal.calculate(fixture.input);
  assert.equal(birth.status,'ready');
  const result=engine.returnChart({chart:birth,kind:fixture.kind,location:birth.location,reference:new Date(`${fixture.reference}T00:00:00Z`)});
  assert.equal(result.status,'ready');
  const drift=Math.abs(+new Date(result.moment)-+new Date(fixture.moment));
  assert.ok(drift<1000,`${fixture.id} moment drifted ${drift}ms`);
  for(const [name,longitude] of Object.entries(fixture.chartLongitudes)) {
    const point=result.chart.points.find(p=>p.name===name);
    assert.ok(Math.abs(natal.delta(point.longitude,longitude))<0.03,`${fixture.id} ${name}`);
  }
});
```

- [ ] **Step 5: Run it**

Run: `node --test tests/chart-in-time.test.cjs`
Expected: PASS, 22 tests

A moment drift over 1 second means the settle loop in `returnChart` picked a different return than Swiss did — check the `reference` boundary handling, not the tolerance.

- [ ] **Step 6: Commit**

```bash
git add tools/build_chart_in_time_fixtures.py tests/fixtures/chart-in-time-reference.json tests/chart-in-time.test.cjs
git commit -m "test(chart-in-time): independent Swiss Ephemeris return fixtures"
```

---

### Task 6: Interpretive text

**Files:**
- Create: `chart-in-time-text.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `ChartInTimeText` with:
  - `.returnSunHouse[1..12] -> {title, body, prompt}` — for solar returns
  - `.returnMoonHouse[1..12] -> {title, body, prompt}` — for lunar returns
  - `.returnAscendant[signName] -> {title, body, prompt}`
  - `.lunation[phaseName] -> {title, body, prompt}`
  - `.progressedSunSign[signName] -> {title, body, prompt}`
  - `.contact[aspectTypeName] -> {title, body, prompt}`
  - `.planetTheme[planetName] -> string`
  - `.method[methodKey] -> {label, summary, conventions}` for `'solar'`, `'lunar'`, `'secondary'`, `'tertiary'`, `'solar-arc'`

- [ ] **Step 1: Write the module**

Create `chart-in-time-text.js`. Voice rules, non-negotiable — match `celestial-extras.js:11-17` exactly:

- Describe what the tradition *associates* with a placement. Never state what will happen.
- Every entry ends with an open question, not advice.
- No scores, no rankings, no "good"/"bad" years.
- Phrasing like "is traditionally read as", "is associated with", "invites".

```js
/* Original reflective text for return and progressed charts. Traditional
   symbolism offered for reflection; not forecasts, not scores. */
const ChartInTimeText = (() => {
  const planetTheme = {Sun:'identity and expression',Moon:'emotional rhythms and care',Mercury:'communication and learning',Venus:'affection and shared values',Mars:'initiative and boundaries',Jupiter:'growth and perspective',Saturn:'responsibility and structure',Uranus:'independence and change',Neptune:'imagination and ideals',Pluto:'depth and renewal'};

  const returnSunHouse = {
    1: {title:'A year turned outward', body:'The return Sun in the first house is traditionally associated with visibility, appearance and the way a person meets the year on their own terms.', prompt:'What would you like to be recognised for this year?'},
    2: {title:'A year of what you hold', body:'The second house is traditionally associated with resources, worth and the practical ground a person stands on.', prompt:'What is genuinely worth your resources this year?'},
    // ... houses 3-12, same shape
  };

  // Same twelve houses, read for a month rather than a year, and about
  // emotional weather rather than identity. Do not reuse the solar wording.
  const returnMoonHouse = {
    1: {title:'A month close to the surface', body:'The return Moon in the first house is traditionally associated with feeling more visible, and with moods that show before they are named.', prompt:'What are you feeling before you have words for it?'},
    // ... houses 2-12, same shape
  };

  const returnAscendant = { /* one entry per NatalEngine.signNames value */ };
  const lunation = {
    New: {title:'A beginning without a shape yet', body:'The progressed New phase is traditionally read as a start made before its outline is visible.', prompt:'What is beginning that you cannot describe yet?'},
    // ... Crescent, First Quarter, Gibbous, Full, Disseminating, Last Quarter, Balsamic
  };
  const progressedSunSign = { /* one entry per sign */ };
  const contact = {
    Conjunction:{title:'A shared focus', body:'A conjunction places two symbols together. Consider how their themes blend, amplify or compete for attention.', prompt:'How could both needs have room?'},
    Sextile:{title:'An opening to explore', body:'A sextile is traditionally read as an invitation to cooperate.', prompt:'What small invitation could you act on?'},
    Square:{title:'A useful difference', body:'A square is traditionally read as tension between needs.', prompt:'What needs a more honest conversation?'},
    Trine:{title:'A familiar rhythm', body:'A trine is traditionally read as ease or affinity.', prompt:'What works well enough to appreciate aloud?'},
    Opposition:{title:'Two sides of a story', body:'An opposition is traditionally read as a dialogue between contrasting needs.', prompt:'What would a fair balance look like?'}
  };

  const method = {
    solar: {label:'Solar return', summary:'A chart for the moment the Sun returns to the exact degree it held at birth. Traditionally read as a frame for the year that follows.', conventions:'The return moment depends only on the Sun, so it is the same everywhere on Earth. The houses and angles depend on where the chart is cast, which is why the place you expect to be can be chosen above. This release does not precess the return.'},
    lunar: {label:'Lunar return', summary:'A chart for the moment the Moon returns to its natal degree, roughly every 27.3 days.', conventions:'Thirteen or fourteen lunar returns fall in a calendar year. As with the solar return, the moment is the same everywhere and only the houses and angles follow the chosen place.'},
    secondary: {label:'Secondary progressions', summary:'One day of movement after birth is read for one year of life.', conventions:'A year is the mean tropical year of 365.2422 days. The progressed Ascendant and Midheaven come from actual sidereal time at the progressed instant, cast for the birthplace. Naibod arc and solar-arc Midheaven are alternative conventions this release does not use.'},
    tertiary: {label:'Tertiary progressions', summary:'One day of movement after birth is read for one lunar month of life.', conventions:'A lunar month here is the sidereal month of 27.321582 days. A synodic definition of 29.530589 days also circulates under this name and produces different results.'},
    'solar-arc': {label:'Solar arc directions', summary:'Every natal placement advances by the same arc the progressed Sun has travelled.', conventions:'The arc is taken from the secondary progressed Sun. The Naibod variant, which substitutes mean solar motion, is not used. Directed points carry no daily motion, so applying and separating are not reported for this method.'}
  };

  return {planetTheme, returnSunHouse, returnMoonHouse, returnAscendant, lunation, progressedSunSign, contact, method};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ChartInTimeText;
```

Fill every ellipsis with real entries — 56 in total: 12 for `returnSunHouse`, 12 for `returnMoonHouse`, 12 for `returnAscendant`, 8 for `lunation`, 12 for `progressedSunSign`. Each is a `{title, body, prompt}` written fresh — do not paraphrase a published source, and do not let the Moon entries restate the Sun entries.

- [ ] **Step 2: Verify completeness**

Run:

```bash
node -e "const t=require('./chart-in-time-text.js');const n=require('./natal-engine.js');const miss=[];for(let h=1;h<=12;h++){if(!t.returnSunHouse[h])miss.push('sun house '+h);if(!t.returnMoonHouse[h])miss.push('moon house '+h);if(t.returnSunHouse[h]&&t.returnMoonHouse[h]&&t.returnSunHouse[h].body===t.returnMoonHouse[h].body)miss.push('moon house '+h+' duplicates sun');}for(const s of n.signNames){if(!t.returnAscendant[s])miss.push('asc '+s);if(!t.progressedSunSign[s])miss.push('sun sign '+s);}for(const p of ['New','Crescent','First Quarter','Gibbous','Full','Disseminating','Last Quarter','Balsamic'])if(!t.lunation[p])miss.push('phase '+p);for(const k of ['solar','lunar','secondary','tertiary','solar-arc'])if(!t.method[k])miss.push('method '+k);console.log(miss.length?'MISSING: '+miss.join(', '):'complete');"
```

Expected: `complete`

- [ ] **Step 3: Commit**

```bash
git add chart-in-time-text.js
git commit -m "feat(chart-in-time): reflective text for returns and progressions"
```

---

### Task 7: Section scaffold, wiring and the solar return tab

**Files:**
- Create: `chart-in-time.js`, `chart-in-time.css`
- Modify: `index.html` (nav entry, section element, stylesheet and script tags), `app.js:125` area (attach + `setBirthChart`), `mobile-sections.js:134` area (register fold)

**Interfaces:**
- Consumes: `ChartInTimeEngine.returnChart`, `ChartInTimeText`, `BiWheel.render`, `BirthplaceSearch.attach`, `NatalEngine`.
- Produces: `ChartInTime.attach(root) -> {setBirthChart(chart)}`, matching the contract `app.js:286-287` already uses for `worldAtlas` and `celestialExtras`.

**Critical constraint on the location picker.** `BirthplaceSearch.attach` at `birthplace-search.js:30` calls `input.closest('.birthplace-field')` and at line 99 calls `input.form.addEventListener(...)`. The input **must** sit inside a `.birthplace-field` wrapper **and** inside a `<form>`, or attach throws. Also `restore(value)` at line 117 only accepts the value when `value.label === input.value`, so set `input.value` first and call `restore` second.

- [ ] **Step 1: Add the section and nav entry to index.html**

In the nav at `index.html`, after the `#celestial-extras` link:

```html
<a href="#chart-in-time">Chart in time</a>
```

After the `<section id="celestial-extras">` element:

```html
<section id="chart-in-time" class="chart-in-time" aria-label="Solar returns, lunar returns and progressed charts"></section>
```

In `<head>`, after the `celestial-extras.css` link:

```html
<link rel="stylesheet" href="chart-in-time.css?v=1" />
```

Before the `app.js` script tag, after `celestial-extras.js`:

```html
<script src="chart-in-time-engine.js?v=1"></script>
<script src="chart-in-time-text.js?v=1"></script>
<script src="chart-in-time.js?v=1"></script>
```

Order matters: `bi-wheel.js` (added in Task 1) and `natal-engine.js` must load before `chart-in-time.js`.

- [ ] **Step 2: Write the section module with the solar tab**

Create `chart-in-time.js`:

```js
/* Solar returns, lunar returns and progressed charts. */
const ChartInTime = (() => {
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sample = {birthday:'1990-07-15',time:'14:30',location:{latitude:40.7143,longitude:-74.006,timeZone:'America/New_York',label:'New York, United States'}};
  const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const readable = iso => new Date(iso).toLocaleString('en-GB',{dateStyle:'long',timeStyle:'short',timeZone:'UTC'}) + ' UTC';

  function attach(root) {
    root.innerHTML = `<header class="cit-heading"><p class="acg-eyebrow">Your chart in time</p><h3>The same sky, read across a life.</h3><p>A year framed by the Sun's return, a month framed by the Moon's, and the slow chart that moves a degree at a time.</p></header>
      <div class="cit-tabs" role="group" aria-label="Chart in time views">
        <button type="button" data-cit-tab="solar" aria-controls="cit-solar" aria-pressed="true"><span>☉</span>Your year ahead<small>Solar return</small></button>
        <button type="button" data-cit-tab="lunar" aria-controls="cit-lunar" aria-pressed="false"><span>☾</span>Your month<small>Lunar return</small></button>
        <button type="button" data-cit-tab="progressed" aria-controls="cit-progressed" aria-pressed="false"><span>⟳</span>The slow chart<small>Progressions &amp; directions</small></button>
      </div>
      <div class="cx-profile-bar"><p class="cit-profile-status">Use your birth details above to make these charts personal.</p><button type="button" data-cit-sample>Try a sample chart</button></div>
      <form id="cit-place-form" class="cit-place-form">
        <div class="birthplace-field">
          <label for="cit-place"><span>Where you expect to be <small>for return charts</small></span></label>
          <div class="city-input-wrap"><input id="cit-place" type="text" placeholder="Start typing a city…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cit-place-list" aria-describedby="cit-place-status">
          <div id="cit-place-list" class="city-suggestions" role="listbox" aria-label="Matching cities" hidden></div></div>
          <p id="cit-place-status" class="city-search-status" role="status">Choose a city, or keep your birthplace.</p>
        </div>
        <button type="submit" class="cit-primary">Update return charts</button>
        <button type="button" data-cit-place-reset>Use my birthplace</button>
      </form>
      <section id="cit-solar" class="cit-view"><div class="cit-view-heading"><div><p class="acg-small-label">Solar return</p><h4>The year the Sun begins again.</h4></div><div class="cit-nav" role="group" aria-label="Choose a return"><button type="button" data-cit-step="-1" aria-label="Previous year">←</button><output id="cit-solar-label" aria-live="polite"></output><button type="button" data-cit-step="1" aria-label="Next year">→</button><button type="button" data-cit-now>This year</button></div></div><div id="cit-solar-output" aria-live="polite"></div></section>
      <section id="cit-lunar" class="cit-view" hidden><div id="cit-lunar-output" aria-live="polite"></div></section>
      <section id="cit-progressed" class="cit-view" hidden><div id="cit-progressed-output" aria-live="polite"></div></section>`;

    const $ = selector => root.querySelector(selector);
    const placePicker = BirthplaceSearch.attach({input:$('#cit-place'), list:$('#cit-place-list'), status:$('#cit-place-status')});
    let savedChart=null, chart=null, usingSample=false, tab='solar', manualLocation=null;
    const offsets = {solar:0, lunar:0};
    const missing = message => `<div class="cx-missing"><span aria-hidden="true">✧</span><p>${esc(message)}</p><button type="button" data-cit-birth>Add birth details ↑</button></div>`;

    // BirthplaceSearch sets input.value programmatically when a suggestion is
    // chosen, which fires no change event, so the selection is read on demand
    // rather than cached from an event. getSelection() self-invalidates when the
    // input text no longer matches the chosen city.
    function place() { return manualLocation || placePicker.getSelection() || chart?.location || null; }
    function chosenPlace() { return manualLocation || placePicker.getSelection(); }

    function profileStatus() {
      $('.cit-profile-status').textContent = usingSample
        ? 'Sample chart · illustrative birth details, not your personal chart.'
        : chart ? `Your birth sky · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected birthplace'}`
        : 'Use your birth details above to make these charts personal.';
      $('[data-cit-sample]').textContent = usingSample ? 'Use my profile' : 'Try a sample chart';
    }

    function renderReturn(kind) {
      const output = $(`#cit-${kind}-output`);
      const model = ChartInTimeEngine.returnChart({chart, kind, location:place(), index:offsets[kind], reference:new Date()});
      if (model.status === 'missing') { output.innerHTML = missing(model.message); return; }
      if (model.status === 'error') { output.innerHTML = `<p class="cx-error" role="alert">${esc(model.message)}</p>`; return; }
      const text = ChartInTimeText.method[kind];
      // The lunar return reads the Moon's house, and must use the Moon's own
      // text table — the solar wording is about a year and about identity.
      const sun = model.chart.points.find(point => point.name === (kind === 'solar' ? 'Sun' : 'Moon'));
      const house = (kind === 'solar' ? ChartInTimeText.returnSunHouse : ChartInTimeText.returnMoonHouse)[sun.house];
      const rising = ChartInTimeText.returnAscendant[model.chart.axes[0].sign];
      if (kind === 'solar') $('#cit-solar-label').textContent = new Date(model.moment).getUTCFullYear();
      output.innerHTML = `<p class="cit-moment">${usingSample?'Sample · ':''}Exact return: <strong>${esc(readable(model.moment))}</strong> · cast for ${esc(place().label || 'the selected place')}</p>
        <div class="cx-comparison"><div class="cx-chart-art">${BiWheel.render({inner:model.natalPoints, outer:model.chart.points.filter(p=>p.kind==='planet'), contact:null, labels:['Birth sky','Return chart'], centerSymbol:kind==='solar'?'☉':'☾', centerLabel:text.label.toUpperCase()})}<p class="cx-ring-key"><span>Birth sky</span><span>Return chart</span></p></div>
        <div class="cit-reading"><p class="acg-small-label">Return ${esc(sun.name)} in house ${sun.house}</p><h5>${esc(house.title)}</h5><p>${esc(house.body)}</p><blockquote>${esc(house.prompt)}</blockquote>
        <p class="acg-small-label">Return Ascendant · ${esc(model.chart.axes[0].sign)}</p><h5>${esc(rising.title)}</h5><p>${esc(rising.body)}</p><blockquote>${esc(rising.prompt)}</blockquote></div></div>
        <details class="cx-placements"><summary>Return placements, houses &amp; angles</summary><div class="cx-table-wrap"><table><thead><tr><th>Point</th><th>Return sign</th><th>House</th><th>Birth sign</th></tr></thead><tbody>${model.chart.points.filter(p=>p.kind==='planet').map((point,index)=>`<tr><th>${point.symbol} ${esc(point.name)}</th><td>${esc(point.sign)} ${point.degrees}</td><td>${point.house}</td><td>${esc(model.natalPoints[index].sign)} ${model.natalPoints[index].degrees}</td></tr>`).join('')}</tbody><tbody>${model.chart.axes.map(axis=>`<tr><th>${esc(axis.symbol)} ${esc(axis.name)}</th><td>${esc(axis.sign)} ${axis.degrees}</td><td colspan="2">—</td></tr>`).join('')}</tbody></table></div></details>
        <details class="cx-method"><summary>About this ${esc(text.label.toLowerCase())}</summary><p>${esc(text.summary)}</p><p>${esc(text.conventions)}</p><p>Symbolic interpretations support reflection and conversation, not predictions about events.</p></details>`;
    }

    function renderActive() {
      if (tab === 'solar' || tab === 'lunar') renderReturn(tab);
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      const data = button.dataset;
      if ('citTab' in data) {
        tab = data.citTab;
        root.querySelectorAll('[data-cit-tab]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        root.querySelectorAll('.cit-view').forEach(panel => panel.hidden = panel.id !== `cit-${tab}`);
        renderActive();
      }
      if ('citBirth' in data) { document.querySelector('#birthday-input').focus(); document.querySelector('#birthday-form').scrollIntoView({block:'center'}); }
      if ('citSample' in data) {
        usingSample = !usingSample;
        chart = usingSample ? NatalEngine.calculate(sample) : savedChart;
        offsets.solar = 0; offsets.lunar = 0;
        profileStatus(); renderActive();
      }
      if ('citStep' in data) { offsets[tab] += Number(data.citStep); renderActive(); }
      if ('citNow' in data) { offsets[tab] = 0; renderActive(); }
      if ('citPlaceReset' in data) {
        manualLocation = null;
        $('#cit-place').value = chart?.location?.label || '';
        placePicker.restore(null);
        renderActive();
      }
    });

    $('#cit-place-form').addEventListener('submit', event => { event.preventDefault(); renderActive(); });

    profileStatus(); renderActive();
    return {setBirthChart(value) {
      savedChart = value?.status === 'ready' ? value : null;
      if (!usingSample) chart = savedChart;
      if (!chosenPlace() && chart?.location?.label) $('#cit-place').value = chart.location.label;
      profileStatus(); renderActive();
    }};
  }
  return {attach};
})();
```

- [ ] **Step 3: Write chart-in-time.css**

Create `chart-in-time.css`. Read `celestial-extras.css` first and follow it — this section sits directly beneath that one and must not look like a different site. Reuse its palette (`#0a202c` chart ground, `#bba477` rules, `#e8cd93` inner ring, `#97d3d6` outer ring) and its type scale.

The markup in Step 2 deliberately reuses several existing class names — `cx-profile-bar`, `cx-missing`, `cx-error`, `cx-comparison`, `cx-chart-art`, `cx-ring-key`, `cx-placements`, `cx-method`, `cx-table-wrap`, `acg-eyebrow`, `acg-small-label`, `birthplace-field`, `city-input-wrap`, `city-suggestions`, `city-search-status` — so those are already styled and need no new rules. Style only the new `cit-` classes:

`.chart-in-time`, `.cit-heading`, `.cit-tabs` (matching `.cx-tabs`), `.cit-profile-status`, `.cit-place-form`, `.cit-custom-place`, `.cit-manual-toggle`, `.cit-primary` (matching `.cx-primary`), `.cit-view`, `.cit-view-heading`, `.cit-nav`, `.cit-controls`, `.cit-moment`, `.cit-reading`, `.cit-contacts`.

Requirements: no horizontal overflow at 390px; `.cit-nav` and `.cit-controls` wrap rather than scroll; `.cit-contacts ul` is a plain list with no bullets; the section prints legibly (follow the existing print rules in `celestial-extras.css`).

- [ ] **Step 4: Wire it into app.js**

After `app.js:125`:

```js
const chartInTime = ChartInTime.attach(document.querySelector("#chart-in-time"));
```

Beside the existing `setBirthChart` calls at `app.js:279-280` and `app.js:286-287`:

```js
chartInTime.setBirthChart(null);   // in the branch that clears
chartInTime.setBirthChart(natal);  // in the branch that sets
```

- [ ] **Step 5: Register the mobile fold**

After `mobile-sections.js:134`:

```js
wrap([document.querySelector('#chart-in-time')], 'Chart in time', {key: 'chart-in-time', group: 'main', level: 2, subtitle: 'Solar & lunar returns · progressions'});
```

- [ ] **Step 6: Verify**

Run: `node --check chart-in-time.js && node --test tests/*.test.cjs`
Expected: syntax clean, 101 tests pass (72 baseline + 3 from Task 2 + 4 bi-wheel + 22 chart-in-time).

Then open `index.html` over a local static server and confirm: the section renders, the solar tab shows a wheel and a return moment, previous/next steps the year, "This year" returns to the current one, and the browser console is empty. Enter birth details and confirm the chart becomes personal.

- [ ] **Step 7: Commit**

```bash
git add chart-in-time.js chart-in-time.css index.html app.js mobile-sections.js
git commit -m "feat(chart-in-time): section scaffold and solar return tab"
```

---

### Task 8: Lunar return tab and persisted return location

**Files:**
- Modify: `chart-in-time.js` (lunar view markup and navigation), `app.js:349` (save `returnLocation`), `app.js:355-374` area (restore it)

**Interfaces:**
- Consumes: `ChartInTime.attach` (Task 7), `IshtarStorage`.
- Produces: `ChartInTime.attach(root)` additionally returns `{setBirthChart, getReturnLocation()}` so `app.js` can persist the chosen place.

- [ ] **Step 1: Give the lunar view its own heading and navigation**

In `chart-in-time.js`, replace the placeholder lunar section with the same shape the solar one uses:

```html
<section id="cit-lunar" class="cit-view" hidden><div class="cit-view-heading"><div><p class="acg-small-label">Lunar return</p><h4>The month the Moon begins again.</h4></div><div class="cit-nav" role="group" aria-label="Choose a return"><button type="button" data-cit-step="-1" aria-label="Previous return">←</button><output id="cit-lunar-label" aria-live="polite"></output><button type="button" data-cit-step="1" aria-label="Next return">→</button><button type="button" data-cit-now>Now</button></div></div><div id="cit-lunar-output" aria-live="polite"></div></section>
```

In `renderReturn`, set the lunar label alongside the existing solar one:

```js
      if (kind === 'solar') $('#cit-solar-label').textContent = new Date(model.moment).getUTCFullYear();
      else $('#cit-lunar-label').textContent = new Date(model.moment).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
```

- [ ] **Step 2: Add the custom-coordinates escape hatch**

The spec requires the return-location picker to have the same unlisted-place fallback the birth form has. Add inside `#cit-place-form`, before the submit button:

```html
<details class="cit-custom-place"><summary>Use coordinates for an unlisted place</summary>
  <label class="cit-manual-toggle"><input type="checkbox" id="cit-manual"> Use these coordinates</label>
  <fieldset id="cit-manual-fields" disabled>
    <label>Latitude <small>north + / south −</small><input id="cit-lat" type="number" min="-89.9999" max="89.9999" step="any"></label>
    <label>Longitude <small>east + / west −</small><input id="cit-lon" type="number" min="-180" max="180" step="any"></label>
    <label>IANA time zone<input id="cit-zone" type="text" list="birth-timezones" placeholder="e.g. Europe/London"></label>
  </fieldset>
</details>
```

`birth-timezones` is the datalist the birth form already populates, so it is reused rather than duplicated.

Task 7 registered no `change` listener, so create one now (Task 9 extends it):

```js
    root.addEventListener('change', event => {
      if (event.target.id === 'cit-manual') {
        $('#cit-manual-fields').disabled = !event.target.checked;
        if (!event.target.checked) { manualLocation = null; renderActive(); }
      }
    });
```

And read the fields on submit, replacing the submit handler from Task 7:

```js
    $('#cit-place-form').addEventListener('submit', event => {
      event.preventDefault();
      if ($('#cit-manual').checked) {
        const latitude = Number($('#cit-lat').value), longitude = Number($('#cit-lon').value), timeZone = $('#cit-zone').value.trim();
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) >= 90 || Math.abs(longitude) > 180 || !timeZone) {
          $('#cit-place-status').textContent = 'Enter a latitude, a longitude and an IANA time zone.';
          return;
        }
        manualLocation = {latitude, longitude, timeZone, label: $('#cit-place').value.trim() || 'Custom place', source: 'manual'};
      } else {
        manualLocation = null;
      }
      renderActive();
    });
```

- [ ] **Step 3: Expose the chosen location**

Change the returned object in `attach`:

```js
    return {
      setBirthChart(value) { /* unchanged from Task 7 */ },
      getReturnLocation() { return chosenPlace(); },
      setReturnLocation(value) {
        if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || !value.timeZone) return;
        $('#cit-place').value = value.label || '';
        if (value.source === 'manual') {
          manualLocation = value;
          $('#cit-manual').checked = true; $('#cit-manual-fields').disabled = false;
          $('#cit-lat').value = value.latitude; $('#cit-lon').value = value.longitude; $('#cit-zone').value = value.timeZone;
        } else {
          placePicker.restore(value);   // must follow the input.value assignment above
        }
        renderActive();
      }
    };
```

`placePicker.restore` at `birthplace-search.js:117` only accepts the value when `value.label === input.value`, which is why the assignment comes first.

- [ ] **Step 4: Persist and restore it in app.js**

At `app.js:349`, add the field to the saved object:

```js
returnLocation: chartInTime.getReturnLocation()
```

In the restore block around `app.js:355-374`, after the existing `birthplacePicker.restore(...)` call:

```js
    if (savedBirthday.returnLocation) chartInTime.setReturnLocation(savedBirthday.returnLocation);
```

The write already goes through `IshtarStorage.setItem`, so consent gating is inherited. Do not add a `localStorage` call.

- [ ] **Step 5: Verify**

Run: `node --check chart-in-time.js && node --check app.js && node --test tests/*.test.cjs`

In the browser: switch to the lunar tab, confirm ~27-day steps and that thirteen or fourteen steps forward covers about a year. Choose a return city different from the birthplace, press "Update return charts", and confirm the angles change while the planets do not. Reload and confirm the city comes back. Enter custom coordinates instead and confirm those persist too. Then decline optional saving in the cookie banner, reload, and confirm nothing comes back.

- [ ] **Step 6: Commit**

```bash
git add chart-in-time.js app.js
git commit -m "feat(chart-in-time): lunar return tab and saved return location"
```

---

### Task 9: Progressions tab

**Files:**
- Modify: `chart-in-time.js` (progressed view markup, `renderProgressed`, route it from `renderActive`)

**Interfaces:**
- Consumes: `ChartInTimeEngine.progressedChart`, `ChartInTimeText.method`, `ChartInTimeText.lunation`, `ChartInTimeText.progressedSunSign`, `ChartInTimeText.contact`, `ChartInTimeText.planetTheme`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Replace the placeholder progressed section**

```html
<section id="cit-progressed" class="cit-view" hidden><div class="cit-view-heading"><div><p class="acg-small-label">Progressions &amp; directions</p><h4>A degree at a time.</h4></div><div class="cit-controls"><label for="cit-method">Method<select id="cit-method"><option value="secondary">Secondary · a day for a year</option><option value="tertiary">Tertiary · a day for a lunar month</option><option value="solar-arc">Solar arc directions</option></select></label><label for="cit-target">Date<input id="cit-target" type="date" min="1901-01-01" max="2100-12-31"></label><button type="button" data-cit-today>Today</button></div></div><div id="cit-progressed-output" aria-live="polite"></div></section>
```

Set the initial value after `innerHTML` is assigned: `$('#cit-target').value = today();`

- [ ] **Step 2: Add renderProgressed**

```js
    function renderProgressed() {
      const output = $('#cit-progressed-output');
      const method = $('#cit-method').value;
      const model = ChartInTimeEngine.progressedChart({chart, targetDate:$('#cit-target').value, method});
      if (model.status === 'missing') { output.innerHTML = missing(model.message); return; }
      if (model.status === 'error') { output.innerHTML = `<p class="cx-error" role="alert">${esc(model.message)}</p>`; return; }
      const text = ChartInTimeText.method[method];
      const sun = model.points.find(point => point.name === 'Sun');
      const sunText = ChartInTimeText.progressedSunSign[sun.sign];
      const phase = ChartInTimeText.lunation[model.lunation.name];
      const contacts = model.contacts.slice(0, 12);
      output.innerHTML = `<p class="cit-moment">${usingSample?'Sample · ':''}${esc(text.label)} for ${esc($('#cit-target').value)} · ephemeris instant <strong>${esc(readable(model.progressedInstant))}</strong>${model.arc===null?'':` · arc ${model.arc.toFixed(2)}°`}</p>
        <div class="cx-comparison"><div class="cx-chart-art">${BiWheel.render({inner:chart.points.filter(p=>p.kind==='planet'), outer:model.points.filter(p=>p.kind==='planet'), contact:null, labels:['Birth sky','Progressed'], centerSymbol:'⟳', centerLabel:text.label.toUpperCase()})}<p class="cx-ring-key"><span>Birth sky</span><span>Progressed</span></p></div>
        <div class="cit-reading"><p class="acg-small-label">Progressed Sun · ${esc(sun.sign)} ${sun.degrees}</p><h5>${esc(sunText.title)}</h5><p>${esc(sunText.body)}</p><blockquote>${esc(sunText.prompt)}</blockquote>
        <p class="acg-small-label">Progressed lunation · ${esc(model.lunation.name)} · ${model.lunation.angle.toFixed(1)}°</p><h5>${esc(phase.title)}</h5><p>${esc(phase.body)}</p><blockquote>${esc(phase.prompt)}</blockquote></div></div>
        <div class="cit-contacts"><h5>Progressed contacts to the birth chart</h5>${contacts.length?`<ul>${contacts.map(item=>{const t=ChartInTimeText.contact[item.type];return `<li><strong>Progressed ${esc(item.a)} ${item.symbol} birth ${esc(item.b)}</strong> <span>${item.orb.toFixed(2)}° orb</span><p>This brings together symbolism around ${esc(ChartInTimeText.planetTheme[item.a])} and ${esc(ChartInTimeText.planetTheme[item.b])}. ${esc(t.body)}</p><blockquote>${esc(t.prompt)}</blockquote></li>`;}).join('')}</ul>`:'<p>No contacts within orb on this date. Try another date or method.</p>'}</div>
        <details class="cx-placements"><summary>Progressed placements</summary><div class="cx-table-wrap"><table><thead><tr><th>Point</th><th>Progressed</th><th>Birth</th></tr></thead><tbody>${model.points.filter(p=>p.kind==='planet').map((point,index)=>`<tr><th>${point.symbol} ${esc(point.name)}</th><td>${esc(point.sign)} ${point.degrees}</td><td>${esc(chart.points[index].sign)} ${chart.points[index].degrees}</td></tr>`).join('')}</tbody></table></div></details>
        <details class="cx-method"><summary>About ${esc(text.label.toLowerCase())}</summary><p>${esc(text.summary)}</p><p>${esc(text.conventions)}</p><p>Symbolic interpretations support reflection and conversation, not predictions about events.</p></details>`;
    }
```

- [ ] **Step 3: Route it**

```js
    function renderActive() {
      if (tab === 'progressed') renderProgressed();
      else renderReturn(tab);
    }
```

Add to the click handler: `if ('citToday' in data) { $('#cit-target').value = today(); renderProgressed(); }`

Extend the `change` handler created in Task 8 — do not register a second listener:

```js
      if (event.target.id === 'cit-method' || event.target.id === 'cit-target') renderProgressed();
```

- [ ] **Step 4: Verify**

Run: `node --check chart-in-time.js && node --test tests/*.test.cjs`

In the browser: switch methods and confirm the arc line appears only for solar arc; confirm tertiary moves the chart much further than secondary for the same date; confirm an out-of-range date shows the error rather than a chart.

- [ ] **Step 5: Commit**

```bash
git add chart-in-time.js
git commit -m "feat(chart-in-time): progressions and directions tab"
```

---

### Task 10: Documentation and full verification

**Files:**
- Create: `docs/CHART-IN-TIME.md`
- Modify: `chart-in-time.css` (final pass), `index.html` (bump cache keys touched during the build)

- [ ] **Step 1: Write the doc**

Create `docs/CHART-IN-TIME.md` following the structure of `docs/NATAL-CHART.md`: **Included**, **Astronomical conventions**, **Progression conventions**, **Independent validation**.

It must state explicitly:

- Return moments are solved with Astronomy Engine's `Search` over the same longitude expression the natal engine uses, to 0.01s tolerance, verified to 1e-6° after solving.
- A return moment is identical everywhere on Earth; only houses and angles follow the chosen place.
- Returns are not precessed in this release.
- Secondary uses the mean tropical year of 365.2422 days; tertiary uses the sidereal month of 27.321582 days, and the synodic variant of 29.530589 is a different convention.
- Progressed angles come from real sidereal time at the progressed instant cast for the birthplace; Naibod arc and solar-arc MC are not used.
- Solar arc takes the arc from the secondary progressed Sun; the Naibod variant is not used; applying/separating is not reported for directed points.
- Contact orbs are 2° for secondary and tertiary, 1° for solar arc.
- The validation command and what the fixtures cover.

- [ ] **Step 2: Run everything**

Run: `node --test tests/*.test.cjs`
Expected: 101 passing, 0 failing. That is the 72-test baseline measured on this branch before Task 1, plus 3 added to `natal-engine` in Task 2, 4 in `bi-wheel`, and 22 in `chart-in-time`.

Note the glob: `node --test tests/` fails on Node 24 with `MODULE_NOT_FOUND`, so the test path must be expanded by the shell. Run it from Bash, not PowerShell.

Run: `for f in *.js; do node --check "$f" || echo "FAILED $f"; done`
Expected: no failures.

- [ ] **Step 3: Manual QA**

Confirm each, and report any that fail rather than marking the task done:

- Desktop and 390px width, no horizontal overflow in either.
- Keyboard and touch selection in the return-location picker; arrow keys and Enter both work.
- Mobile fold opens and closes, and only one main fold is open at a time.
- Tab and date state survive re-rendering after birth details change.
- The transits, synastry and BaZi section still renders correctly — it now shares the extracted wheel.
- Print layout is intact.
- Browser console is free of warnings and errors.
- No personal birth details are left in the page when you finish.

- [ ] **Step 4: Commit**

```bash
git add docs/CHART-IN-TIME.md chart-in-time.css index.html
git commit -m "docs: chart-in-time conventions and validation"
```

- [ ] **Step 5: Report**

Summarise for Glenn: what shipped, the full test count, anything that failed QA, and the branch state. Do not merge or deploy without asking — `main` is deployed to GitHub Pages and the VPS.
