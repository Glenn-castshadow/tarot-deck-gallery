# Chinese Traditions Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen the Four Pillars (BaZi) tab with hidden stems, Ten Gods, a hidden-stem phase count and luck pillars, and add the I Ching as the fifth practice of the Cards & divination room, saveable to the account journal.

**Architecture:** Part A extends the pure `celestial-extras-engine.js` (UMD, Node-testable, Astronomy Engine for the Jie boundaries) and the `celestial-extras.js` UI, validated against new lunar_python fixtures. Part B adds data, engine, SVG art and UI to the existing divination modules, plus one Django reading kind. No new runtime dependency.

**Tech Stack:** Vanilla ES2020 browser JS; `node --test` (Node 24; run as `node --test tests/*.test.cjs` from Git Bash); Astronomy Engine 2.1.19 (vendored, `astro.SearchSunLongitude`); Python 3.11 + lunar_python in a throwaway venv for fixtures only; Django 5.2 service under `server/ishtar` (`py -3 manage.py test` from that directory using its `.venv`).

**Spec:** `docs/superpowers/specs/2026-09-11-chinese-traditions-design.md`

## Global Constraints

- Voice: symbolic reflection, "traditionally associated with"; no strength, fortune, luck or compatibility scores; no "you will". (Codebase voice.)
- Original interpretive copy; sources cited for tables and methods only. (Codebase convention.)
- Existing BaZi conventions are unchanged: Li Chun year, Jie months every 30° from 315°, day rolls at 23:00, civil-clock double hours; the 12 existing Four Pillars fixture tests must keep passing. (Codebase.)
- Nothing new persisted client-side; luck-pillar counting choice and casts live in page memory only. (Codebase convention.)
- Cache keys to bump in `index.html` when the file changes: `celestial-extras-engine.js?v=2`, `celestial-extras.js?v=3`, `celestial-extras.css?v=2`, `divination-data.js?v=2`, `divination-engine.js?v=iching-1`, `divination-art.js?v=iching-1`, `divination.js?v=iching-1`, `divination.css?v=iching-1`, `account.js?v=iching-1`, `mobile-sections.js?v=iching-1`. (Codebase convention.)
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (verbatim, no other model name).
- Baseline on this branch: 140 node tests passing; Django suite green (`cd server/ishtar && .venv/Scripts/python manage.py test`).
- Hanzi in source files: the repo already holds them (`celestial-extras-engine.js`); keep files UTF-8 without BOM. When printing hanzi from Python on this Windows machine set `PYTHONIOENCODING=utf-8`.

---

## File map

| File | Responsibility | Change |
|---|---|---|
| `celestial-extras-engine.js` | BaZi arithmetic: hidden stems, Ten Gods, hidden phase count, Jie boundary, luck pillars | Modify (`bazi()` at ~line 51; new functions before the return at line 69; export list) |
| `tools/build_bazi_fixtures.py` | lunar_python reference data | Create |
| `tests/fixtures/bazi-reference.json` | Generated reference | Create |
| `tests/bazi.test.cjs` | Node tests for Part A | Create |
| `celestial-extras.js` | Four Pillars UI: stems list, gods aside, phase toggle, luck pillars block | Modify (`renderBazi` at ~line 81; state at line 48; click handler ~line 109) |
| `celestial-extras.css` | Layout for the new blocks | Modify (append; phone rules in the 600px block) |
| `divination-data.js` | `hexagrams`, `trigrams`, `linePositions` | Modify (new parse + data before the return at line 112) |
| `divination-engine.js` | `castLine`, `castHexagram`, `readLines`, `loadLines`, `hexagramIndex` | Modify (before the return at line 45) |
| `divination-art.js` | `hexagram(values)` and `hexagramFromSymbol(symbol)` SVG | Modify (before `return {emblem}` at line 50) |
| `divination.js` | fifth mode, controls, output, library, save/load | Modify (modes at line 25–30; `render` ~47; `output` ~62; handlers ~121–150; `currentDraw`/`loadDraw` ~86–108) |
| `divination.css` | hexagram figure, manual-line buttons, relating layout | Modify (append) |
| `account.js:12` | journal label | Modify |
| `mobile-sections.js:136` | subtitle | Modify |
| `server/ishtar/readings/models.py`, `migrations/0002_…py`, `tests/test_readings.py` | new kind | Modify / Create |
| `tests/divination.test.cjs` | Node tests for Part B | Modify (append) |
| `docs/EXTENDED-ATLAS.md`, `docs/DIVINATION.md`, `docs/deployment.md`, `index.html` | docs and keys | Modify |

Existing engine facts: `stems[i]` is `[hanzi, pinyin, phase, polarity]` with polarity `'Yang'`/`'Yin'`; `branches[i]` is `[hanzi, pinyin, animal, phase]`; `pillar(label, stemIndex, branchIndex)` returns `{label, stemIndex, branchIndex, stem, branch, characters}`; `natal.mod(a, b=360)` is available; `astro` is the Astronomy Engine module (`require('./vendor/astronomy-engine/astronomy.js')` in Node, global `Astronomy` in the browser; check the top of the file for the exact binding). `chart.date` is the resolved birth instant (ISO string) and `chart.status === 'ready'` when time and place are known.

---

### Task 1: Engine — hidden stems, Ten Gods, hidden phase count

**Files:**
- Modify: `celestial-extras-engine.js`
- Create: `tests/bazi.test.cjs`

**Interfaces:**
- Produces: `hiddenStems` (array of 12 arrays of stem indices), `tenGod(dayStem, stem)` → god key, `gods` table, and on `bazi(chart)`: `hidden`, `gods:{stems,hidden}`, `phasesHidden`, `hiddenTotal`, `yangYear`, `dayStemIndex`.

- [ ] **Step 1: Write the failing tests**

Create `tests/bazi.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const extras = require('../celestial-extras-engine.js');
const natal = require('../natal-engine.js');

const shanghai = {latitude:31.23, longitude:121.47, timeZone:'Asia/Shanghai'};
const chartFor = (birthday, time) => natal.calculate({birthday, time, location: shanghai});

test('hidden stems follow the traditional table for all twelve branches',()=>{
  // Branch order 子丑寅卯辰巳午未申酉戌亥; stems 甲0 乙1 丙2 丁3 戊4 己5 庚6 辛7 壬8 癸9.
  assert.deepEqual(extras.hiddenStems,[[9],[5,9,7],[0,2,4],[1],[4,1,9],[2,6,4],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0]]);
});

test('ten gods are derived from phase relation and polarity for every stem pair',()=>{
  const phase=i=>['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'][i];
  const order=['Wood','Fire','Earth','Metal','Water'];
  const table=[['friend','robWealth'],['eatingGod','hurtingOfficer'],['indirectWealth','directWealth'],['sevenKillings','directOfficer'],['indirectResource','directResource']];
  for(let dm=0;dm<10;dm++) for(let s=0;s<10;s++) {
    const relation=((order.indexOf(phase(s))-order.indexOf(phase(dm)))%5+5)%5;
    assert.equal(extras.tenGod(dm,s),table[relation][dm%2===s%2?0:1],`day master ${dm}, stem ${s}`);
  }
  // Spot checks by hand: Day Master 甲 (0): 甲 friend, 乙 rob wealth, 丙 eating god, 丁 hurting officer, 戊 indirect wealth, 己 direct wealth, 庚 seven killings, 辛 direct officer, 壬 indirect resource, 癸 direct resource.
  assert.deepEqual([0,1,2,3,4,5,6,7,8,9].map(s=>extras.tenGod(0,s)),['friend','robWealth','eatingGod','hurtingOfficer','indirectWealth','directWealth','sevenKillings','directOfficer','indirectResource','directResource']);
  assert.equal(extras.tenGod(9,0),'hurtingOfficer','癸 water produces 甲 wood; opposite polarity');
  assert.throws(()=>extras.tenGod(10,0),RangeError);
  assert.throws(()=>extras.tenGod(0,-1),RangeError);
  assert.equal(Object.keys(extras.gods).length,10);
  assert.equal(extras.gods.sevenKillings.hanzi,'七殺');
});

test('bazi reports hidden stems, gods and a hidden-stem phase count',()=>{
  // Fixture 1902-02-03 12:00 Shanghai: pillars 辛丑 辛丑 丁巳 丙午 (from tests/fixtures/atlas-reference.json).
  const model=extras.bazi(chartFor('1902-02-03','12:00'));
  assert.equal(model.status,'ready');
  assert.equal(model.dayStemIndex,3,'丁');
  assert.deepEqual(model.hidden,[[5,9,7],[5,9,7],[2,6,4],[3,5]]);
  // Day Master 丁 (3, Fire, yin). 辛 (7, Metal, yin): Fire controls Metal, opposite polarity? 3 odd, 7 odd → same polarity → indirectWealth.
  assert.deepEqual(model.gods.stems,['indirectWealth','indirectWealth',null,'robWealth']);
  // Hidden 己(5 Earth yin): Fire produces Earth, same polarity → eatingGod. 癸(9 Water yin): controls Fire, same polarity → sevenKillings. 辛 → indirectWealth.
  assert.deepEqual(model.gods.hidden[0],['eatingGod','sevenKillings','indirectWealth']);
  assert.deepEqual(model.gods.hidden[2],['robWealth','directWealth','hurtingOfficer'],'丙 rob wealth, 庚 direct wealth, 戊 hurting officer');
  assert.equal(model.hiddenTotal,4+3+3+3+2);
  assert.equal(Object.values(model.phasesHidden).reduce((a,b)=>a+b),model.hiddenTotal);
  assert.deepEqual(model.phasesHidden,{Wood:0,Fire:4,Earth:4,Metal:5,Water:2});
  assert.equal(model.yangYear,false,'辛 is yin');
  // Existing fields unchanged.
  assert.deepEqual(model.pillars.map(p=>p.characters),['辛丑','辛丑','丁巳','丙午']);
  assert.equal(Object.values(model.phases).reduce((a,b)=>a+b),8);
});
```

Hand-check of `phasesHidden` for the fixture: visible stems 辛 辛 丁 丙 → Metal 2, Fire 2. Hidden: 丑→己癸辛 (Earth, Water, Metal) twice → Earth 2, Water 2, Metal 2; 巳→丙庚戊 (Fire, Metal, Earth) → Fire 1, Metal 1, Earth 1; 午→丁己 (Fire, Earth) → Fire 1, Earth 1. Totals: Fire 4, Earth 4, Metal 5, Water 2, Wood 0 = 15 ✓.

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `node --test tests/bazi.test.cjs`
Expected: 3 failing (`extras.hiddenStems` undefined, `extras.tenGod` not a function, `model.hidden` undefined).

- [ ] **Step 3: Implement**

In `celestial-extras-engine.js`, after the `branches` table add:

```js
  // Hidden stems per branch (principal, middle, residual). Traditional table; see docs/EXTENDED-ATLAS.md.
  const hiddenStems=[[9],[5,9,7],[0,2,4],[1],[4,1,9],[2,6,4],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0]];
  const phaseOrder=['Wood','Fire','Earth','Metal','Water'];
  const gods={
    friend:{hanzi:'比肩',pinyin:'Bǐ Jiān',english:'Friend'},robWealth:{hanzi:'劫財',pinyin:'Jié Cái',english:'Rob Wealth'},
    eatingGod:{hanzi:'食神',pinyin:'Shí Shén',english:'Eating God'},hurtingOfficer:{hanzi:'傷官',pinyin:'Shāng Guān',english:'Hurting Officer'},
    indirectWealth:{hanzi:'偏財',pinyin:'Piān Cái',english:'Indirect Wealth'},directWealth:{hanzi:'正財',pinyin:'Zhèng Cái',english:'Direct Wealth'},
    sevenKillings:{hanzi:'七殺',pinyin:'Qī Shā',english:'Seven Killings'},directOfficer:{hanzi:'正官',pinyin:'Zhèng Guān',english:'Direct Officer'},
    indirectResource:{hanzi:'偏印',pinyin:'Piān Yìn',english:'Indirect Resource'},directResource:{hanzi:'正印',pinyin:'Zhèng Yìn',english:'Direct Resource'}
  };
  const godTable=[['friend','robWealth'],['eatingGod','hurtingOfficer'],['indirectWealth','directWealth'],['sevenKillings','directOfficer'],['indirectResource','directResource']];
  function tenGod(dayStem, stem) {
    if(![dayStem,stem].every(i=>Number.isInteger(i)&&i>=0&&i<10)) throw new RangeError('Stem indices run 0–9.');
    const relation=natal.mod(phaseOrder.indexOf(stems[stem][2])-phaseOrder.indexOf(stems[dayStem][2]),5);
    return godTable[relation][dayStem%2===stem%2?0:1];
  }
```

In `bazi()`, after `const phases=…; pillars.forEach(…)`, add:

```js
    const dayStemIndex=dayIndex%10;
    const hidden=pillars.map(p=>hiddenStems[p.branchIndex]);
    const godsFound={stems:pillars.map((p,i)=>i===2?null:tenGod(dayStemIndex,p.stemIndex)),hidden:hidden.map(list=>list.map(s=>tenGod(dayStemIndex,s)))};
    const phasesHidden={Wood:0,Fire:0,Earth:0,Metal:0,Water:0};
    pillars.forEach(p=>{phasesHidden[p.stem[2]]++;});
    hidden.flat().forEach(s=>{phasesHidden[stems[s][2]]++;});
```

and extend the returned object with `dayStemIndex, hidden, gods:godsFound, phasesHidden, hiddenTotal:4+hidden.flat().length, yangYear:(yearIndex%10)%2===0`.

Add `hiddenStems, tenGod, gods` to the export object.

- [ ] **Step 4: Run all tests**

Run: `node --test tests/*.test.cjs`
Expected: 143 passing (140 + 3).

- [ ] **Step 5: Commit**

```bash
git add celestial-extras-engine.js tests/bazi.test.cjs
git commit -m "feat(bazi): hidden stems, ten gods and hidden-stem phase count

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Independent fixtures from lunar_python

**Files:**
- Create: `tools/build_bazi_fixtures.py`
- Create: `tests/fixtures/bazi-reference.json`
- Modify: `tests/bazi.test.cjs` (append fixture-driven tests for hidden stems and gods)

**Interfaces:**
- Produces: `bazi-reference.json` `{sources:{lunar_python, convention}, cases:[{birthday, time, location, pillars:[4 strings], hidden:[[hanzi…]×4], godsStems:[hanzi|null ×4], godsHidden:[[hanzi…]×4], yun:{male:{forward:bool, startYears, startMonths, startDays, pillars:[5 ganzhi]}, female:{…}}}]}`. Task 3 consumes `yun`.

- [ ] **Step 1: Create a throwaway venv and install lunar_python**

From Git Bash in the repo root:

```bash
py -3 -m venv "$LOCALAPPDATA/Temp/bazi-venv" && "$LOCALAPPDATA/Temp/bazi-venv/Scripts/python" -m pip install --quiet lunar_python && "$LOCALAPPDATA/Temp/bazi-venv/Scripts/python" -c "import lunar_python;print(lunar_python.__file__)"
```

The venv is outside the repo; nothing from it is committed.

- [ ] **Step 2: Write the fixture tool**

Create `tools/build_bazi_fixtures.py`:

```python
"""Independent BaZi reference data from lunar_python (development only, never shipped).

Usage (Git Bash):  py -3 -m venv "$LOCALAPPDATA/Temp/bazi-venv"
                   "$LOCALAPPDATA/Temp/bazi-venv/Scripts/python" -m pip install lunar_python
                   PYTHONIOENCODING=utf-8 "$LOCALAPPDATA/Temp/bazi-venv/Scripts/python" tools/build_bazi_fixtures.py
Conventions: Asia/Shanghai civil time, sect 1 (day rolls at 23:00), the same as tools/build_atlas_fixtures.py.
"""
import json
from importlib.metadata import version
from pathlib import Path
from lunar_python import Solar

# The twelve births already used by tests/fixtures/atlas-reference.json, plus four for luck-pillar coverage:
# one within an hour before a Jie (2024-03-05 10:00, Jingzhe at ~10:22 CST), one just after a Jie,
# a yang-year female (backward), a yin-year male (backward).
BIRTHS = [(1902, 2, 3, 12, 0), (1950, 6, 20, 18, 30), (1990, 7, 15, 14, 30), (2000, 1, 7, 12, 0),
          (2024, 2, 4, 14, 0), (2024, 2, 4, 18, 0), (2024, 3, 5, 8, 0), (2024, 3, 5, 14, 0),
          (2024, 2, 10, 22, 59), (2024, 2, 10, 23, 0), (2024, 2, 11, 0, 0), (2099, 12, 21, 23, 45),
          (2024, 3, 5, 10, 0), (2024, 3, 5, 10, 45), (1988, 8, 8, 8, 8), (1975, 11, 30, 6, 15)]

STEM_ORDER = '甲乙丙丁戊己庚辛壬癸'
# lunar_python uses simplified characters for some gods; the site uses traditional. Map both to the site's keys.
GOD_KEYS = {'比肩': 'friend', '劫财': 'robWealth', '劫財': 'robWealth', '食神': 'eatingGod', '伤官': 'hurtingOfficer', '傷官': 'hurtingOfficer',
            '偏财': 'indirectWealth', '偏財': 'indirectWealth', '正财': 'directWealth', '正財': 'directWealth', '七杀': 'sevenKillings', '七殺': 'sevenKillings',
            '正官': 'directOfficer', '偏印': 'indirectResource', '正印': 'directResource'}


def yun_for(chart, gender):
    yun = chart.getYun(gender, 1)
    da_yun = yun.getDaYun()
    return {'forward': bool(yun.isForward()), 'startYears': yun.getStartYear(), 'startMonths': yun.getStartMonth(), 'startDays': yun.getStartDay(),
            'pillars': [d.getGanZhi() for d in da_yun[1:6]], 'startAges': [d.getStartAge() for d in da_yun[1:6]]}


cases = []
for y, m, d, h, minute in BIRTHS:
    chart = Solar.fromYmdHms(y, m, d, h, minute, 0).getLunar().getEightChar()
    chart.setSect(1)
    cases.append({
        'birthday': f'{y:04}-{m:02}-{d:02}', 'time': f'{h:02}:{minute:02}',
        'location': {'latitude': 31.23, 'longitude': 121.47, 'timeZone': 'Asia/Shanghai'},
        'pillars': [chart.getYear(), chart.getMonth(), chart.getDay(), chart.getTime()],
        'hidden': [chart.getYearHideGan(), chart.getMonthHideGan(), chart.getDayHideGan(), chart.getTimeHideGan()],
        'godsStems': [GOD_KEYS[chart.getYearShiShenGan()], GOD_KEYS[chart.getMonthShiShenGan()], None, GOD_KEYS[chart.getTimeShiShenGan()]],
        'godsHidden': [[GOD_KEYS[g] for g in chart.getYearShiShenZhi()], [GOD_KEYS[g] for g in chart.getMonthShiShenZhi()],
                       [GOD_KEYS[g] for g in chart.getDayShiShenZhi()], [GOD_KEYS[g] for g in chart.getTimeShiShenZhi()]],
        'yun': {'male': yun_for(chart, 1), 'female': yun_for(chart, 0)},
    })

target = Path(__file__).resolve().parents[1] / 'tests/fixtures/bazi-reference.json'
target.write_text(json.dumps({'sources': {'lunar_python': version('lunar_python'), 'convention': 'Asia/Shanghai civil time; sect 1 (day rolls 23:00); luck pillars getYun(gender, 1)'},
                              'cases': cases}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(cases)} BaZi reference cases.')
```

If a lunar_python method name differs in the installed version (they have changed between releases), inspect `dir(chart)` and `dir(yun)` in the venv and adapt; record the actual names in the docstring. `getDaYun()[0]` is the pre-luck period in lunar_python, so pillars start at index 1. If `getDayShiShenGan` exists for the day stem it should read 日主; we deliberately record `None` for the day position.

- [ ] **Step 3: Generate the fixture and eyeball it**

Run: `PYTHONIOENCODING=utf-8 "$LOCALAPPDATA/Temp/bazi-venv/Scripts/python" tools/build_bazi_fixtures.py`
Then: `PYTHONIOENCODING=utf-8 py -3 -c "import json;d=json.load(open('tests/fixtures/bazi-reference.json',encoding='utf-8'));c=d['cases'][0];print(c['pillars'],c['hidden'],c['godsStems'],c['yun']['male'])"`
Expected for 1902-02-03 12:00: pillars 辛丑 辛丑 丁巳 丙午; hidden [['己','癸','辛'],['己','癸','辛'],['丙','庚','戊'],['丁','己']]; godsStems ['indirectWealth','indirectWealth',None,'robWealth'] (these must agree with Task 1's hand derivation; if lunar_python disagrees, stop and report — do not adjust the engine to match without the controller's ruling).

- [ ] **Step 4: Append fixture tests**

Append to `tests/bazi.test.cjs`:

```js
const reference = require('./fixtures/bazi-reference.json');
const stemIndex = hanzi => '甲乙丙丁戊己庚辛壬癸'.indexOf(hanzi);

for (const c of reference.cases) test(`lunar_python reference: hidden stems and ten gods for ${c.birthday} ${c.time}`,()=>{
  const model=extras.bazi(chartFor(c.birthday,c.time));
  assert.equal(model.status,'ready');
  assert.deepEqual(model.pillars.map(p=>p.characters),c.pillars);
  assert.deepEqual(model.hidden,c.hidden.map(list=>list.map(stemIndex)));
  assert.deepEqual(model.gods.stems,c.godsStems);
  assert.deepEqual(model.gods.hidden,c.godsHidden);
});
```

- [ ] **Step 5: Run**

Run: `node --test tests/*.test.cjs`
Expected: 159 passing (143 + 16). If the 2024-03-05 10:00 or 10:45 cases fail on the month pillar only, the birth sits within minutes of Jingzhe and the two ephemerides disagree on the boundary side; move that birth 30 minutes further from the boundary in `BIRTHS`, regenerate, and note it in the report.

- [ ] **Step 6: Commit**

```bash
git add tools/build_bazi_fixtures.py tests/fixtures/bazi-reference.json tests/bazi.test.cjs
git commit -m "test(bazi): lunar_python reference fixtures for hidden stems and ten gods

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Engine — Jie boundary and luck pillars

**Files:**
- Modify: `celestial-extras-engine.js`
- Modify: `tests/bazi.test.cjs` (append)

**Interfaces:**
- Consumes: `bazi(chart)` from Task 1 (`yangYear`, `pillars[1]`, `dayStemIndex`), `astro.SearchSunLongitude(targetLon, dateStart, limitDays)` → `AstroTime|null` with `.date`.
- Produces: `jieBoundary(date, direction)` → `{longitude, date}`; `luckPillars(chart, sex)` → `{status:'ready', direction, startAge:{years,months}, startDays, boundary, pillars:[{index 1..10, stemIndex, branchIndex, characters, stem, branch, fromAge, fromYear, god}]}` or `{status:'missing', message}`.

- [ ] **Step 1: Write the failing tests**

```js
test('jie boundaries bracket a birth instant at 30-degree solar-longitude steps',()=>{
  const chart=chartFor('2024-03-05','08:00');
  const next=extras.jieBoundary(new Date(chart.date),'forward'), prev=extras.jieBoundary(new Date(chart.date),'backward');
  assert.equal(next.longitude,345,'Jingzhe: Sun at 345°');
  assert.equal(prev.longitude,315,'Li Chun');
  assert.ok(prev.date<new Date(chart.date)&&new Date(chart.date)<next.date);
  assert.ok(Math.abs(next.date-new Date('2024-03-05T02:22:00Z'))<15*60*1000,'Jingzhe 2024 is 10:22 CST, within 15 minutes');
  assert.throws(()=>extras.jieBoundary(new Date('nope'),'forward'));
});

for (const c of reference.cases) for (const sex of ['male','female']) test(`lunar_python reference: luck pillars for ${c.birthday} ${c.time} (${sex})`,()=>{
  const model=extras.luckPillars(chartFor(c.birthday,c.time),sex), ref=c.yun[sex];
  assert.equal(model.status,'ready');
  assert.equal(model.direction,ref.forward?'forward':'backward');
  assert.deepEqual(model.pillars.slice(0,5).map(p=>p.characters),ref.pillars);
  // Start age: lunar_python floors years, months and days from the same 3-days-per-year rule. The two ephemerides
  // place the Jie instant minutes apart, so allow one month of difference in the total.
  const ours=model.startAge.years*12+model.startAge.months, theirs=ref.startYears*12+ref.startMonths;
  assert.ok(Math.abs(ours-theirs)<=1,`start ${ours} vs ${theirs} months`);
  assert.equal(model.pillars[0].fromAge,model.startAge.years);
  assert.equal(model.pillars[4].fromAge,model.startAge.years+40);
  assert.equal(model.pillars[0].fromYear,Number(c.birthday.slice(0,4))+model.startAge.years);
  assert.equal(model.pillars.length,10);
});

test('luck pillars need a ready chart and a counting choice',()=>{
  assert.equal(extras.luckPillars(null,'male').status,'missing');
  assert.throws(()=>extras.luckPillars(chartFor('1990-07-15','14:30'),'other'),RangeError);
  const m=extras.luckPillars(chartFor('1990-07-15','14:30'),'male'), f=extras.luckPillars(chartFor('1990-07-15','14:30'),'female');
  assert.notEqual(m.direction,f.direction,'the two sexes count in opposite directions for the same chart');
  assert.ok(m.pillars.every(p=>typeof p.god==='string'));
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `node --test tests/bazi.test.cjs`
Expected: the new tests fail with `extras.jieBoundary is not a function`.

- [ ] **Step 3: Implement**

Add before the export (after `bazi`):

```js
  // Jie boundaries: the twelve solar-term instants every 30° from 315° (Li Chun). Astronomy Engine's
  // SearchSunLongitude finds the instant the apparent solar longitude reaches the target after a start date.
  function jieBoundary(date, direction) {
    if(!(date instanceof Date)||!Number.isFinite(+date)) throw new RangeError('Choose a valid instant.');
    const lon=astro.Ecliptic(astro.GeoVector('Sun',date,true)).elon;
    const past=natal.mod(lon-315,30);
    const target=direction==='forward'?natal.mod(lon-past+30):natal.mod(lon-past);
    const start=direction==='forward'?date:new Date(date.getTime()-40*86400000);
    const found=astro.SearchSunLongitude(target,start,45);
    if(!found) throw new Error('Solar-term search failed.');
    return {longitude:Math.round(target),date:found.date};
  }
  function luckPillars(chart, sex) {
    const model=bazi(chart);
    if(model.status!=='ready') return {status:'missing',message:'Add a birth date, recorded time and confirmed birthplace to count luck pillars.'};
    if(sex!=='male'&&sex!=='female') throw new RangeError('Choose male or female counting.');
    const forward=model.yangYear===(sex==='male');
    const birth=new Date(chart.date);
    const boundary=jieBoundary(birth,forward?'forward':'backward');
    const startDays=Math.abs(boundary.date-birth)/86400000;
    const totalMonths=Math.floor(startDays*4);   // 3 days = 1 year, so 1 day = 4 months (lunar_python floors the same way)
    const startAge={years:Math.floor(totalMonths/12),months:totalMonths%12};
    const month=model.pillars[1];
    const cycle=Array.from({length:60},(_,n)=>n).find(n=>n%10===month.stemIndex&&n%12===month.branchIndex);
    const birthYear=Number(chart.birthday.slice(0,4));
    const pillars=Array.from({length:10},(_,i)=>{
      const n=natal.mod(cycle+(forward?i+1:-(i+1)),60), p=pillar(`Luck ${i+1}`,n%10,n%12);
      return {...p,index:i+1,fromAge:startAge.years+10*i,fromYear:birthYear+startAge.years+10*i,god:tenGod(model.dayStemIndex,n%10)};
    });
    return {status:'ready',direction:forward?'forward':'backward',startAge,startDays,boundary,pillars};
  }
```

Export `jieBoundary` and `luckPillars`. Note `natal.mod(x)` defaults to modulo 360.

- [ ] **Step 4: Run**

Run: `node --test tests/*.test.cjs`
Expected: 159 + 1 + 32 + 1 = 193 passing. If a start-age comparison is off by more than one month for a birth within an hour of a Jie, report it with both values rather than widening the tolerance.

- [ ] **Step 5: Commit**

```bash
git add celestial-extras-engine.js tests/bazi.test.cjs
git commit -m "feat(bazi): jie boundaries and ten luck pillars in either direction

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: UI — stems in the pillar, gods aside, phase-count toggle

**Files:**
- Modify: `celestial-extras.js` (state at line 48; `renderBazi` ~line 81–87; click handler ~line 109)
- Modify: `celestial-extras.css`
- Modify: `index.html` (keys for engine, js, css)

**Interfaces:**
- Consumes: `model.hidden`, `model.gods`, `model.phasesHidden`, `model.hiddenTotal`, `CelestialExtrasEngine.gods`, `CelestialExtrasEngine.stems`.
- Produces: state `phaseView` ('visible'|'hidden'), `openGod` (god key or '') ; buttons `[data-cx-phase-view]`, `[data-cx-god]`.

- [ ] **Step 1: Add god copy**

After `phaseText` in `celestial-extras.js` add an original `godText` table keyed by the ten god keys, each `{theme, story, prompt}`: `theme` is a three-to-five-word phrase, `story` two sentences (120–240 characters) describing what the relationship is traditionally associated with in the site's voice (no wealth, career, health or relationship verdicts; no "you will"; no luck/fortune), `prompt` a question. Two exemplars to match:

```js
  const godText = {
    friend:{theme:'Standing beside yourself',story:'Friend is a stem of the same phase and polarity as the Day Master: traditionally read as peers, siblings and the parts of life where you meet your own likeness. Reflect on where company strengthens you and where sameness crowds you.',prompt:'Who in my life mirrors me, and what do I learn from the resemblance?'},
    sevenKillings:{theme:'Pressure that shapes',story:'Seven Killings controls the Day Master with the same polarity: traditionally associated with demanding circumstances, discipline and the edge that tests resolve. Consider which pressures have taught you something and which simply wear you down.',prompt:'Where does pressure sharpen me rather than diminish me?'},
    // …the other eight in the same shape…
  };
```

- [ ] **Step 2: State and markup**

Extend the `let savedChart=null, …` declaration with `phaseView='visible', openGod=''`.

In `renderBazi`, build a `stemsList` for the selected pillar and insert it inside `.cx-pillar-reading` after the existing `<blockquote>`:

```js
      const stemRow=(stemIdx,god,role)=>{const s=CelestialExtrasEngine.stems[stemIdx], g=god?CelestialExtrasEngine.gods[god]:null;return `<li><span class="cx-hanzi-small" lang="zh" style="color:${colors[s[2]]}">${s[0]}</span><span>${s[1]} · ${s[3]} ${s[2]}</span>${god?`<button type="button" data-cx-god="${god}" aria-pressed="${openGod===god}" aria-label="${g.english}, ${g.pinyin}: show its reflection"><span lang="zh">${g.hanzi}</span> ${g.english}</button>`:`<em>${role}</em>`}</li>`;};
      const stemsList=`<div class="cx-stems"><p class="acg-small-label">Stems in this pillar</p><ul><li class="cx-stems-head"><span>Visible stem</span></li>${stemRow(selected.stemIndex,model.gods.stems[pillarIndex],'Day Master')}<li class="cx-stems-head"><span>Hidden stems of ${selected.branch[0]} ${selected.branch[1]}</span></li>${model.hidden[pillarIndex].map((s,i)=>stemRow(s,model.gods.hidden[pillarIndex][i],'')).join('')}</ul>${openGod&&godText[openGod]?`<aside class="cx-god-aside" aria-live="polite"><p class="acg-small-label">${CelestialExtrasEngine.gods[openGod].hanzi} · ${CelestialExtrasEngine.gods[openGod].pinyin} · ${CelestialExtrasEngine.gods[openGod].english}</p><h6>${godText[openGod].theme}</h6><p>${godText[openGod].story}</p><blockquote>${godText[openGod].prompt}</blockquote></aside>`:''}</div>`;
```

Replace the phase chart block so it honours `phaseView`:

```js
      const counts=phaseView==='hidden'?model.phasesHidden:model.phases, denominator=phaseView==='hidden'?model.hiddenTotal:8;
      const phaseChart=`<div class="cx-phase-chart"><div class="cx-phase-toggle" role="group" aria-label="Phase count view"><button type="button" data-cx-phase-view="visible" aria-pressed="${phaseView==='visible'}">Visible eight</button><button type="button" data-cx-phase-view="hidden" aria-pressed="${phaseView==='hidden'}">With hidden stems</button></div><p class="acg-small-label">Five phases · ${phaseView==='hidden'?`${denominator} characters including hidden stems`:'visible characters'}</p>${Object.entries(counts).map(([name,count])=>`<div><span>${name}</span><meter min="0" max="${denominator}" value="${count}" style="--phase-color:${colors[name]}" aria-label="${name}: ${count} of ${denominator}">${count}/${denominator}</meter><strong>${count}</strong></div>`).join('')}<p>${phaseView==='hidden'?'Four visible stems plus every hidden stem of the four branches. Still a count, not a strength or balance score.':'A count of eight visible stems and principal branch phases. This is not a strength or balance score.'}</p></div>`;
```

Keep everything else in `renderBazi` as it is, substituting `stemsList` into the pillar reading and `phaseChart` for the old chart markup. Update the methods `<details>` paragraph to mention hidden stems and Ten Gods are now shown and remain symbolic.

- [ ] **Step 3: Wire clicks**

In the root click handler add, next to the `cxPillar` branch:

```js
      if('cxPhaseView' in data) {phaseView=data.cxPhaseView;renderBazi();$(`[data-cx-phase-view="${phaseView}"]`).focus({preventScroll:true});}
      if('cxGod' in data) {openGod=openGod===data.cxGod?'':data.cxGod;renderBazi();$(`[data-cx-god="${data.cxGod}"]`)?.focus({preventScroll:true});}
```

Check how the existing `cxPillar` branch is written and follow the same style (it re-renders and refocuses).

- [ ] **Step 4: CSS**

Append to `celestial-extras.css`:

```css
.cx-stems { margin-top: 18px; }.cx-stems ul { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 6px; }.cx-stems li { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #ffffff12; font-size: 12px; color: #c2cfbf; }.cx-stems li.cx-stems-head { grid-template-columns: 1fr; border: 0; padding: 10px 0 2px; font: 10px "DM Mono",monospace; letter-spacing: .14em; text-transform: uppercase; color: #a8c0bd; }.cx-hanzi-small { font: 28px/1 "Noto Serif CJK SC","SimSun",serif; }.cx-stems em { font-style: normal; color: #e1d5b7; }
.cx-stems button { padding: 6px 10px; font-size: 11px; }.cx-stems button[aria-pressed="true"] { border-color: #d8c48c; box-shadow: inset 0 -2px #d8c48c; }
.cx-god-aside { margin-top: 14px; padding: 16px 18px; background: #d8ba7514; border-left: 2px solid #d8c48c; }.cx-god-aside h6 { font: 500 19px/1.3 "Playfair Display",serif; margin: 6px 0 8px; }.cx-god-aside p:not(.acg-small-label) { font-size: 13px; line-height: 1.7; color: #bed0cc; }
.cx-phase-toggle { display: flex; gap: 6px; margin-bottom: 12px; }.cx-phase-toggle button { padding: 7px 12px; font-size: 11px; }.cx-phase-toggle button[aria-pressed="true"] { border-color: #d8c48c; box-shadow: inset 0 -2px #d8c48c; }
```

Buttons inside `.celestial-extras` already have base styling scoped to the section (`.celestial-extras button`), so only the additions above are needed. In the 600px block, add `.cx-stems li { grid-template-columns: 36px 1fr; }.cx-stems li > button { grid-column: 1 / -1; justify-self: start; }`.

- [ ] **Step 5: Keys, checks, browser**

Set `celestial-extras-engine.js?v=2`, `celestial-extras.js?v=3`, `celestial-extras.css?v=2` in `index.html`.
Run: `node --check celestial-extras.js && node --test tests/*.test.cjs` (193 passing).
Browser: serve with `py -3 -m http.server 8765 --bind 127.0.0.1 --directory "$(pwd)"`, open `http://127.0.0.1:8765/#cx-bazi`, press "Try sample charts", open Four Pillars; confirm the stems list renders for each pillar, a god button opens its aside and pressing it again closes it, the phase toggle switches counts and denominator, and at 390px nothing overflows (`document.documentElement.scrollWidth <= innerWidth`). Pane screenshots may render blank; verify by DOM and say so. Stop the server (PowerShell `Get-NetTCPConnection -LocalPort 8765` → `Stop-Process`).

- [ ] **Step 6: Commit**

```bash
git add celestial-extras.js celestial-extras.css index.html
git commit -m "feat(bazi): stems in each pillar with ten gods and a hidden-stem phase view

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: UI — luck pillars block

**Files:**
- Modify: `celestial-extras.js`, `celestial-extras.css`

**Interfaces:**
- Consumes: `CelestialExtrasEngine.luckPillars(chart, sex)`, `CelestialExtrasEngine.gods`, `today()` helper (exists at line 17), `colors`.
- Produces: state `luckSex` ('both'|'male'|'female'); select `#cx-luck-sex`; block `.cx-luck`.

- [ ] **Step 1: State and render**

Add `luckSex='both'` to the state declaration. In `renderBazi`, after the existing bottom grid and before the methods `<details>`, append a luck block:

```js
      const age=(()=>{const [y,m,d]=chart.birthday.split('-').map(Number), t=today().split('-').map(Number);let a=t[0]-y;if(t[1]<m||(t[1]===m&&t[2]<d))a--;return a;})();
      const luckRow=sex=>{const l=CelestialExtrasEngine.luckPillars(chart,sex);const label=l.direction==='forward'?'Forward · traditional counting for a male born in a yang year or a female born in a yin year':'Backward · traditional counting for a female born in a yang year or a male born in a yin year';return `<div class="cx-luck-row"><p class="cx-luck-label">${luckSex==='both'?label:`${sex==='male'?'Male':'Female'}, traditional counting · ${l.direction}`}<small>Starts at age ${l.startAge.years} years ${l.startAge.months} months · ${l.startDays.toFixed(1)} days to the ${l.direction==='forward'?'next':'previous'} solar term (${l.boundary.longitude}°, ${new Date(l.boundary.date).toISOString().slice(0,10)})</small></p><div class="cx-luck-scroll"><ol class="cx-luck-pillars">${l.pillars.map(p=>{const now=age>=p.fromAge&&age<p.fromAge+10, g=CelestialExtrasEngine.gods[p.god];return `<li class="${now?'is-now':''}" aria-label="Luck pillar ${p.index}: ${p.stem[1]} ${p.branch[1]}, from age ${p.fromAge}, ${p.fromYear}${now?', current':''}"><span class="cx-luck-age">${p.fromAge}${now?' · now':''}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.stem[2]]}">${p.stem[0]}</span><span class="cx-hanzi" lang="zh" style="color:${colors[p.branch[3]]}">${p.branch[0]}</span><span class="cx-pinyin">${p.stem[1]} ${p.branch[1]}</span><span class="cx-pinyin">${p.fromYear}–${p.fromYear+9}</span><span class="cx-luck-god" lang="zh">${g.hanzi}</span><span class="cx-pinyin">${g.english}</span></li>`;}).join('')}</ol></div></div>`;};
      const luckBlock=`<section class="cx-luck" aria-label="Luck pillars"><div class="cx-view-heading"><div><p class="acg-small-label">Luck pillars · 大運</p><h5>Ten-year chapters, counted from the month.</h5></div><label class="cx-luck-select">Count luck pillars as<select id="cx-luck-sex">${[['both','Show both directions'],['male','Male, traditional counting'],['female','Female, traditional counting']].map(([v,l])=>`<option value="${v}" ${luckSex===v?'selected':''}>${l}</option>`).join('')}</select></label></div>${luckSex==='both'?luckRow('male')+luckRow('female'):luckRow(luckSex)}<p class="cx-luck-note">Tradition keys the direction to the sex recorded at birth; the site stores none, so this choice stays on the page. Each pillar steps the month pillar one place through the sixty-year cycle and lasts ten years; the first begins after the interval to the nearest solar-term boundary, counted at three days per year. Pillars are read as chapters for reflection, not as forecasts.</p></section>`;
```

When `luckSex==='both'`, the male row and the female row always run in opposite directions, so the two labels differ; when a single sex is chosen the label names the sex and direction. Insert `luckBlock` after the bottom grid.

- [ ] **Step 2: Wire the select**

The section has no `change` listener yet; add one next to the existing listeners:

```js
    root.addEventListener('change',event=>{ if(event.target.id==='cx-luck-sex') {luckSex=event.target.value;renderBazi();$('#cx-luck-sex').focus({preventScroll:true});} });
```

If a `change` listener already exists (check for `cx-filter` handling), add the branch to it instead.

- [ ] **Step 3: CSS**

Append:

```css
.cx-luck { margin-top: 30px; padding-top: 22px; border-top: 1px solid #ffffff14; }.cx-luck .cx-view-heading { align-items: end; }.cx-luck-select { display: grid; gap: 6px; font-size: 11px; color: #b7c9c5; }.cx-luck-select select { min-height: 40px; }
.cx-luck-row { margin-top: 18px; }.cx-luck-label { font-size: 12px; color: #e1d5b7; margin: 0 0 8px; }.cx-luck-label small { display: block; margin-top: 4px; font: 10px/1.6 "DM Mono",monospace; color: #a8c0bd; }
.cx-luck-scroll { overflow-x: auto; padding-bottom: 6px; }.cx-luck-pillars { list-style: none; display: grid; grid-template-columns: repeat(10, minmax(84px,1fr)); gap: 8px; margin: 0; padding: 0; min-width: 900px; }.cx-luck-pillars li { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; border: 1px solid #ffffff18; background: linear-gradient(#1d3540,#0c242e); }.cx-luck-pillars li.is-now { border-color: #d8c48c; box-shadow: inset 0 -3px #d8c48c; }.cx-luck-pillars .cx-hanzi { font-size: 30px; }.cx-luck-age { font: 10px "DM Mono",monospace; color: #e1d5b7; }.cx-luck-god { font: 15px "Noto Serif CJK SC","SimSun",serif; color: #d8c48c; margin-top: 4px; }
.cx-luck-note { font-size: 11px; line-height: 1.7; color: #a8c0bd; margin-top: 14px; }
```

The row scrolls inside `.cx-luck-scroll` at phone widths; the page must not widen.

- [ ] **Step 4: Checks and browser**

Run: `node --check celestial-extras.js && node --test tests/*.test.cjs` (193).
Browser as in Task 4: with the sample chart, confirm two rows by default, one row after choosing Male or Female, the "now" marker on the pillar containing the sample's current age (sample A is born 1990-07-15), horizontal scrolling contained at 390px with `document.documentElement.scrollWidth <= innerWidth`.

- [ ] **Step 5: Commit**

```bash
git add celestial-extras.js celestial-extras.css
git commit -m "feat(bazi): luck pillars timeline with page-only counting choice

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Data — 64 hexagrams, 8 trigrams, 6 line positions

**Files:**
- Modify: `divination-data.js` (before `return {lenormand, runes, oracle, figures};`)
- Modify: `tests/divination.test.cjs` (append)

**Interfaces:**
- Produces: `D.hexagrams[64]` `{id, number, character, name, gloss, symbol, keyword, meaning, prompt}`; `D.trigrams[8]` `{id, name, character, image, symbol}`; `D.linePositions[6]` `{id, title, text}`; exported alongside the existing keys.

- [ ] **Step 1: Write the structural tests first**

Append to `tests/divination.test.cjs`:

```js
test('sixty-four hexagrams in King Wen order with the standard line patterns',()=>{
  assert.equal(D.hexagrams.length,64);
  assert.equal(new Set(D.hexagrams.map(h=>h.symbol)).size,64);
  assert.equal(new Set(D.hexagrams.map(h=>h.character)).size,64);
  D.hexagrams.forEach((h,i)=>{assert.equal(h.id,i);assert.equal(h.number,i+1);assert.match(h.symbol,/^[01]{6}$/);});
  const by=n=>D.hexagrams[n-1].symbol;
  assert.equal(by(1),'111111');assert.equal(by(2),'000000');assert.equal(by(11),'111000');assert.equal(by(12),'000111');
  assert.equal(by(63),'101010');assert.equal(by(64),'010101');assert.equal(by(3),'100010');assert.equal(by(29),'010010');
  // King Wen pairing: an even hexagram is the odd one before it turned upside down, or, when that is the same figure, its line-by-line opposite.
  for(let n=1;n<64;n+=2) {
    const a=by(n), reversed=[...a].reverse().join(''), complement=[...a].map(c=>c==='1'?'0':'1').join('');
    assert.equal(by(n+1),reversed===a?complement:reversed,`pair ${n}/${n+1}`);
  }
  const trigram=s=>D.trigrams.find(t=>t.symbol===s);
  assert.equal(D.trigrams.length,8);
  for(const h of D.hexagrams) {assert.ok(trigram(h.symbol.slice(0,3)),`lower trigram of ${h.number}`);assert.ok(trigram(h.symbol.slice(3)),`upper trigram of ${h.number}`);}
  assert.deepEqual(D.trigrams.map(t=>t.symbol),['111','110','101','100','011','010','001','000']);
  assert.deepEqual(D.trigrams.map(t=>t.image),['Heaven','Lake','Fire','Thunder','Wind','Water','Mountain','Earth']);
});
test('hexagram, trigram and line-position prose is original, reflective and complete',()=>{
  for(const h of D.hexagrams) {
    assert.ok(h.meaning.length>75,`meaning ${h.number}`);assert.ok(h.prompt.endsWith('?'),`prompt ${h.number}`);
    const words=h.gloss.trim().split(/\s+/).length;assert.ok(words>=3&&words<=5,`gloss ${h.number}: ${h.gloss}`);
    assert.ok(h.keyword.length>2&&h.name.length>1&&h.character.length>=1);
  }
  assert.equal(new Set(D.hexagrams.map(h=>h.gloss)).size,64,'glosses are distinct');
  assert.equal(D.linePositions.length,6);
  for(const p of D.linePositions) assert.ok(p.text.length>90&&p.title.length>3);
  const all=[...D.hexagrams.map(h=>h.meaning+h.prompt+h.gloss),...D.linePositions.map(p=>p.text)].join('\n');
  assert.doesNotMatch(all,/you will|luck|fortune|misfortune|danger|death|disaster|wealth will/i);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `node --test tests/divination.test.cjs`
Expected: the two new tests fail (`D.hexagrams` undefined).

- [ ] **Step 3: Write the data**

In `divination-data.js` add a second parser and the tables. The line table is fixed; copy it exactly (number|character|pinyin|symbol):

```
1|乾|Qián|111111  2|坤|Kūn|000000  3|屯|Zhūn|100010  4|蒙|Méng|010001  5|需|Xū|111010  6|訟|Sòng|010111  7|師|Shī|010000  8|比|Bǐ|000010
9|小畜|Xiǎo Chù|111011  10|履|Lǚ|110111  11|泰|Tài|111000  12|否|Pǐ|000111  13|同人|Tóng Rén|101111  14|大有|Dà Yǒu|111101  15|謙|Qiān|001000  16|豫|Yù|000100
17|隨|Suí|100110  18|蠱|Gǔ|011001  19|臨|Lín|110000  20|觀|Guān|000011  21|噬嗑|Shì Kè|100101  22|賁|Bì|101001  23|剝|Bō|000001  24|復|Fù|100000
25|無妄|Wú Wàng|100111  26|大畜|Dà Chù|111001  27|頤|Yí|100001  28|大過|Dà Guò|011110  29|坎|Kǎn|010010  30|離|Lí|101101  31|咸|Xián|001110  32|恆|Héng|011100
33|遯|Dùn|001111  34|大壯|Dà Zhuàng|111100  35|晉|Jìn|000101  36|明夷|Míng Yí|101000  37|家人|Jiā Rén|101011  38|睽|Kuí|110101  39|蹇|Jiǎn|001010  40|解|Xiè|010100
41|損|Sǔn|110001  42|益|Yì|100011  43|夬|Guài|111110  44|姤|Gòu|011111  45|萃|Cuì|000110  46|升|Shēng|011000  47|困|Kùn|010110  48|井|Jǐng|011010
49|革|Gé|101110  50|鼎|Dǐng|011101  51|震|Zhèn|100100  52|艮|Gèn|001001  53|漸|Jiàn|001011  54|歸妹|Guī Mèi|110100  55|豐|Fēng|101100  56|旅|Lǚ|001101
57|巽|Xùn|011011  58|兌|Duì|110110  59|渙|Huàn|010011  60|節|Jié|110010  61|中孚|Zhōng Fú|110011  62|小過|Xiǎo Guò|001100  63|既濟|Jì Jì|101010  64|未濟|Wèi Jì|010101
```

(Symbols read bottom line first; `1` yang, `0` yin. Note hexagrams 10 and 56 share the pinyin Lǚ; they differ in character.)

Code shape:

```js
  const parseHexagrams = text => text.trim().split('\n').map((line, id) => { const [number, character, name, symbol, gloss, keyword, meaning, prompt] = line.split('|'); return {id, number:Number(number), character, name, symbol, gloss, keyword, meaning, prompt}; });
  const hexagrams = parseHexagrams(`
1|乾|Qián|111111|Creative force, unbroken|Initiative|…original meaning…|…original prompt?
…64 lines…`);
  const trigrams = [['Qián','乾','Heaven','111'],['Duì','兌','Lake','110'],['Lí','離','Fire','101'],['Zhèn','震','Thunder','100'],['Xùn','巽','Wind','011'],['Kǎn','坎','Water','010'],['Gèn','艮','Mountain','001'],['Kūn','坤','Earth','000']].map(([name,character,image,symbol],id)=>({id,name,character,image,symbol}));
  const linePositions = [
    {id:0,title:'The beginning',text:'…original, 90+ characters…'},
    {id:1,title:'The inner position',text:'…'},{id:2,title:'The threshold',text:'…'},{id:3,title:'Entering the outer',text:'…'},{id:4,title:'The position of authority',text:'…'},{id:5,title:'The end, and excess',text:'…'}
  ];
```

and export `hexagrams, trigrams, linePositions`.

Writing the 64 entries: `gloss` is an original three-to-five-word English phrase that is not a Wilhelm/Legge/Blofeld title (avoid "The Creative", "The Receptive", "Difficulty at the Beginning", "Youthful Folly", "Waiting", "Conflict", "The Army", "Holding Together", "Peace", "Standstill", etc. as exact phrases); `keyword` one or two words; `meaning` two or three sentences (75–260 characters) in the site's reflective voice, drawing on the hexagram's traditional image (the two trigrams) without claiming outcomes; `prompt` a question. Vary sentence openings across the 64 as the numerology copy review demanded: no opening pattern in more than 8 entries, "traditionally" in at most 12. Use curly apostrophes inside the template literal; never a `|` inside a field.

- [ ] **Step 4: Run**

Run: `node --test tests/*.test.cjs`
Expected: 195 passing.

- [ ] **Step 5: Commit**

```bash
git add divination-data.js tests/divination.test.cjs
git commit -m "feat(iching): sixty-four hexagrams, trigrams and line positions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Engine and art — casting, reading lines, SVG figures

**Files:**
- Modify: `divination-engine.js`, `divination-art.js`, `tests/divination.test.cjs`

**Interfaces:**
- Consumes: `D.hexagrams` (Task 6), `randomInt`.
- Produces: `E.castLine(method, random)`, `E.castHexagram(method, random)`, `E.readLines(values, hexagrams)`, `E.loadLines(values)`, `E.hexagramIndex(symbol, hexagrams)`; `DivinationArt.hexagram(values)` and `DivinationArt.hexagramFromSymbol(symbol)`.

- [ ] **Step 1: Tests**

```js
test('i ching casting: coins and yarrow probabilities from an injected random source',()=>{
  const seq=values=>{let i=0;return ()=>values[i++];};
  assert.equal(E.castLine('coins',seq([0,0,0])),6,'three tails');
  assert.equal(E.castLine('coins',seq([1,1,1])),9,'three heads');
  assert.equal(E.castLine('coins',seq([1,0,0])),7);
  assert.equal(E.castLine('coins',seq([1,1,0])),8);
  assert.deepEqual([0,1,5,6,12,13,15].map(n=>E.castLine('yarrow',seq([n]))),[6,7,7,8,8,9,9]);
  assert.throws(()=>E.castLine('dice'));
  const lines=E.castHexagram('coins',seq([1,1,1, 0,0,0, 1,0,0, 0,1,0, 1,1,0, 0,0,1]));
  assert.deepEqual(lines,[9,6,7,7,8,7]);
});
test('i ching reading: primary, changing lines and the relating hexagram',()=>{
  const all9=E.readLines([9,9,9,9,9,9],D.hexagrams);
  assert.equal(all9.primary,0,'hexagram 1');assert.deepEqual(all9.changing,[0,1,2,3,4,5]);assert.equal(all9.relating,1,'becomes hexagram 2');
  const still=E.readLines([7,8,7,8,7,8],D.hexagrams);
  assert.equal(still.primarySymbol,'101010');assert.equal(still.primary,62,'hexagram 63');assert.deepEqual(still.changing,[]);assert.equal(still.relating,null);
  const one=E.readLines([7,7,7,7,7,6],D.hexagrams);
  assert.equal(one.primarySymbol,'111110');assert.equal(one.primary,42,'hexagram 43');assert.deepEqual(one.changing,[5]);assert.equal(one.relatingSymbol,'111111');assert.equal(one.relating,0);
  for(const bad of [[7,7,7,7,7],[7,7,7,7,7,5],[7,7,7,7,7,'9'],null,'777777']) assert.throws(()=>E.readLines(bad,D.hexagrams),`rejects ${JSON.stringify(bad)}`);
  assert.deepEqual(E.loadLines([6,7,8,9,7,8]),[6,7,8,9,7,8]);
  assert.equal(E.loadLines([6,7,8,9,7]),null);assert.equal(E.loadLines([6,7,8,9,7,10]),null);assert.equal(E.loadLines('678978'),null);
  assert.equal(E.hexagramIndex('010010',D.hexagrams),28);
});
```

Note: `castHexagram` with the coins sequence above: line 1 = 3+3+3 = 9, line 2 = 2+2+2 = 6, line 3 = 3+2+2 = 7, line 4 = 2+3+2 = 7, line 5 = 3+3+2 = 8, line 6 = 2+2+3 = 7 → `[9,6,7,7,8,7]` ✓.

- [ ] **Step 2: Run to confirm failure**, then **Step 3: Implement**

`divination-engine.js`, before the return:

```js
  // I Ching. Lines: 6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing). Bottom line first.
  function castLine(method, random = randomInt) {
    if (method === 'coins') return 6 + random(2) + random(2) + random(2);           // each coin: tails 2, heads 3
    if (method === 'yarrow') { const n = random(16); return n === 0 ? 6 : n < 6 ? 7 : n < 13 ? 8 : 9; } // 1/16, 5/16, 7/16, 3/16
    throw Error('Unknown casting method');
  }
  function castHexagram(method, random = randomInt) { return Array.from({length:6}, () => castLine(method, random)); }
  function validLines(values) { return Array.isArray(values) && values.length === 6 && values.every(v => Number.isInteger(v) && v >= 6 && v <= 9); }
  function hexagramIndex(symbol, hexagrams) { const i = hexagrams.findIndex(h => h.symbol === symbol); if (i < 0) throw Error('Unknown hexagram'); return i; }
  function readLines(values, hexagrams) {
    if (!validLines(values)) throw Error('Six lines of 6, 7, 8 or 9 required');
    const primarySymbol = values.map(v => v % 2 ? '1' : '0').join('');
    const changing = values.flatMap((v, i) => v === 6 || v === 9 ? [i] : []);
    const relatingSymbol = changing.length ? values.map(v => v === 6 ? '1' : v === 9 ? '0' : v % 2 ? '1' : '0').join('') : null;
    return {primary: hexagramIndex(primarySymbol, hexagrams), primarySymbol, changing, relating: relatingSymbol ? hexagramIndex(relatingSymbol, hexagrams) : null, relatingSymbol};
  }
  function loadLines(values) { return validLines(values) ? [...values] : null; }
```

Add them to the export. (7 and 9 are odd → yang; the `v % 2` trick relies on that.)

`divination-art.js`, before `return {emblem}`:

```js
  function hexagramSvg(bits, marks=[]) {
    // bits: six '1'/'0' bottom-up; marks: indices of changing lines with their kind ('o' old yang circle, 'x' old yin cross).
    const rows=bits.map((b,i)=>{const y=88-i*14;return b==='1'?`<rect x="18" y="${y-4}" width="64" height="8" rx="1" fill="currentColor" stroke="none"/>`:`<rect x="18" y="${y-4}" width="26" height="8" rx="1" fill="currentColor" stroke="none"/><rect x="56" y="${y-4}" width="26" height="8" rx="1" fill="currentColor" stroke="none"/>`;}).join('');
    const marked=marks.map(({index,kind})=>{const y=88-index*14;return kind==='o'?`<circle cx="91" cy="${y}" r="4"/>`:`<path d="M87 ${y-4}l8 8m0-8l-8 8"/>`;}).join('');
    return svg(rows+marked,'dv-hexagram');
  }
  function hexagram(values) { return hexagramSvg(values.map(v=>v%2?'1':'0'), values.flatMap((v,i)=>v===9?[{index:i,kind:'o'}]:v===6?[{index:i,kind:'x'}]:[])); }
  function hexagramFromSymbol(symbol) { return hexagramSvg(symbol.split('')); }
```

Export `hexagram, hexagramFromSymbol`. Also extend `emblem(kind,item)` with `if(kind==='iching') return hexagramFromSymbol(item.symbol);` so the library grid can reuse `visual()`.

- [ ] **Step 4: Run** `node --test tests/*.test.cjs` → 197 passing. **Step 5: Commit**

```bash
git add divination-engine.js divination-art.js tests/divination.test.cjs
git commit -m "feat(iching): coin and yarrow casting, changing lines and hexagram figures

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: UI — the I Ching practice

**Files:**
- Modify: `divination.js`, `divination.css`, `account.js:12`, `mobile-sections.js:136`, `index.html` (keys)

**Interfaces:**
- Consumes: Tasks 6–7 exports; existing `modes`, `states`, `render`, `output`, `visual`, `showArt`, `saveControl`, `currentDraw`, `loadDraw`.
- Produces: mode key `iching`; state fields `method` ('coins'|'yarrow'), `manual` (boolean, reuse), `lines` (six values for manual entry, default `[7,7,7,7,7,7]`); saved kind `iching` with `layout` = method or `'manual'` and payload `{lines}`.

- [ ] **Step 1: Mode, state, copy**

Add to `modes` (after `geomancy`):

```js
    iching:{name:'I Ching',tag:'64 hexagrams · coins or yarrow',title:'Six lines. A figure in motion.',intro:'Cast six lines from the bottom up. Read the hexagram they form, notice which lines are changing, and let the figure they turn into extend the reflection.',options:[],verb:'Cast the hexagram',note:'The I Ching (Yijing) is a Chinese classic of sixty-four six-line figures. This room casts with the three-coin method by default (each coin counts two or three; totals of six and nine are changing lines) or with the yarrow-stalk probabilities (1/16, 5/16, 7/16 and 3/16 for six, seven, eight and nine). Hexagram names and the King Wen order are traditional; every gloss, meaning and prompt here is original. Individual line statements are not reproduced; each changing line is read through its position instead.',source:'<a href="https://www.unicode.org/charts/PDF/U4DC0.pdf" target="_blank" rel="noopener">Unicode chart: the sixty-four hexagram symbols in King Wen order</a>'}
```

Extend the `states` initialiser so every state also has `method:'coins', lines:[7,7,7,7,7,7]`.

Change the header `<h2>` copy to "Five ways to listen closely." In `mobile-sections.js:136` change the subtitle to `'Lenormand · oracle cards · runes · geomancy · I Ching'`. In `account.js:12` add `iching: 'I Ching'` to `kindLabel`.

- [ ] **Step 2: Render**

In `render()`:
- `items()` returns `D.hexagrams` for `iching`.
- The back image: `root.style.setProperty('--dv-back', mode==='iching'?'none':…)`.
- Controls: for `iching`, replace the layout select with a method select: `<label for="dv-method">Casting method<select id="dv-method"><option value="coins" ${s.method==='coins'?'selected':''}>Three coins</option><option value="yarrow" ${s.method==='yarrow'?'selected':''}>Yarrow-stalk probabilities</option></select></label>`.
- After the controls, for `iching`, a manual block modelled on the geomancy one:

```js
      ${mode==='iching'?`<details class="dv-method"><summary>Cast with your own coins</summary><p>Toss three coins six times, bottom line first, counting two for tails and three for heads. Enter each total below, then cast.</p><label class="dv-manual-label"><input type="checkbox" id="dv-manual" ${s.manual?'checked':''}> Use the lines below</label><div class="dv-lines">${s.lines.map((v,i)=>`<button type="button" data-dv-line="${i}" aria-label="Line ${i+1}: ${lineName(v)}. Change.">${i+1} · ${v} · ${lineName(v)}</button>`).join('')}</div></details>`:''}
```

with `const lineName=v=>({6:'old yin, changing',7:'young yang',8:'young yin',9:'old yang, changing'})[v];`. Line buttons cycle 7 → 8 → 9 → 6 → 7 and set `s.manual=true` like the geomancy points.

- Library summary text: `mode==='iching'?'hexagrams':…`; library buttons show `visual()` (which now draws the SVG via `emblem`) plus `${item.number} · ${item.name}`.

`visual(kind,item)` must not emit an `<img>` for `iching`: return `<span class="dv-artwork dv-artwork-figure">${art(kind,item)}</span>` in that case. `showArt` for `iching` renders the large figure the same way and offers no Back side.

- [ ] **Step 3: Output**

In `output()`, before the generic card path, add `if(mode==='iching') { hexagramOutput(out,r); return; }` and write:

```js
  function hexagramOutput(out,r) {
    const read=E.readLines(r.lines,D.hexagrams), h=D.hexagrams[read.primary], rel=read.relating===null?null:D.hexagrams[read.relating];
    const tri=sym=>D.trigrams.find(t=>t.symbol===sym), lower=tri(h.symbol.slice(0,3)), upper=tri(h.symbol.slice(3));
    const figure=(hex,values,label)=>`<figure class="dv-hexagram-figure"><div class="dv-hexagram-art" role="img" aria-label="${label}: ${hex.name}, hexagram ${hex.number}">${values?DivinationArt.hexagram(values):DivinationArt.hexagramFromSymbol(hex.symbol)}</div><figcaption><span lang="zh">${hex.character}</span><strong>${hex.number} · ${hex.name}</strong><small>${hex.gloss}</small></figcaption></figure>`;
    const changing=read.changing.map(i=>{const p=D.linePositions[i];return `<article class="dv-line-reading"><p class="dv-kicker">Line ${i+1} · ${r.lines[i]===9?'old yang becoming yin':'old yin becoming yang'} · ${p.title}</p><p>${p.text}</p></article>`;}).join('');
    out.innerHTML=`${r.question?`<p class="dv-held-question">Your question <strong>${esc(r.question)}</strong></p>`:''}<div class="dv-hexagram-pair">${figure(h,r.lines,'Cast hexagram')}${rel?figure(rel,null,'Relating hexagram'):''}</div>
      <div class="dv-readings"><article tabindex="-1"><p class="dv-kicker">${upper.image} over ${lower.image} · ${h.keyword}</p><h4>${h.number} · ${h.name} <span lang="zh">${h.character}</span></h4><p class="dv-position-note">${upper.name} ${upper.character} above, ${lower.name} ${lower.character} below.</p><p>${h.meaning}</p><blockquote>${h.prompt}</blockquote></article>
      ${read.changing.length?`<p class="dv-kicker">${read.changing.length===1?'One changing line':read.changing.length+' changing lines'}</p>${changing}<article class="dv-relating"><p class="dv-kicker">Where this may be moving · ${rel.keyword}</p><h4>${rel.number} · ${rel.name} <span lang="zh">${rel.character}</span></h4><p>${rel.meaning}</p><blockquote>${rel.prompt}</blockquote></article>`:'<p class="dv-pending">No line is changing: the figure stands as it is. Sit with the primary hexagram.</p>'}</div>${saveControl()}`;
  }
```

- [ ] **Step 4: Casting, handlers, save and load**

- Draw handler: for `iching`, `s.reading={lines:s.manual?[...s.lines]:E.castHexagram(s.method),question:s.question,method:s.manual?'manual':s.method}`; status text "Six lines cast. Read the hexagram below." Wrap in the existing try/catch.
- `change` handler: `if(event.target.id==='dv-method') states.iching.method=event.target.value;` and the existing `dv-manual` line must target `states[mode]` rather than `states.geomancy` so both practices share it.
- Click handler: `data-dv-line` cycles the value and updates the button text and aria-label, sets `s.manual=true` and checks `#dv-manual`.
- Guard: the reveal branches (`data-dv-reveal`, `next`, `all`) must return early for `iching` as they do for geomancy (`if(!s.reading || mode==='geomancy' || mode==='iching') return;`).
- `currentDraw()`: for `iching` return `{kind:'iching', deck:'', layout:r.method, question:r.question||'', focus:'', payload:{lines:r.lines}}`.
- `loadDraw()`: for `iching`, `const lines=E.loadLines(p.lines); if(!lines) return false; s.reading={lines,question:…,method:['coins','yarrow','manual'].includes(reading.layout)?reading.layout:'coins'}; s.lines=[...lines]; s.manual=reading.layout==='manual'; s.method=s.reading.method==='manual'?s.method:s.reading.method;`.
- Study card for `iching`: show character, gloss, trigrams line, meaning, prompt, and the "View artwork" button labelled "View the figure".

- [ ] **Step 5: CSS**

Append to `divination.css`:

```css
.dv-tabs { grid-template-columns: repeat(5,minmax(0,1fr)); }
[data-practice=iching] .dv-artwork-figure { display: block; width: 100%; aspect-ratio: 1; }
.dv-hexagram { width: 100%; height: 100%; }
.dv-lines { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-top: 12px; }
.dv-lines button { padding: 10px 8px; font: 11px 'DM Mono',monospace; text-align: left; }
.dv-hexagram-pair { display: flex; flex-wrap: wrap; justify-content: center; gap: 28px; margin: 12px auto 28px; }
.dv-hexagram-figure { margin: 0; width: 200px; max-width: 100%; text-align: center; }
.dv-hexagram-art { padding: 18px; background: #f5ebda; color: #4f344c; box-shadow: inset 0 0 0 6px #f5ebda,inset 0 0 0 7px #a6805644,3px 5px 0 #b29a7388,0 14px 26px #0004; }
.dv-hexagram-figure figcaption { display: grid; gap: 4px; margin-top: 12px; }.dv-hexagram-figure figcaption span[lang] { font: 30px 'Noto Serif CJK SC','SimSun',serif; }.dv-hexagram-figure figcaption small { color: var(--dv-muted); }
.dv-line-reading { padding: 14px 0; border-top: 1px solid #ffffff14; }.dv-relating { margin-top: 18px; padding-top: 18px; border-top: 1px dashed #b09bba66; }
@media (max-width: 700px) { .dv-tabs { grid-template-columns: repeat(2,minmax(0,1fr)); } .dv-lines { grid-template-columns: 1fr 1fr; } }
```

Check the existing `.dv-tabs` phone rule (if one exists at a different breakpoint, align with it rather than adding a second).

- [ ] **Step 6: Keys, checks, browser**

Bump `divination-data.js?v=2`, `divination-engine.js?v=iching-1`, `divination-art.js?v=iching-1`, `divination.js?v=iching-1`, `divination.css?v=iching-1`, `account.js?v=iching-1`, `mobile-sections.js?v=iching-1` in `index.html`.
Run: `for f in divination.js divination-art.js divination-engine.js divination-data.js account.js mobile-sections.js; do node --check $f; done && node --test tests/*.test.cjs` (197).
Browser: open `http://127.0.0.1:8765/#divination-room`, choose I Ching, cast with coins and with yarrow, confirm figure + reading render, changing lines produce line readings and a relating figure, the manual block cycles values and casts them, the library opens a study card, no console errors, and 390px has no page overflow. Confirm the other four practices still draw and reveal (regression). Pane screenshots may be blank; verify by DOM and say so.

- [ ] **Step 7: Commit**

```bash
git add divination.js divination.css account.js mobile-sections.js index.html
git commit -m "feat(iching): fifth divination practice with casting, changing lines and library

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Server — the `iching` reading kind

**Files:**
- Modify: `server/ishtar/readings/models.py`
- Create: `server/ishtar/readings/migrations/0002_reading_kind_iching.py` (via `makemigrations`)
- Modify: `server/ishtar/readings/tests/test_readings.py`

- [ ] **Step 1: Test**

In `test_validation`, add after the runes assertion:

```python
        self.assertEqual(self.create({'kind': 'iching', 'layout': 'coins', 'payload': {'lines': [7, 8, 9, 6, 7, 8]}}).status_code, 201)
```

Run from `server/ishtar` with its venv: `.venv/Scripts/python manage.py test readings` → expect the new assertion to fail with 400.

- [ ] **Step 2: Implement**

Append `('iching', 'I Ching')` to `Reading.KINDS`. Run `.venv/Scripts/python manage.py makemigrations readings -n reading_kind_iching` and confirm the generated file only alters the `kind` field choices. Run the full Django suite: `.venv/Scripts/python manage.py test` → all green.

- [ ] **Step 3: Commit**

```bash
git add server/ishtar/readings
git commit -m "feat(server): accept I Ching readings in the journal

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Documentation and final verification

**Files:**
- Modify: `docs/EXTENDED-ATLAS.md` (BaZi conventions and Validation), `docs/DIVINATION.md`, `docs/deployment.md`

- [ ] **Step 1: docs/EXTENDED-ATLAS.md** — in "BaZi conventions" add paragraphs for hidden stems (the table), Ten Gods (the relation × polarity table and that the Day Master position carries no god), the two phase-count views (still counts), and luck pillars (direction rule, Jie boundary via `SearchSunLongitude`, 3 days = 1 year with floor to months, ten pillars stepping the month pillar, the page-only counting choice). Replace the sentence "It does not include hidden stems, seasonal weighting, Ten Gods or luck cycles" with what is now included and what still is not (seasonal weighting, strength, annual pillars). In "Validation", add `tools/build_bazi_fixtures.py`, `tests/fixtures/bazi-reference.json` and `tests/bazi.test.cjs` with the real test count and the one-month tolerance rationale.
- [ ] **Step 2: docs/DIVINATION.md** — add an "I Ching" section: data shape and the King Wen table source, the two casting methods with their probabilities, the manual entry, changing-line and relating-hexagram rules, the six position texts standing in for line statements, the SVG figures, the journal payload `{lines}` with `layout` = method, tests, and the browser checks performed.
- [ ] **Step 3: docs/deployment.md** — add "## Pending: 2026-09-11 Chinese traditions release" listing: frontend files rekeyed (the ten keys above) and the new fixture/test files that do not ship; the Django change (`readings` migration 0002) requiring `manage.py migrate` and a service restart via the existing deploy script; the note that until the service is redeployed a signed-in save of an I Ching reading returns "Unknown reading kind.".
- [ ] **Step 4: Verify** — `node --test tests/*.test.cjs` (197 expected; record the real number), `cd server/ishtar && .venv/Scripts/python manage.py test`, `grep -n '?v=' index.html` shows the ten new keys.
- [ ] **Step 5: Commit**

```bash
git add docs/EXTENDED-ATLAS.md docs/DIVINATION.md docs/deployment.md
git commit -m "docs: BaZi depth, luck pillars and I Ching conventions; pending deploy note

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage:** A1 → T1; A2 → T1, T4; A3 → T1, T4; A4 → T3, T5; A5 → T1, T3; A6 → T2, T3; A7 → T4, T5; B1 → T6; B2 → T7; B3 → T7; B4 → T8; B5 → T9 (+ account.js in T8); B6 → T6–T9 tests; docs → T10.
- **Type consistency:** `bazi()` adds `dayStemIndex`, `hidden`, `gods.{stems,hidden}`, `phasesHidden`, `hiddenTotal`, `yangYear`; T4/T5 read exactly those. `luckPillars` pillars carry `stem`/`branch` arrays from `pillar()` plus `fromAge`, `fromYear`, `god`; T5 reads those. `readLines(values, hexagrams)` takes the data explicitly so the engine stays data-free; T8 passes `D.hexagrams`.
- **Placeholders:** the prose for ten gods, 64 hexagrams and six positions is delegated with shape, length and voice constraints and enforced by tests where structural.
