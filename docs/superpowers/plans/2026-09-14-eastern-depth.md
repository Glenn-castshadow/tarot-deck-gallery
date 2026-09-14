# Eastern depth (C3c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Chinese year relation (under the Chinese zodiac portrait on `/eastern/`), the BaZi annual pillar (in the Four Pillars tab on `/charts/`) and Gochar (a fifth Jyotish tab on `/eastern/`).

**Architecture:** Three independent features, each a pure engine function with tests and then a UI task. The Chinese year is a new UMD module `chinese-year.js`; the annual pillar extends `celestial-extras-engine.js`; Gochar extends `jyotish-engine.js` and `jyotish-text.js`.

**Tech Stack:** Vanilla ES2020 in plain `<script>` tags, no build step. UMD modules. Tests are `node --test tests/*.test.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-14-eastern-depth-design.md`

## Global Constraints

Tags: **[Glenn]** his instruction; **[codebase]** already enforced by the repo; **[program]** Part E of `docs/superpowers/specs/2026-09-13-site-expansion-design.md`; **[spec]** a C3c spec decision taken under Glenn's instruction to complete C3 unattended; **[judgement]** mine in this plan.

- **No backend change, no journal kind, no saving.** Do not touch `server/`, `kinds.py`, the migrations or `rooms.js`. [spec]
- **The annual pillar lives in the Four Pillars tab on `/charts/`; the Chinese year and Gochar live on `/eastern/`.** [spec]
- **The Chinese year uses lunar years**, matching the portrait; **the annual pillar uses Li Chun solar years**, matching the Four Pillars tab. [spec]
- **Branch relations follow the spec's table exactly**, and every applicable relation is shown in the fixed order same, trine, harmony, clash, harm, punishment, self-punishment, destruction. [spec]
- **Gochar counts whole-sign houses from the natal Moon's sidereal sign, at 12:00 UTC on the chosen day, with the spec's supportive table, no Vedha, and a Sade Sati note for Saturn in the 12th, 1st or 2nd.** [spec]
- Existing Four Pillars, portrait and Jyotish tabs render exactly as today. [spec]
- Engines are pure UMD with no DOM, tested under `node --test tests/*.test.cjs`. [program, codebase]
- Copy is reflective and traditional-association only: no fortune, luck, lucky or unlucky, no predictions, no verdicts. Gochar copy uses the past tense and third person ("tradition counted…"). British spelling, spaced em dashes, curly apostrophes. No sentence may assert a position, count or relation the data does not always support. [codebase, spec, judgement]
- The Gochar method text may name Mantreswara's *Phaladeepika* as a summary of the classical table; the Chinese year and annual pillar name no source text. [spec]
- Guard globals with bare `typeof X !== 'undefined'`, never `window.X`. [codebase]
- Keyboard operable, reduced motion respected, verified at 390px and 1400px. [program]
- No new dependencies. [Glenn] Cache keys bumped on every changed file on every page that loads it. [codebase] Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. [session attribution instruction]

---

### Task 1: The branch relations and the Chinese year module

**Files:**
- Create: `chinese-year.js`
- Create: `tests/chinese-year.test.cjs`

**Interfaces:**
- Produces: `ChineseYear.relations(birthBranch, yearBranch)` → an ordered array of keys from `['same','trine','harmony','clash','harm','punishment','selfPunishment','destruction']`; `ChineseYear.yearBranch(year)` → `(year − 1984) mod 12`; `ChineseYear.ANIMALS` (twelve `{name, hanzi, pinyin}` in branch order); `ChineseYear.COPY` (a `{title, hanzi, line}` per key, plus `none`); `ChineseYear.render({birthBranch, birthYear, year})` → HTML.

- [ ] **Step 1: Write the failing tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const CY = require('../chinese-year.js');

const all = [];
for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) all.push([a, b]);
const pairsWith = key => all.filter(([a, b]) => CY.relations(a, b).includes(key)).map(([a, b]) => `${a}-${b}`).sort();
const both = list => list.flatMap(([a, b]) => a === b ? [`${a}-${b}`] : [`${a}-${b}`, `${b}-${a}`]).sort();

test('each relation matches the traditional pair list exactly', () => {
  assert.deepEqual(pairsWith('same'), both([[0,0],[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11]]));
  assert.deepEqual(pairsWith('trine'), both([[8,0],[0,4],[4,8],[11,3],[3,7],[7,11],[2,6],[6,10],[10,2],[5,9],[9,1],[1,5]]));
  assert.deepEqual(pairsWith('harmony'), both([[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]]));
  assert.deepEqual(pairsWith('clash'), both([[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]]));
  assert.deepEqual(pairsWith('harm'), both([[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]]));
  assert.deepEqual(pairsWith('punishment'), both([[2,5],[5,8],[2,8],[1,10],[10,7],[1,7],[0,3]]));
  assert.deepEqual(pairsWith('selfPunishment'), both([[4,4],[6,6],[9,9],[11,11]]));
  assert.deepEqual(pairsWith('destruction'), both([[0,9],[3,6],[5,8],[2,11],[1,4],[7,10]]));
});

test('pairs that carry two relations list both, in the fixed order', () => {
  assert.deepEqual(CY.relations(2, 11), ['harmony', 'destruction']);   // 寅亥
  assert.deepEqual(CY.relations(2, 5), ['harm', 'punishment']);        // 寅巳
  assert.deepEqual(CY.relations(5, 8), ['harmony', 'punishment', 'destruction']); // 巳申
  assert.deepEqual(CY.relations(4, 4), ['same', 'selfPunishment']);    // 辰辰
  assert.deepEqual(CY.relations(0, 0), ['same']);                      // 子子
  assert.deepEqual(CY.relations(0, 2), []);                            // 子寅
});

test('years map to branches from 1984, 甲子, in both directions', () => {
  assert.equal(CY.yearBranch(1984), 0);
  assert.equal(CY.yearBranch(2026), 6);   // 午, Horse
  assert.equal(CY.yearBranch(1901), 1);   // 丑, Ox
  assert.equal(CY.ANIMALS[6].name, 'Horse');
  assert.equal(CY.ANIMALS[1].hanzi, '丑');
  assert.throws(() => CY.relations(12, 0), RangeError);
});

const PREDICTIVE = /\bluck|\blucky|unlucky|fortune|you will|will happen|is going to|destined|doomed|guarantee|misfortune|bad year|good year/i;

test('every relation has copy, and the rendered section stays reflective', () => {
  for (const key of ['same','trine','harmony','clash','harm','punishment','selfPunishment','destruction','none']) {
    assert.ok(CY.COPY[key] && CY.COPY[key].title && CY.COPY[key].line, `copy for ${key}`);
    assert.doesNotMatch(`${CY.COPY[key].title} ${CY.COPY[key].line}`, PREDICTIVE, key);
  }
  for (let b = 0; b < 12; b++) for (const year of [2024, 2026, 2031]) {
    const html = CY.render({birthBranch: b, birthYear: 1990, year});
    assert.match(html, /class="chinese-year"/);
    assert.match(html, new RegExp(CY.ANIMALS[CY.yearBranch(year)].name));
    assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), PREDICTIVE);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/chinese-year.test.cjs` — expected FAIL, module not found.

- [ ] **Step 3: Implement the relations**

Create `chinese-year.js` in the repo's UMD wrapper (a top-level `const ChineseYear = (() => { … })();` plus a guarded `module.exports`), with its own small `esc`:

```js
  const mod = (v, m) => ((v % m) + m) % m;
  const ANIMALS = [['Rat','子','Zi'],['Ox','丑','Chou'],['Tiger','寅','Yin'],['Rabbit','卯','Mao'],['Dragon','辰','Chen'],['Snake','巳','Si'],
    ['Horse','午','Wu'],['Goat','未','Wei'],['Monkey','申','Shen'],['Rooster','酉','You'],['Dog','戌','Xu'],['Pig','亥','Hai']]
    .map(([name, hanzi, pinyin]) => ({name, hanzi, pinyin}));
  const ORDER = ['same', 'trine', 'harmony', 'clash', 'harm', 'punishment', 'selfPunishment', 'destruction'];
  const PUNISHMENT_GROUPS = [[2, 5, 8], [1, 7, 10], [0, 3]];
  const SELF_PUNISHMENT = [4, 6, 9, 11];
  const yearBranch = year => mod(year - 1984, 12);

  function relations(a, b) {
    if (![a, b].every(i => Number.isInteger(i) && i >= 0 && i < 12)) throw new RangeError('Branch indices run 0–11.');
    const d = mod(b - a, 12), found = new Set();
    if (a === b) found.add('same');
    if (d === 4 || d === 8) found.add('trine');
    if (mod(a + b, 12) === 1) found.add('harmony');
    if (d === 6) found.add('clash');
    if (mod(a + b, 12) === 7) found.add('harm');
    if (a !== b && PUNISHMENT_GROUPS.some(g => g.includes(a) && g.includes(b))) found.add('punishment');
    if (a === b && SELF_PUNISHMENT.includes(a)) found.add('selfPunishment');
    // Destruction pairs each yang (even) branch with the branch three places before it.
    const even = a % 2 === 0 ? a : b, odd = a % 2 === 0 ? b : a;
    if (a % 2 !== b % 2 && odd === mod(even - 3, 12)) found.add('destruction');
    return ORDER.filter(key => found.has(key));
  }
```

- [ ] **Step 4: Copy and render**

Add `COPY`: for each of the eight keys and `none`, a `{title, hanzi, line}` object. Titles: Same animal / 本命年, Trine / 三合, Six harmony / 六合, Clash / 六沖, Harm / 六害, Punishment / 刑, Self-punishment / 自刑, Destruction / 破, and for `none` something like "No named relation". Each `line` is one or two original sentences. It says how the tradition associates the relation (affinity, complement, opposition, friction, strain, a year that meets itself, disruption) and invites reflection. It is not a forecast. **Do not** use fortune, luck, good or bad year, or any verdict; the test scans for them. Keep the tradition's traditional associations modest and generic.

`render({birthBranch, birthYear, year})` returns:

```html
<section class="chinese-year" aria-labelledby="chinese-year-title">
  <p class="reading-label">The year ahead in the animal cycle</p>   <!-- or similar, non-predictive -->
  <h5 id="chinese-year-title">{Year animal} year {year} · {hanzi} and your {Birth animal}</h5>
  <div class="chinese-year-control"> a labelled <input type="number" data-chinese-year min="1901" max="2100" value="{year}"> with previous/next buttons data-chinese-year-step="-1|1" </div>
  <ul class="chinese-year-relations"> one <li> per relation with its title, hanzi and line; or the `none` copy </ul>
  <details class="insight-method"><summary>About the animal-year relations</summary> the lunar-year boundary (the year begins at Lunar New Year, as in the portrait above); that relations come from the traditional pairings of the twelve earthly branches; that a pair can carry more than one; that these are traditional associations, not predictions </details>
</section>
```

Escape every interpolated value. The heading's word order is yours, but it must name both animals correctly: the year's animal from `yearBranch(year)` and the birth animal from `birthBranch`.

- [ ] **Step 5: Run the tests and the suite, then commit**

```bash
node --test tests/chinese-year.test.cjs
node --test tests/*.test.cjs
git add chinese-year.js tests/chinese-year.test.cjs
git commit -m "feat(eastern): the Chinese year and its branch relations"
```

---

### Task 2: The Chinese year on `/eastern/`

**Files:**
- Modify: `chinese-room.js`, `eastern/index.html`, the stylesheet that styles `.chinese-portrait` (find it), `tests/pages.test.cjs`

- [ ] **Step 1:** In `chinese-room.js`, after the portrait is rendered into `#birthday-chinese`, append `ChineseYear.render({birthBranch, birthYear, year})` when the profile is not null and `typeof ChineseYear !== 'undefined'`. `birthBranch` is the portrait profile's branch index: `chineseProfile` returns `branch` as a `[hanzi, pinyin]` pair, so derive the index by matching it against `ChineseYear.ANIMALS`, or add the index to what `chineseProfile` returns. If you change `birthday-insights.js`, bump its key everywhere it loads. `birthYear` is `profile.year`, the lunar year.
- [ ] **Step 2:** The default `year` is the lunar year in effect today: `BirthdayInsights.chineseProfile(BirthLore.birthdayParts(todayYMD)).year`, where `todayYMD` is the local date `YYYY-MM-DD`. If that is null, use today's Gregorian year. Keep the chosen year in a module variable so it survives profile re-renders, and reset it only when the birthday changes. Handle `input`/`change` on `[data-chinese-year]` (clamp to 1901–2100) and clicks on `[data-chinese-year-step]` with delegated listeners on `#birthday-chinese`. Re-render only the `.chinese-year` section, and restore focus to the control that was used.
- [ ] **Step 3:** Styles: follow the portrait's existing patterns; hold at 390px and 1400px. Script: add `/chinese-year.js?v=1` before `chinese-room.js` in `eastern/index.html`; bump `chinese-room.js` and the stylesheet. Add `chinese-year.js` to `tests/pages.test.cjs` per its header rule.
- [ ] **Step 4:** Run the suite, then commit the changed files by name: `feat(eastern): the Chinese year under the portrait`. Do not attempt browser verification.

---

### Task 3: The BaZi annual pillar engine

**Files:**
- Modify: `celestial-extras-engine.js`
- Modify: `tests/bazi.test.cjs`

**Interfaces:**
- Produces: `CelestialExtrasEngine.annualPillar(chart, year)` → `{status:'ready', year, index, pillar, god, hidden:[{stemIndex, stem, god}], liChun: Date, dayMaster}` or `{status:'missing', message}`; throws RangeError for a year outside 1901–2100 or not an integer.

- [ ] **Step 1: Write the failing tests**

Append to `tests/bazi.test.cjs` (it already defines `test`, `assert`, `extras`, `natal`, `shanghai`, `chartFor`):

```js
test('annual pillars count from 1984 甲子 across the whole range', () => {
  const chart = chartFor('1990-07-15', '14:30');
  const chars = year => extras.annualPillar(chart, year).pillar.characters;
  assert.equal(chars(1984), '甲子');
  assert.equal(chars(2026), '丙午');
  assert.equal(chars(2100), '庚申');
  assert.equal(chars(1901), '辛丑');
  assert.throws(() => extras.annualPillar(chart, 1900), RangeError);
  assert.throws(() => extras.annualPillar(chart, 2026.5), RangeError);
  assert.equal(extras.annualPillar({status: 'missing'}, 2026).status, 'missing');
});

test('the annual stem’s Ten God matches a hand table for 丙, for every Day Master', () => {
  // 丙 (yang Fire) as seen from each Day Master 甲…癸, worked by hand from the five-phase cycle.
  const OF_BING = ['eatingGod','hurtingOfficer','friend','robWealth','indirectResource','directResource','sevenKillings','directOfficer','indirectWealth','directWealth'];
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    const chart = chartFor(new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10), '12:00');
    const model = extras.bazi(chart);
    const annual = extras.annualPillar(chart, 2026);
    assert.equal(annual.god, OF_BING[model.dayStemIndex], `Day Master ${model.dayStemIndex}`);
    seen.add(model.dayStemIndex);
  }
  assert.equal(seen.size, 10, 'every Day Master exercised');
});

test('the annual pillar’s hidden stems follow the branch table, each with its Ten God', () => {
  const chart = chartFor('1990-07-15', '14:30');
  const annual = extras.annualPillar(chart, 2026);   // 午: 丁, 己
  assert.deepEqual(annual.hidden.map(h => h.stem[0]), ['丁', '己']);
  const dm = extras.bazi(chart).dayStemIndex;
  annual.hidden.forEach(h => assert.equal(h.god, extras.tenGod(dm, h.stemIndex)));
});

test('the annual pillar names that year’s Li Chun instant', () => {
  const chart = chartFor('1990-07-15', '14:30');
  // Published: 04:02 on 4 February 2026, China Standard Time.
  const published = Date.UTC(2026, 1, 3, 20, 2);
  assert.ok(Math.abs(+extras.annualPillar(chart, 2026).liChun - published) < 2 * 60000);
});
```

Twenty consecutive birthdays exercise every day stem, since the stem repeats every ten days. Do not change the `OF_BING` table.

- [ ] **Step 2: Implement**

In `celestial-extras-engine.js`, after `luckPillars`:

```js
  // The annual (流年) pillar: the sexagenary year beginning at Li Chun, read against the Day Master.
  function annualPillar(chart, year) {
    const model = bazi(chart);
    if (model.status !== 'ready') return {status:'missing', message:'Add a birth date, recorded time and confirmed birthplace to read an annual pillar against your Day Master.'};
    if (!Number.isInteger(year) || year < 1901 || year > 2100) throw new RangeError('Choose a year from 1901 to 2100.');
    const index = natal.mod(year - 1984, 60), stemIndex = index % 10, branchIndex = index % 12;
    const found = astro.SearchSunLongitude(315, new Date(Date.UTC(year, 0, 1)), 60);
    if (!found) throw new Error('Solar-term search failed.');
    return {status:'ready', year, index, pillar:pillar(`${year}`, stemIndex, branchIndex), god:tenGod(model.dayStemIndex, stemIndex),
      hidden:hiddenStems[branchIndex].map(s => ({stemIndex:s, stem:stems[s], god:tenGod(model.dayStemIndex, s)})), liChun:found.date, dayMaster:model.dayMaster};
  }
```

Add `annualPillar` to the return.

- [ ] **Step 3: Run, suite, commit**

```bash
node --test tests/bazi.test.cjs
node --test tests/*.test.cjs
git add celestial-extras-engine.js tests/bazi.test.cjs
git commit -m "feat(charts): the BaZi annual pillar"
```

---

### Task 4: The annual pillar in the Four Pillars tab

**Files:**
- Modify: `celestial-extras.js`, `celestial-extras.css`, `charts/index.html`

- [ ] **Step 1:** In `renderBazi()`, after the existing pillar content and before the tab's method disclosure, add an "Annual pillar · 流年" block. It holds a labelled year control (`<input type="number" data-cx-annual-year min="1901" max="2100">` with previous and next buttons `data-cx-annual-step`), the pillar's two characters with stem and branch names, the stem's Ten God (use `CelestialExtrasEngine.gods[key]` for hanzi, pinyin and English), and the hidden stems with their Ten Gods. It also names when that year begins: "The {year} pillar begins at Li Chun, {date and time in the reader's locale, UTC noted}". Default the year to the current solar year: the Gregorian year, minus one if today is before that year's Li Chun. Keep the choice in a module variable next to `pillarIndex`.
- [ ] **Step 2:** Handle the controls in the existing delegated `click` and `change` listeners. Re-render the tab and restore focus to the control used. Reuse the existing reflective Ten God copy (`godCopy` or its equivalent near the top of `celestial-extras.js`) if it fits, and add no new claims. One sentence frames the block: the annual pillar is the year's stem and branch, read against the Day Master as a traditional association. No luck or fortune language.
- [ ] **Step 3:** Styles following the existing `.cx-bazi` / pillar patterns; hold at 390px and 1400px. Bump `celestial-extras-engine.js`, `celestial-extras.js` and `celestial-extras.css` on `charts/index.html` (the only page that loads them; confirm by grep). Run the suite and commit by file name: `feat(charts): the annual pillar in Four Pillars`. No browser verification.

---

### Task 5: The Gochar engine

**Files:**
- Modify: `jyotish-engine.js`
- Create: `tests/gochar.test.cjs`

**Interfaces:**
- Produces: `JyotishEngine.GOCHAR_SUPPORTIVE`; `JyotishEngine.houseFromMoon(signIndex, moonSign)` → 1–12; `JyotishEngine.gochar(chart, day)` → `{status:'ready', day, moonSign, moonRashi, grahas:[{name, abbreviation, signIndex, sign, western, degrees, retrograde, house, supportive}], sadeSati}` or the `sidereal` missing and error shapes; throws RangeError for a malformed day or one outside 1901–2100.

- [ ] **Step 1: Write the failing tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const J = require('../jyotish-engine.js');
const N = require('../natal-engine.js');

const sample = N.calculate({birthday: '1990-07-15', time: '14:30', location: {latitude: 40.7143, longitude: -74.006, timeZone: 'America/New_York'}});

test('the supportive table has the classical sizes for all nine grahas', () => {
  const sizes = Object.fromEntries(Object.entries(J.GOCHAR_SUPPORTIVE).map(([k, v]) => [k, v.length]));
  assert.deepEqual(sizes, {Sun: 4, Moon: 6, Mars: 3, Mercury: 6, Jupiter: 5, Venus: 9, Saturn: 3, Rahu: 3, Ketu: 3});
  assert.deepEqual(J.GOCHAR_SUPPORTIVE.Jupiter, [2, 5, 7, 9, 11]);
  assert.deepEqual(J.GOCHAR_SUPPORTIVE.Venus, [1, 2, 3, 4, 5, 8, 9, 11, 12]);
});

test('houses count whole signs from the Moon and wrap', () => {
  assert.equal(J.houseFromMoon(3, 3), 1);
  assert.equal(J.houseFromMoon(4, 3), 2);
  assert.equal(J.houseFromMoon(2, 3), 12);
  assert.equal(J.houseFromMoon(0, 11), 2);
  assert.equal(J.houseFromMoon(11, 0), 12);
});

test('a Gochar reading for a fixed day: Saturn in Meena, houses and flags consistent', () => {
  const g = J.gochar(sample, '2026-09-14');
  assert.equal(g.status, 'ready');
  assert.equal(g.grahas.length, 9);
  const saturn = g.grahas.find(x => x.name === 'Saturn');
  assert.equal(saturn.sign, 'Meena');   // sidereal Saturn is in Pisces from March 2025 to mid-2027
  const natalMoon = J.sidereal(sample).grahas.find(x => x.name === 'Moon').signIndex;
  assert.equal(g.moonSign, natalMoon);
  for (const x of g.grahas) {
    assert.equal(x.house, J.houseFromMoon(x.signIndex, natalMoon), x.name);
    assert.equal(x.supportive, J.GOCHAR_SUPPORTIVE[x.name].includes(x.house), x.name);
  }
  assert.equal(g.sadeSati, [12, 1, 2].includes(saturn.house));
});

test('Sade Sati is flagged exactly when Saturn is in the 12th, 1st or 2nd from the Moon', () => {
  // Walk a year at a time across a Saturn cycle and check the flag against the house each time.
  let flagged = 0;
  for (let y = 2000; y <= 2030; y++) {
    const g = J.gochar(sample, `${y}-06-01`);
    const house = g.grahas.find(x => x.name === 'Saturn').house;
    assert.equal(g.sadeSati, [12, 1, 2].includes(house), `${y}: house ${house}`);
    if (g.sadeSati) flagged++;
  }
  assert.ok(flagged > 0 && flagged < 31, 'the flag both appears and clears over a Saturn cycle');
});

test('gochar refuses charts that are not ready and malformed or out-of-range days', () => {
  assert.equal(J.gochar({status: 'missing'}, '2026-09-14').status, 'missing');
  assert.throws(() => J.gochar(sample, '2026-02-30'), RangeError);
  assert.throws(() => J.gochar(sample, 'soon'), RangeError);
  assert.throws(() => J.gochar(sample, '1899-01-01'), RangeError);
});
```

- [ ] **Step 2: Implement**

In `jyotish-engine.js`, before `return`:

```js
  // The classical Gochara table: houses from the natal Moon in which each graha's transit was
  // traditionally counted as supportive. Vedha (obstruction) is not applied. Conventions: docs/JYOTISH.md.
  const GOCHAR_SUPPORTIVE = {Sun:[3,6,10,11], Moon:[1,3,6,7,10,11], Mars:[3,6,11], Mercury:[2,4,6,8,10,11], Jupiter:[2,5,7,9,11],
    Venus:[1,2,3,4,5,8,9,11,12], Saturn:[3,6,11], Rahu:[3,6,11], Ketu:[3,6,11]};
  const houseFromMoon = (signIndex, moonSign) => natal.mod(signIndex - moonSign, 12) + 1;
  function gochar(chart, day) {
    const birth = sidereal(chart);
    if (birth.status !== 'ready') return birth;
    const instant = new Date(`${day}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !Number.isFinite(+instant) || instant.toISOString().slice(0, 10) !== day) throw new RangeError('Choose a valid calendar date.');
    if (instant.getUTCFullYear() < 1901 || instant.getUTCFullYear() > 2100) throw new RangeError('Choose a date from 1901 to 2100.');
    const transit = natal.chartAtInstant(instant, chart.location, {houseSystem: 'whole-sign'});
    if (transit.status !== 'ready') return {status: 'error', message: transit.message};
    const moonSign = birth.grahas.find(g => g.name === 'Moon').signIndex;
    const grahas = sidereal(transit).grahas.map(g => {
      const house = houseFromMoon(g.signIndex, moonSign);
      return {name: g.name, abbreviation: g.abbreviation, signIndex: g.signIndex, sign: g.sign, western: g.western, degrees: g.degrees, retrograde: g.retrograde, house, supportive: GOCHAR_SUPPORTIVE[g.name].includes(house)};
    });
    const saturn = grahas.find(g => g.name === 'Saturn');
    return {status: 'ready', day, moonSign, moonRashi: rashis[moonSign][0], grahas, sadeSati: [12, 1, 2].includes(saturn.house)};
  }
```

Add `GOCHAR_SUPPORTIVE, houseFromMoon, gochar` to the return.

- [ ] **Step 3: Run, suite, commit**

```bash
node --test tests/gochar.test.cjs
node --test tests/*.test.cjs
git add jyotish-engine.js tests/gochar.test.cjs
git commit -m "feat(eastern): the Gochar engine"
```

---

### Task 6: The Gochar tab

**Files:**
- Modify: `jyotish-text.js`, `jyotish.js`, `jyotish.css`, `eastern/index.html`, `tests/jyotish-text.test.cjs`

- [ ] **Step 1: Copy**

In `jyotish-text.js`, add and export `gochar`: `{intro, supportive, demanding, sadeSati, method}`.
- `intro` says what Gochar is: the day's grahas counted in signs from the natal Moon.
- `supportive` and `demanding` are the short cell framings: "Tradition counted this transit as supportive" and "Tradition counted this transit as more demanding".
- `sadeSati` is one or two past-tense or third-person sentences. It says tradition calls Saturn's passage through the 12th, 1st and 2nd signs from the Moon Sade Sati, a span of about seven and a half years associated with steady effort, and makes no prediction.
- `method` covers: positions at 12:00 UTC; the Lahiri ayanamsa and mean nodes, as elsewhere in the section; houses counted whole-sign from the natal Moon's rashi; the supportive table, given in full; that the table is the classical Gochara scheme as summarised in Mantreswara's *Phaladeepika*; that Vedha is not applied; and that the tab describes traditional associations, not predictions.

Add a test to `tests/jyotish-text.test.cjs` that every `gochar` string exists and passes the file's existing forbidden-phrase check (reuse its regex).

- [ ] **Step 2: The tab**

In `jyotish.js`:
- Add a fifth tab button, `data-jy-tab="gochar"` / `aria-controls="jy-gochar"`, labelled Gochar with the small caption "Transits from the Moon". Add a `<section id="jy-gochar" class="jy-view" aria-live="polite" hidden>`.
- Add a date control mirroring `celestial-extras.js`'s transit controls: previous day, a date input, next day and Today (`data-jy-day="-1|1"`, `#jy-gochar-date`, `data-jy-today`), within 1901–2100. Keep the chosen day in a module variable.
- `renderGochar()` shows the natal Moon's rashi, a line noting positions are for 12:00 UTC, the Sade Sati note when `sadeSati` is true, and a `.cx-table-wrap` table: Graha, Rashi (with Western sign), Degrees, From the Moon (ordinal house), Tradition (the supportive or demanding framing). It shows the `method` text in the section's existing conventions disclosure pattern.
- Wire `renderActive()`, the delegated click and change listeners, the sample toggle and `setBirthChart`, following the existing tabs exactly. Catch a RangeError from `gochar` and show it in a `cx-error` paragraph.

- [ ] **Step 3:** Styles in `jyotish.css`, following the existing tab patterns: five tabs must fit at 390px, since the four today already fill the row, so check the `.jy-tabs` grid and adjust the phone rule if needed. Bump `jyotish-engine.js`, `jyotish-text.js`, `jyotish.js` and `jyotish.css` on every page that loads them (grep). Run the suite and commit by file name: `feat(eastern): the Gochar tab`. No browser verification.

---

### Task 7: Documentation

**Files:** `docs/JYOTISH.md`, `docs/EXTENDED-ATLAS.md`, `docs/BIRTHDAY-INSIGHTS.md`, `docs/SITE-STRUCTURE.md`

- [ ] In `JYOTISH.md`, add Gochar to Included, write its conventions, and remove "transits (gochar)" from Out of scope, noting that Vedha remains out. In `EXTENDED-ATLAS.md`, add the annual pillar to the BaZi conventions and update the sentence that says annual pillars are not included. In `BIRTHDAY-INSIGHTS.md`, add the Chinese year relations and their table. In `SITE-STRUCTURE.md`, update the `/eastern/` and `/charts/` script chains to match the HTML exactly, and the page descriptions. Check every factual sentence against the code, and use the real test count from `node --test tests/*.test.cjs`. Commit: `docs: the Chinese year, the annual pillar and Gochar`.

---

## Notes for the executor

- **Stop the dev preview servers before any merge.** A running static server on `V:` makes `git merge --squash` fail.
- **Never `git add -A`.** In PowerShell, pass commit messages with `git commit -F <file>`.
- **Commands on `V:` can exceed two minutes.** A timeout is not a failure; check the result.
- The suite before this plan starts is 500 passing.
