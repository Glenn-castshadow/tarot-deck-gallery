# Chart saving, part B (C5b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in reader can save a synastry, composite or Davison chart and a Four Pillars reading from `/charts/`, and a Jyotish chart from `/eastern/`, and reopen each from the journal as the chart it was. Also (Task 5, Glenn's request): the "Visual research library · 32 decks" line leaves the home page.

**Architecture:** `chart-rooms.js` (C5a) already validates every kind's payload; this part adds three summaries and wires two more modules. `celestial-extras.js` registers `synastry`, `composite`, `davison` and `bazi` (the save button's kind follows the chosen method); `jyotish.js` registers `jyotish`. Both follow the chart-in-time pattern: a restored gate, `current()`/`load()`, a banner with "Use my chart", and a stand-in-DOM round-trip test. Static only: the server learned `composite` and `davison` in C5a.

**Tech Stack:** Vanilla ES2020, no build step; `node --test tests/*.test.cjs` (555 passing before this plan).

**Spec:** `docs/superpowers/specs/2026-09-16-chart-saving-design.md`

**Plan decisions (rulings on the spec):**
- The partner's `birth` is taken from the partner natal chart (`ChartRooms.birthFromChart(partner)`), which carries the partner form's inputs; the partner's `houseSystem` is the reader's, since the form casts the partner with `chart.houseSystem`.
- "Use my chart" on a two-person chart returns the reader's own chart to the live profile and keeps the partner on the form: a re-save then stores the live birth with that partner, which is what the form shows.
- BaZi's summary is the day pillar: "Day pillar 甲子 · Jia Zi" (`model.pillars[2].characters`, `.stem[1]`, `.branch[1]`). Jyotish's is "Lagna Simha · Moon in Rohini" (`model.lagna.sign`, the Moon graha's `nakshatra.name`).
- A saved Jyotish chart reopens on the saved tab; the dashas tab still reads "now" from today's date, as it does live.
- `chart-rooms.js` moves to `?v=2` on both pages because its summaries change.

## Global Constraints

Tags: **[Glenn]** his instruction; **[codebase]** already enforced; **[program]** Part E; **[spec]** a C5 decision; **[judgement]** mine.

- No new dependencies. [Glenn]
- Every payload embeds its inputs and reopens without the live profile. [spec]
- Saving is explicit and disclosed beside the button; nothing is stored on the reader's behalf. Two-person charts use `NOTES.two`; BaZi and Jyotish use `NOTES.one`. [spec]
- While a module's restored chart is on screen, `setBirthChart` pushes are ignored by that module only; "Use my chart" clears it. [spec]
- Bare `typeof` guards, never `window.X`. British spelling, curly apostrophes. [codebase]
- Keyboard operable; after "Use my chart", focus the save button. 390px and 1400px verified by the controller before merge. [program, C5a final review]
- A test added for a fix must be shown to fail without the fix. [C5a lesson]
- Cache keys bumped on every changed file, on every page that loads it; exact keys in each task. [codebase]
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never `git add -A`. Commands on `V:` can exceed two minutes. [session, codebase]

---

### Task 1: Summaries for the C5b kinds, and `chart-rooms.js` on `/eastern/`

**Files:**
- Modify: `chart-rooms.js` (the `summaries` object); `charts/index.html` and `eastern/index.html` (`chart-rooms.js?v=1` → `v=2`; on `/eastern/` add the tag after `natal-engine.js`)
- Test: `tests/chart-rooms.test.cjs`

**Interfaces:**
- Produces: `summaries.twoPerson(kind, birth, partner)` → `'Synastry · 12 Mar 1980 · 4 Jul 1982'` (label from `{synastry: 'Synastry', composite: 'Composite', davison: 'Davison'}`); `summaries.bazi(model)` → `'Day pillar 甲子 · Jia Zi'`; `summaries.jyotish(model)` → `'Lagna Simha · Moon in Rohini'`.

- [ ] **Step 1: Write the failing test.** Append to `tests/chart-rooms.test.cjs`:

```js
test('summaries for two-person charts, BaZi and Jyotish', () => {
  const a = {...BIRTH, date: '1980-03-12'}, b = {...BIRTH, date: '1982-07-04'};
  assert.equal(R.summaries.twoPerson('synastry', a, b), 'Synastry · 12 Mar 1980 · 4 Jul 1982');
  assert.equal(R.summaries.twoPerson('composite', a, b), 'Composite · 12 Mar 1980 · 4 Jul 1982');
  assert.equal(R.summaries.twoPerson('davison', a, b), 'Davison · 12 Mar 1980 · 4 Jul 1982');
  assert.equal(R.summaries.bazi({pillars: [null, null, {characters: '甲子', stem: ['甲', 'Jia'], branch: ['子', 'Zi']}, null]}), 'Day pillar 甲子 · Jia Zi');
  assert.equal(R.summaries.jyotish({lagna: {sign: 'Simha'}, grahas: [{name: 'Sun', nakshatra: {name: 'Magha'}}, {name: 'Moon', nakshatra: {name: 'Rohini'}}]}), 'Lagna Simha · Moon in Rohini');
});
```

- [ ] **Step 2: Run it.** `node --test tests/chart-rooms.test.cjs`. Expected: fails, `twoPerson` is not a function.

- [ ] **Step 3: Implement.** In `chart-rooms.js`, inside the `summaries` object after `horary`:

```js
    twoPerson: (kind, birth, partner) => `${{synastry: 'Synastry', composite: 'Composite', davison: 'Davison'}[kind]} · ${shortDate(birth.date + 'T00:00:00Z')} · ${shortDate(partner.date + 'T00:00:00Z')}`,
    bazi: model => { const p = model.pillars[2]; return `Day pillar ${p.characters} · ${p.stem[1]} ${p.branch[1]}`; },
    jyotish: model => `Lagna ${model.lagna.sign} · Moon in ${model.grahas.find(g => g.name === 'Moon').nakshatra.name}`
```

- [ ] **Step 4: Run the tests.** `node --test tests/chart-rooms.test.cjs`. Expected: 7 pass.

- [ ] **Step 5: Pages.** `charts/index.html`: `/chart-rooms.js?v=1` → `/chart-rooms.js?v=2`. `eastern/index.html`: after `<script src="/natal-engine.js?v=c5-1"></script>` add `<script src="/chart-rooms.js?v=2"></script>`. Run `node --test tests/pages.test.cjs`.

- [ ] **Step 6: Commit.** `git add chart-rooms.js tests/chart-rooms.test.cjs charts/index.html eastern/index.html`; message `feat(charts): summaries for two-person, BaZi and Jyotish charts`.

---

### Task 2: Saving two-person charts and Four Pillars

**Files:**
- Modify: `celestial-extras.js`; `charts/index.html` (`celestial-extras.js?v=5` → `v=6`; `data-room="synastry composite davison bazi"` on `<section id="celestial-extras"`); `tests/pages.test.cjs`
- Test: `tests/celestial-extras-room.test.cjs` (new)

**Interfaces:**
- Consumes: `ChartRooms.{validate, birthFromChart, natalFrom, reading, describe, summaries.twoPerson, summaries.bazi, saveControl, banner, NOTES, restoredGate}`; `Rooms.register`.
- Produces: rooms `synastry`, `composite`, `davison` (payload `{v: 1, birth, partner}`, layout the house system) and `bazi` (payload `{v: 1, birth, pillar}`, layout `'four-pillars'`), registered inside `CelestialExtras.attach`.

- [ ] **Step 1: Write the failing test.** Create `tests/celestial-extras-room.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const Rooms = require('../rooms.js');
const ChartRooms = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');
const CelestialExtrasEngine = require('../celestial-extras-engine.js');
const RelationshipChartsEngine = require('../relationship-charts-engine.js');

// A minimal stand-in DOM element: properties are plain fields, queries return cached children.
const el = () => { const cache = {}; return {innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false, open: false, dataset: {}, style: {},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); }, matches() { return false; },
  addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}, reset() {}, insertAdjacentHTML(_, html) { this.innerHTML += html; }}; };

const chart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}});
const other = NatalEngine.calculate({birthday: '1985-11-29', time: '09:15', location: {latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London', label: 'London, United Kingdom'}});
const partnerBirth = {date: '1982-07-04', time: '08:00', place: {name: 'Paris, France', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'}, houseSystem: 'placidus', fold: '', orbScale: 1};

function boot() {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  root.querySelector('#cx-partner-form').addEventListener = (type, fn) => { if (type === 'submit') listeners.submitPartner = () => fn({preventDefault() {}}); };
  root.querySelector('#cx-annual-year').value = '2026';
  const src = fs.readFileSync(path.join(__dirname, '../celestial-extras.js'), 'utf8');
  const picker = {selection: null, getSelection() { return this.selection; }, restore(v) { this.selection = v; }};
  const CelestialExtras = new Function('BirthplaceSearch', 'CelestialExtrasEngine', 'BiWheel', 'NatalEngine', 'RelationshipChartsEngine', 'RelationshipCharts', 'NatalChart', 'Rooms', 'ChartRooms', 'window', 'location', 'document', 'requestAnimationFrame', src + '\nreturn CelestialExtras;')
    ({attach: () => picker}, CelestialExtrasEngine, {render: () => ''}, NatalEngine, RelationshipChartsEngine, {render: () => '<div class="rc"></div>'}, {renderWheel: () => ''}, Rooms, ChartRooms, {addEventListener() {}}, {hash: ''}, {querySelector: () => el()}, fn => fn());
  const api = CelestialExtras.attach(root);
  return {root, listeners, api, picker};
}

test('celestial extras registers the two-person rooms and BaZi, and readings round-trip', () => {
  const {root, listeners, api, picker} = boot();
  assert.deepEqual(Rooms.list().map(r => r.kind).sort(), ['bazi', 'composite', 'davison', 'synastry']);
  for (const kind of ['synastry', 'composite', 'davison', 'bazi']) assert.equal(Rooms.get(kind).current(), null, kind);
  api.setBirthChart(chart);

  // BaZi saves the reader's birth and the pillar in view.
  listeners.click({target: {closest: () => ({dataset: {cxTab: 'bazi'}})}});
  listeners.click({target: {closest: () => ({dataset: {cxPillar: '1'}})}});
  const bazi = Rooms.get('bazi').current();
  assert.deepEqual({...bazi.payload, birth: undefined}, {v: 1, birth: undefined, pillar: 1});
  assert.deepEqual(bazi.payload.birth, ChartRooms.birthFromChart(chart));
  assert.match(bazi.summary, /^Day pillar \S+ · \w+ \w+$/); assert.equal(bazi.layout, 'four-pillars');
  assert.match(root.querySelector('#cx-bazi-output').innerHTML, /data-save-reading="bazi"[\s\S]*Saving stores the birth details this chart was cast from\./);

  // Two skies: the partner comes from the form; the kind follows the method.
  listeners.click({target: {closest: () => ({dataset: {cxTab: 'synastry'}})}});
  assert.equal(Rooms.get('synastry').current(), null, 'no partner yet');
  root.querySelector('#cx-partner-date').value = '1982-07-04'; root.querySelector('#cx-partner-time').value = '08:00';
  root.querySelector('#cx-partner-fold').value = '';
  picker.selection = {latitude: 48.8566, longitude: 2.3522, timeZone: 'Europe/Paris', label: 'Paris, France'};
  listeners.submitPartner();
  const syn = Rooms.get('synastry').current();
  assert.equal(syn.kind, 'synastry');
  assert.deepEqual(syn.payload.partner, partnerBirth);
  assert.equal(syn.summary, 'Synastry · 15 Jul 1990 · 4 Jul 1982'); assert.equal(syn.layout, 'placidus');
  assert.match(root.querySelector('#cx-synastry-output').innerHTML, /data-save-reading="synastry"[\s\S]*Saving stores both people’s birth details\./);
  listeners.click({target: {closest: () => ({dataset: {cxMethod: 'davison'}})}});
  assert.equal(Rooms.get('synastry').current(), null, 'the synastry room is idle while Davison is shown');
  const dav = Rooms.get('davison').current();
  assert.equal(dav.kind, 'davison'); assert.equal(dav.summary, 'Davison · 15 Jul 1990 · 4 Jul 1982');
  assert.match(root.querySelector('#cx-synastry-output').innerHTML, /data-save-reading="davison"/);

  // Reopen a composite chart for two other people: the form shows the saved partner.
  const saved = ChartRooms.reading('composite', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), partner: partnerBirth}});
  assert.equal(Rooms.get('composite').load(saved), true);
  const out = root.querySelector('#cx-synastry-output').innerHTML;
  assert.match(out, /class="restored-chart" role="status">Saved chart · cast for 29 November 1985 at 09:15, London, United Kingdom and 4 July 1982 at 08:00, Paris, France/);
  assert.match(out, /data-chart-live="composite"/);
  assert.equal(root.querySelector('#cx-partner-date').value, '1982-07-04');
  assert.equal(root.querySelector('#cx-partner-manual').checked, true);
  assert.equal(root.querySelector('#cx-partner-zone').value, 'Europe/Paris');
  assert.deepEqual(Rooms.get('composite').current().payload, saved.payload);

  // A profile push while restored changes nothing on screen; "Use my chart" returns to the live chart, keeping the partner.
  const before = root.querySelector('#cx-synastry-output').innerHTML;
  api.setBirthChart(chart);
  assert.equal(root.querySelector('#cx-synastry-output').innerHTML, before);
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'composite'}})}});
  const live = Rooms.get('composite').current();
  assert.deepEqual(live.payload.birth, ChartRooms.birthFromChart(chart));
  assert.deepEqual(live.payload.partner, partnerBirth);
  assert.doesNotMatch(root.querySelector('#cx-synastry-output').innerHTML, /restored-chart/);

  // Reopen a BaZi reading; a refused payload leaves the state alone; the sample is never saved.
  assert.equal(Rooms.get('bazi').load({payload: {v: 1, birth: ChartRooms.birthFromChart(other), pillar: 3}}), true);
  assert.match(root.querySelector('#cx-bazi-output').innerHTML, /restored-chart[\s\S]*data-chart-live="bazi"/);
  assert.equal(Rooms.get('bazi').current().payload.pillar, 3);
  assert.equal(Rooms.get('bazi').load({payload: {v: 1, birth: ChartRooms.birthFromChart(other), pillar: 9}}), false);
  assert.equal(Rooms.get('bazi').current().payload.pillar, 3);
  listeners.click({target: {closest: () => ({dataset: {cxSample: ''}})}});
  assert.equal(Rooms.get('bazi').current(), null);
  assert.equal(Rooms.get('synastry').current(), null);
});
```

- [ ] **Step 2: Run it.** `node --test tests/celestial-extras-room.test.cjs`. Expected: fails (no rooms registered). If the stand-in DOM lacks a property the module reads, add it to `el()`; never change the module to suit the stub.

- [ ] **Step 3: Implement.** In `celestial-extras.js`, inside `attach`:

  - After the `let savedChart=null, …` line add:
    ```js
    const restored = ChartRooms.restoredGate();   // {kind, birth, partnerBirth|null} while a saved chart is open
    const KINDS = {synastry: 'Synastry', composite: 'Composite chart', davison: 'Davison chart', bazi: 'Four Pillars'};
    const twoPersonKind = () => method;   // the save button follows the method: 'synastry' | 'composite' | 'davison'
    ```
  - Add, before `renderActive`:
    ```js
    function selectTab(name) {
      tab = name;
      root.querySelectorAll('[data-cx-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cxTab === tab)));
      root.querySelectorAll('.cx-view').forEach(panel => panel.hidden = panel.id !== `cx-${tab}`);
      renderActive();
    }
    function selectMethod(name) {
      method = name;
      root.querySelectorAll('[data-cx-method]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cxMethod === method)));
      $('#cx-synastry-label').textContent = `Two skies · ${methodLabels[method]}`;
    }
    const restoredBanner = kind => {
      if (!restored.active() || restored.get().kind !== kind) return '';
      const r = restored.get();
      return ChartRooms.banner(`Saved chart · cast for ${ChartRooms.describe(r.birth)}${r.partnerBirth ? ` and ${ChartRooms.describe(r.partnerBirth)}` : ''}`, {live: kind});
    };
    const saveControl = (kind, note) => sample ? '' : ChartRooms.saveControl(kind, note);
    function fillPartnerForm(birth) {
      $('#cx-partner-date').value = birth.date; $('#cx-partner-time').value = birth.time; $('#cx-partner-fold').value = birth.fold;
      $('#cx-partner-fold-label').hidden = !birth.fold;
      $('#cx-partner-place').value = birth.place.name; partnerPicker.restore(null);
      $('#cx-partner-manual').checked = true; $('#cx-partner-coordinates').disabled = false; $('.cx-custom-place').open = true;
      $('#cx-partner-lat').value = String(birth.place.lat); $('#cx-partner-lon').value = String(birth.place.lon); $('#cx-partner-zone').value = birth.place.tz;
    }
    function current(kind) {
      if (!chart || sample) return null;
      const birth = restored.active() ? restored.get().birth : ChartRooms.birthFromChart(chart);
      if (!birth) return null;
      if (kind === 'bazi') {
        const model = CelestialExtrasEngine.bazi(chart);
        if (model.status !== 'ready') return null;
        return ChartRooms.reading('bazi', {payload: {v: 1, birth, pillar: pillarIndex}, summary: ChartRooms.summaries.bazi(model), layout: 'four-pillars'});
      }
      if (kind !== method || !partner || partner.status !== 'ready' || synastryModel?.status !== 'ready') return null;
      const partnerBirth = restored.active() && restored.get().partnerBirth ? restored.get().partnerBirth : ChartRooms.birthFromChart(partner);
      if (!partnerBirth) return null;
      return ChartRooms.reading(kind, {payload: {v: 1, birth, partner: partnerBirth}, summary: ChartRooms.summaries.twoPerson(kind, birth, partnerBirth), layout: birth.houseSystem});
    }
    function load(kind, reading) {
      const payload = ChartRooms.validate(kind, reading?.payload);
      if (!payload) return false;
      const natal = ChartRooms.natalFrom(payload.birth);
      if (natal.status !== 'ready') return false;
      let partnerNatal = null;
      if (kind !== 'bazi') {
        if (kind !== 'synastry' && !relationshipReady) return false;
        partnerNatal = ChartRooms.natalFrom(payload.partner);
        if (partnerNatal.status !== 'ready') return false;
      }
      const before = {chart, partner, sample, tab, method, pillarIndex};
      sample = false; chart = natal;
      restored.set({kind, birth: payload.birth, partnerBirth: kind === 'bazi' ? null : payload.partner});
      if (kind === 'bazi') { pillarIndex = payload.pillar; openGod = ''; profileStatus(); selectTab('bazi'); }
      else { partner = partnerNatal; fillPartnerForm(payload.partner); selectMethod(kind); profileStatus(); selectTab('synastry'); }
      const ok = kind === 'bazi' ? CelestialExtrasEngine.bazi(chart).status === 'ready' : synastryModel?.status === 'ready';
      if (!ok) {
        restored.clear(); ({chart, partner, sample, method, pillarIndex} = before);
        if (kind !== 'bazi') selectMethod(method);
        profileStatus(); selectTab(before.tab);
        return false;
      }
      if (typeof MobileSections !== 'undefined') MobileSections.reveal(root);
      return true;
    }
    ```
  - In `profileStatus`, when `restored.active()` show `` `Saved chart · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected place'}` `` instead of the "Your birth sky" line.
  - In `renderComparison`, when `mode === 'synastry'`, prepend `restoredBanner(method)` to the `innerHTML` template and append `saveControl(method, ChartRooms.NOTES.two)` after the final `</details>`. The transit mode gets neither.
  - In `renderSynastry`'s composite/Davison branch, wrap the render: `` `${restoredBanner(method)}${RelationshipCharts.render(...)}${saveControl(method, ChartRooms.NOTES.two)}` `` on the ready path only.
  - In `renderBazi`, prepend `restoredBanner('bazi')` to the `#cx-bazi-output` template and append `saveControl('bazi', ChartRooms.NOTES.one)` at its end.
  - In the click handler: replace the `cxTab` branch body with `selectTab(data.cxTab);`; replace the `cxMethod` branch's first two statements and the label update with `selectMethod(data.cxMethod);` (keep `renderSynastry(); button.focus(...)`); at the start of the `cxSample` branch add `restored.clear();`; add
    ```js
    if('chartLive' in data) {restored.clear();chart=savedChart;profileStatus();renderActive();root.querySelector(`#cx-${tab}-output [data-save-reading]`)?.focus({preventScroll:true});}
    ```
    (`#cx-synastry-output` and `#cx-bazi-output` are the two outputs the button can sit in.)
  - In `followChartLink`, replace the three lines that set `tab`, the `aria-pressed` loop and the `hidden` loop plus `renderActive()` with `selectTab(view);`.
  - In `setBirthChart`, after `savedChart=…`, add `if(restored.active())return;` before `chart=savedChart`.
  - Before `return {setBirthChart…}`, register:
    ```js
    if (typeof Rooms !== 'undefined') {
      for (const kind of ['synastry', 'composite', 'davison', 'bazi']) {
        Rooms.register(kind, {label: KINDS[kind], category: 'charts', current: () => current(kind), load: reading => load(kind, reading)});
      }
    }
    ```

- [ ] **Step 4: Run the tests.** `node --test tests/celestial-extras-room.test.cjs tests/relationship-charts.test.cjs`. Expected: pass.

- [ ] **Step 5: Page and dependency.** `charts/index.html`: `celestial-extras.js?v=5` → `v=6`; add `data-room="synastry composite davison bazi"` to `<section id="celestial-extras"`. `tests/pages.test.cjs`: extend `'celestial-extras.js'` with `'chart-rooms.js', 'rooms.js'` and the comment `// ChartRooms.restoredGate() at attach; Rooms.register behind a typeof guard, without it saving silently disappears.`

- [ ] **Step 6: Run the suite.** `node --test tests/*.test.cjs`. Expected: all pass.

- [ ] **Step 7: Commit.** `git add celestial-extras.js tests/celestial-extras-room.test.cjs tests/pages.test.cjs charts/index.html`; message `feat(charts): save and reopen two-person charts and Four Pillars`.

---

### Task 3: Saving Jyotish charts

**Files:**
- Modify: `jyotish.js`; `eastern/index.html` (`jyotish.js?v=2` → `v=3`; `data-room="jyotish"` on `<section id="jyotish"`); `tests/pages.test.cjs`
- Test: `tests/jyotish-room.test.cjs` (new)

**Interfaces:**
- Consumes: `ChartRooms.{validate, birthFromChart, natalFrom, reading, describe, summaries.jyotish, saveControl, banner, NOTES.one, restoredGate}`; `Rooms.register`.
- Produces: room `jyotish`; payload `{v: 1, birth, tab, gochar}`; layout `'sidereal'`.

- [ ] **Step 1: Write the failing test.** Create `tests/jyotish-room.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const Rooms = require('../rooms.js');
const ChartRooms = require('../chart-rooms.js');
const NatalEngine = require('../natal-engine.js');
const JyotishEngine = require('../jyotish-engine.js');
const JyotishText = require('../jyotish-text.js');

const el = () => { const cache = {}; return {innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false, open: false, dataset: {}, style: {},
  querySelector(sel) { return cache[sel] || (cache[sel] = el()); }, querySelectorAll() { return []; }, closest() { return el(); },
  addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}}; };

const chart = NatalEngine.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York', label: 'New York, United States'}});
const other = NatalEngine.calculate({birthday: '1985-11-29', time: '09:15', location: {latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London', label: 'London, United Kingdom'}});

test('the Jyotish room saves the birth, the tab and the Gochar date, and reopens them', () => {
  Rooms._reset();
  const root = el(), listeners = {};
  root.addEventListener = (type, fn) => { listeners[type] = fn; };
  const src = fs.readFileSync(path.join(__dirname, '../jyotish.js'), 'utf8');
  const Jyotish = new Function('JyotishEngine', 'JyotishText', 'JyotishChart', 'NatalEngine', 'Rooms', 'ChartRooms', 'document', src + '\nreturn Jyotish;')
    (JyotishEngine, JyotishText, {render: () => ''}, NatalEngine, Rooms, ChartRooms, {querySelector: () => el()});
  const api = Jyotish.attach(root);
  const room = Rooms.get('jyotish');
  assert.ok(room);
  assert.equal(room.current(), null, 'nothing to save before a chart');
  api.setBirthChart(chart);
  listeners.click({target: {closest: () => ({dataset: {jyTab: 'gochar'}})}});
  root.querySelector('#jy-gochar-date').value = '2026-09-16';
  listeners.change({target: {id: 'jy-gochar-date', value: '2026-09-16'}});
  const reading = room.current();
  assert.deepEqual({...reading.payload, birth: undefined}, {v: 1, birth: undefined, tab: 'gochar', gochar: '2026-09-16'});
  assert.deepEqual(reading.payload.birth, ChartRooms.birthFromChart(chart));
  assert.match(reading.summary, /^Lagna \w+ · Moon in [\w ]+$/); assert.equal(reading.layout, 'sidereal');
  assert.match(root.querySelector('#jy-gochar-output').innerHTML, /data-save-reading="jyotish"[\s\S]*Saving stores the birth details this chart was cast from\./);

  // Reopen on the rashi tab for another birth.
  const saved = ChartRooms.reading('jyotish', {payload: {v: 1, birth: ChartRooms.birthFromChart(other), tab: 'rashi', gochar: '2026-03-01'}});
  assert.equal(room.load(saved), true);
  const rashi = root.querySelector('#jy-rashi').innerHTML;
  assert.match(rashi, /class="restored-chart" role="status">Saved chart · cast for 29 November 1985 at 09:15, London, United Kingdom/);
  assert.match(rashi, /data-chart-live="jyotish"/);
  assert.equal(root.querySelector('#jy-gochar-date').value, '2026-03-01');
  assert.deepEqual(room.current().payload, saved.payload);

  // A profile push while restored changes nothing on screen; "Use my chart" returns to the live chart.
  const before = rashi, beforeSummary = room.current().summary;
  api.setBirthChart(chart);
  assert.equal(root.querySelector('#jy-rashi').innerHTML, before); assert.equal(room.current().summary, beforeSummary);
  listeners.click({target: {closest: () => ({dataset: {chartLive: 'jyotish'}})}});
  assert.deepEqual(room.current().payload.birth, ChartRooms.birthFromChart(chart));
  assert.doesNotMatch(root.querySelector('#jy-rashi').innerHTML, /restored-chart/);

  // Refused payload leaves the state alone; the sample is never saved.
  assert.equal(room.load({payload: {v: 1, birth: ChartRooms.birthFromChart(other), tab: 'moon', gochar: '2026-03-01'}}), false);
  assert.deepEqual(room.current().payload.birth, ChartRooms.birthFromChart(chart));
  listeners.click({target: {closest: () => ({dataset: {jySample: ''}})}});
  assert.equal(room.current(), null);
});
```

- [ ] **Step 2: Run it.** `node --test tests/jyotish-room.test.cjs`. Expected: fails (no room).

- [ ] **Step 3: Implement.** In `jyotish.js`, inside `attach`:

  - After the `let savedChart = null, …` line add `const restored = ChartRooms.restoredGate();   // {birth} while a saved chart is open`.
  - Add, before `renderRashi`:
    ```js
    const restoredBanner = () => restored.active() ? ChartRooms.banner(`Saved chart · cast for ${ChartRooms.describe(restored.get().birth)}`, {live: 'jyotish'}) : '';
    const saveControl = () => usingSample ? '' : ChartRooms.saveControl('jyotish', ChartRooms.NOTES.one);
    const framed = html => `${restoredBanner()}${html}${saveControl()}`;
    ```
    and wrap the five ready-path `innerHTML` assignments: in `renderRashi`, `renderNakshatras`, `renderDashas` and `renderNavamsa` the `$('#jy-…').innerHTML = framed(`…`)`, and in `renderGochar` the `out.innerHTML = framed(`…`)` on its ready path. The `missing` and error paths stay as they are.
  - In `profileStatus`, when `restored.active()` show `` `Saved chart · ${chart.birthday} · ${chart.time} · ${chart.location.label || 'Selected place'}` `` instead of the "Your birth sky" line.
  - Add, before `renderActive`:
    ```js
    function selectTab(name) {
      tab = name;
      root.querySelectorAll('[data-jy-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.jyTab === tab)));
      root.querySelectorAll('.jy-view').forEach(panel => panel.hidden = panel.id !== `jy-${tab}`);
      renderActive();
    }
    function current() {
      if (!chart || usingSample) return null;
      const model = JyotishEngine.sidereal(chart);
      if (model.status !== 'ready') return null;
      const birth = restored.active() ? restored.get().birth : ChartRooms.birthFromChart(chart);
      return birth ? ChartRooms.reading('jyotish', {payload: {v: 1, birth, tab, gochar: gocharDay}, summary: ChartRooms.summaries.jyotish(model), layout: 'sidereal'}) : null;
    }
    function load(reading) {
      const payload = ChartRooms.validate('jyotish', reading?.payload);
      if (!payload) return false;
      const natal = ChartRooms.natalFrom(payload.birth);
      if (natal.status !== 'ready' || JyotishEngine.sidereal(natal).status !== 'ready') return false;
      usingSample = false; chart = natal; selectedMaha = null; selectedGraha = null;
      restored.set({birth: payload.birth});
      gocharDay = payload.gochar; $('#jy-gochar-date').value = gocharDay;
      profileStatus(); selectTab(payload.tab);
      if (typeof MobileSections !== 'undefined') MobileSections.reveal(root);
      return true;
    }
    ```
  - In the click handler: replace the `jyTab` branch body with `selectTab(data.jyTab);`; at the start of the `jySample` branch add `restored.clear();`; add
    ```js
    if ('chartLive' in data) { restored.clear(); chart = savedChart; selectedMaha = null; selectedGraha = null; profileStatus(); renderActive(); $(`#jy-${tab}`).querySelector('[data-save-reading]')?.focus({preventScroll:true}); }
    ```
  - In `setBirthChart`, after `savedChart = …`, add `if (restored.active()) return;`.
  - Before `return {`, register: `if (typeof Rooms !== 'undefined') Rooms.register('jyotish', {label: 'Jyotish chart', category: 'eastern', current, load});`

- [ ] **Step 4: Run the tests.** `node --test tests/jyotish-room.test.cjs tests/jyotish.test.cjs`. Expected: pass.

- [ ] **Step 5: Page and dependency.** `eastern/index.html`: `jyotish.js?v=2` → `v=3`; `data-room="jyotish"` on `<section id="jyotish"`. `tests/pages.test.cjs`: extend `'jyotish.js'` with `'chart-rooms.js', 'rooms.js'` and the comment `// ChartRooms.restoredGate() at attach; Rooms.register behind a typeof guard, without it saving silently disappears.`

- [ ] **Step 6: Run the suite.** Expected: all pass.

- [ ] **Step 7: Commit.** `git add jyotish.js tests/jyotish-room.test.cjs tests/pages.test.cjs eastern/index.html`; message `feat(eastern): save and reopen Jyotish charts`.

---

### Task 4: Documentation

**Files:**
- Modify: `docs/ACCOUNTS.md`, `docs/SITE-STRUCTURE.md`, `docs/EXTENDED-ATLAS.md`, `docs/JYOTISH.md`

- [ ] **Step 1: `docs/ACCOUNTS.md`.** In "Saved charts": the payload table gains the five C5b kinds with the field names as implemented; the two-person note; the restored-gate behaviour in `celestial-extras.js` (the save button follows the method; "Use my chart" keeps the partner) and `jyotish.js` (reopens on the saved tab); `chart-rooms.js` is now loaded on `/eastern/` too; the test files and counts (`tests/chart-rooms.test.cjs` 7, `tests/celestial-extras-room.test.cjs` 1, `tests/jyotish-room.test.cjs` 1); remove the sentence that says C5b adds these.
- [ ] **Step 2: `docs/SITE-STRUCTURE.md`.** The `/eastern/` script chain (`chart-rooms.js` after `natal-engine.js`), the `data-room` list (every kind is registered now; none are forward declarations), and the `Rooms.register` caller list.
- [ ] **Step 3: `docs/EXTENDED-ATLAS.md` and `docs/JYOTISH.md`.** A short "Saving" paragraph in each: what the payload holds, the note shown, what reopening does. Remove any claim that these sections do not save. Check every claim against the code and use `grep -c "^test(" tests/<file>` for counts.
- [ ] **Step 4: Commit.** `git add docs/ACCOUNTS.md docs/SITE-STRUCTURE.md docs/EXTENDED-ATLAS.md docs/JYOTISH.md`; message `docs: chart saving, part B`.

---

### Task 5: Remove the "Visual research library · 32 decks" line from the home page

Glenn's request (2026-09-16), folded into this plan. The line is the `eyebrow` div in the hub's hero masthead, rendered by `site-shell.js`; `deck-archive.js` updates its count behind a guard, which becomes dead code.

**Files:**
- Modify: `site-shell.js` (`renderHeroHeader`), `site-shell.css` (the `.eyebrow` rule and the comment near line 39 that lists the hero's parts), `deck-archive.js` (the `#archive-total` lines), and the cache keys: `site-shell.js?v=5` → `v=6` and `site-shell.css?v=3` → `v=4` on all eight pages (`account`, `charts`, `divination`, `eastern`, `index`, `numerology`, `sky`, `tarot`); `deck-archive.js?v=3` → `v=4` on `tarot/index.html`.

- [ ] **Step 1: Remove the line.** In `site-shell.js` `renderHeroHeader`, delete the whole `<div class="eyebrow">…</div>` line (the one containing `Visual research library` and `id="archive-total"`). Nothing else in the header changes.
- [ ] **Step 2: Remove what only served it.** In `site-shell.css`, delete the `.eyebrow { justify-content: center; color: var(--gold-light); }` rule, and in the comment near line 39 drop "eyebrow" from the list of hero parts. In `deck-archive.js`, delete the comment `// The live deck count sits in the hub's hero masthead…`, the `const archiveTotal = document.querySelector("#archive-total");` line and the `if (archiveTotal) …` line. Confirm with `grep -rn "archive-total\|eyebrow-" --include=*.js --include=*.css --include=*.html .` (excluding `.claude`, `.superpowers`, `docs`) that nothing else references them; `.acg-eyebrow` in the chart modules is a different class and stays.
- [ ] **Step 3: Cache keys.** Bump the three keys on the pages listed above; make each a one-string edit per file (CRLF files).
- [ ] **Step 4: Verify.** `node --test tests/*.test.cjs` (pages.test.cjs checks the script tags); `grep -rn "Visual research library" --include=*.html --include=*.js .` outside `.claude`/`.superpowers`/`docs` returns nothing. Grep `docs/*.md` for "Visual research library", "archive-total" and "32 decks" and correct any sentence that describes the line.
- [ ] **Step 5: Commit.** `git add site-shell.js site-shell.css deck-archive.js account/index.html charts/index.html divination/index.html eastern/index.html index.html numerology/index.html sky/index.html tarot/index.html` (plus any doc corrected); message `chore(home): remove the visual research library line from the hero`.

---

## Notes for the executor

- Stop dev preview servers before any merge.
- Deployment is static only: the release replaces `chart-rooms.js`, `celestial-extras.js`, `jyotish.js`, `site-shell.js`, `site-shell.css`, `deck-archive.js` and all eight pages' HTML. The previous release is `20260916-chart-saving-a57e863`.
- Before the merge, the controller checks in the browser on `/charts/` and `/eastern/`: the save control and note on Two skies (each method), Four Pillars and every Jyotish tab; reopening one reading of each kind through `?reading=`, then a profile change leaving it in place, then "Use my chart"; 390px and 1400px. Signed-in saves need Glenn's login.
- The node suite before this plan is 555 passing.
