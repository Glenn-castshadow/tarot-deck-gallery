# Divination layouts (C4b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Lenormand Grand Tableau and the geomantic house chart to `/divination/` as saveable readings.

**Architecture:**
- **Engine.** Pure geometry and judgement functions go in `divination-engine.js`. Original house copy goes in `divination-data.js`. The two views go in `divination.js`.
- **New kinds.** Three kinds (`grand-tableau`, `geomancy-houses` and `cartomancy`) join `kinds.py` with migration `0005`, and `rooms.js` gets matching entries. The backend deploys first.

**Tech Stack:** Vanilla ES2020 with no build step, and `node --test tests/*.test.cjs`. Django 5 on the server; its tests run with `server/ishtar/.venv/Scripts/python.exe manage.py test` from `server/ishtar`.

**Spec:** `docs/superpowers/specs/2026-09-16-divination-layouts-design.md`

## Global Constraints

Tags: **[Glenn]** his instruction; **[codebase]** already enforced; **[program]** Part E of the program spec; **[spec]** a C4b spec decision taken under Glenn's instruction to complete C4; **[judgement]** mine.

- **Kinds.**
  - Add `grand-tableau` ("Grand Tableau"), `geomancy-houses` ("Geomantic house chart") and `cartomancy` ("Playing cards"), all in category `divination`.
  - Labels must match exactly across `kinds.py`, `rooms.js` and `Rooms.register`.
  - Put them in one migration, `0005`. [spec, codebase]
- **Tableau.**
  - Layout: positions 1–32 in rows of eight, then 33–36 as the closing row. Position *n* is the house of card *n*.
  - The significator is the Man (id 27), the Woman (id 28) or none, with none as the default.
  - "Near" means one ring in the 8×4 grid. "Knight" means knight's-move cells in the 8×4 grid.
  - Corners are 1, 8, 25 and 32.
  - The closing row is excluded from near and knight. [spec]
- **House chart.**
  - Placement: mothers go in houses 1–4, daughters in 5–8, nieces in 9–12.
  - House 1 is the querent. The quesited house is 2–12, with 7 as the default.
  - The judgement steps and definitions are exactly those in the spec.
  - Adjacency is circular.
  - Aspects are counted by the shorter house count: 2 sextile, 3 square, 4 trine, 6 opposition. [spec]
- **No verdicts.** Judgement copy uses the historical past tense in the third person, like the horary copy. Only link a source after checking that its URL returns 200 and covers the topic. [spec]
- **Existing practices and layouts render exactly as today.** [spec]
- **Copy.** It is reflective and original. No predictions, luck or fortune. British spelling, spaced em dashes and curly apostrophes. No sentence may assert a position, count or relation the data does not always support. [codebase, judgement]
- **Guards.** Use bare `typeof` guards, never `window.X`. Escape every interpolated value. [codebase]
- **Layout and access.** Keyboard operable. Verify at 390px and 1400px. The 8×4 grid scrolls inside its own box on phones. [program, spec]
- No new dependencies. [Glenn] Bump the cache key of every changed file on every page that loads it. [codebase] Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. [session attribution instruction]

---

### Task 1: The three kinds

**Files:**
- `server/ishtar/readings/kinds.py`
- `server/ishtar/readings/migrations/0005_*.py` (generated)
- `server/ishtar/readings/tests/test_readings.py`
- `rooms.js`
- `tests/rooms.test.cjs`

- [ ] **Step 1: Add the kinds.** Add the three kinds to `KINDS` in `kinds.py`, after `iching`. Generate the migration from `server/ishtar`: `.venv/Scripts/python.exe manage.py makemigrations readings --name reading_kind_c4`. Check that it contains only an `AlterField` on `kind`.
- [ ] **Step 2: Server test.** Add a server test that the three kinds exist with category `divination`. It should also check that a `grand-tableau` reading saves and reads back its payload. Follow the existing `SPREAD` fixture and client pattern in `test_readings.py`.
- [ ] **Step 3: Rooms.** In `rooms.js`, add the three kinds to the page map (`/divination/`) and the label map, using the exact labels. Extend `tests/rooms.test.cjs` the same way it covers existing kinds. Read the file first. If it checks that `rooms.js` and `kinds.py` agree, rely on that; otherwise add a check that parses `kinds.py` for these three.
- [ ] **Step 4: Tests and commit.** Run the server tests (`.venv/Scripts/python.exe manage.py test` from `server/ishtar`) and the node suite. Bump `rooms.js`'s cache key on every page that loads it; grep first, because it loads on several pages. Commit by file name: `feat(journal): grand-tableau, geomancy-houses and cartomancy kinds`.

---

### Task 2: The engine

**Files:** `divination-engine.js`, `tests/divination.test.cjs`

**Produces:**
- `tableauNear(p)`, `tableauKnight(p)` and `tableau(ids, significator)`, which returns `{cells, significator, significatorPosition, near, knight, corners, closing}`.
- `loadTableau(payload)`.
- `houseChart(shield)`, which returns 12 figures, index 0 being house 1.
- `houseDistance(a, b)`.
- `judge(houses, quesited)`, which returns `{quesited, querentFigure, quesitedFigure, passage, occupation, conjunction, mutation, translation:[{from,to}], aspects:[{house,aspect}]}`.
- `loadHouses(payload)`.

The controller ran this code against these expected values before dispatch.

- [ ] **Step 1: Write the failing tests.** Append to `tests/divination.test.cjs`, checking how it already imports the engine and data:

```js
test('Grand Tableau near and knight cells match hand lists', () => {
  const near = p => E.tableauNear(p).join(','), knight = p => E.tableauKnight(p).join(',');
  assert.equal(near(1), '2,9,10');          assert.equal(knight(1), '11,18');
  assert.equal(near(8), '7,15,16');         assert.equal(knight(8), '14,23');
  assert.equal(near(12), '3,4,5,11,13,19,20,21'); assert.equal(knight(12), '2,6,18,22,27,29');
  assert.equal(near(28), '19,20,21,27,29'); assert.equal(knight(28), '11,13,18,22');
  assert.equal(near(34), '');               assert.equal(knight(34), '');
});

test('the tableau finds the significator, and refuses anything but a full permutation', () => {
  const ids = Array.from({length: 36}, (_, i) => i);
  const man = E.tableau(ids, 'man');
  assert.equal(man.significatorPosition, 28);     // id 27, the Man, in position 28
  assert.deepEqual(man.corners, [1, 8, 25, 32]);
  assert.deepEqual(man.closing, [33, 34, 35, 36]);
  assert.equal(E.tableau(ids, 'woman').significatorPosition, 29);
  const none = E.tableau(ids, 'none');
  assert.equal(none.significatorPosition, null);
  assert.deepEqual(none.near, []);
  const moved = [...ids]; [moved[27], moved[33]] = [moved[33], moved[27]];   // Man into the closing row
  assert.deepEqual(E.tableau(moved, 'man').near, []);
  assert.throws(() => E.tableau(ids.slice(0, 35), 'none'));
  assert.throws(() => E.tableau([...ids.slice(0, 35), 0], 'none'));
  assert.throws(() => E.tableau(ids, 'queen'));
  assert.deepEqual(E.loadTableau({ids, significator: 'woman', selected: 5}), {ids, significator: 'woman', selected: 5});
  assert.deepEqual(E.loadTableau({ids, significator: 'x', selected: 99}), {ids, significator: 'none', selected: 0});
  assert.equal(E.loadTableau({ids: [1, 2]}), null);
  assert.equal(E.loadTableau(null), null);
});

const F = ['1111','2222','2211','1122','2112','1221','2121','1212','1222','2221','2212','2122'].map(s => [...s].map(Number));
const base = () => F.map(f => [...f]);
const pick = j => ({passage: j.passage, occupation: j.occupation, conjunction: j.conjunction, mutation: j.mutation, translation: j.translation, aspects: j.aspects});

test('house chart placement follows mothers, daughters, nieces', () => {
  const shield = E.shield([[1,1,1,1],[2,2,2,2],[1,2,1,2],[2,1,2,1]]);
  const houses = E.houseChart(shield);
  assert.equal(houses.length, 12);
  assert.deepEqual(houses.slice(0, 4), shield.mothers);
  assert.deepEqual(houses.slice(4, 8), shield.daughters);
  assert.deepEqual(houses.slice(8, 12), shield.nieces);
  assert.equal(E.houseDistance(12, 1), 1);
  assert.equal(E.houseDistance(11, 2), 3);
});

test('judgement finds each mode of perfection and each aspect on hand-built charts', () => {
  assert.deepEqual(pick(E.judge(base(), 7)), {passage: [], occupation: false, conjunction: false, mutation: false, translation: [], aspects: []});
  let h = base(); h[6] = [...h[0]];
  assert.deepEqual(pick(E.judge(h, 7)), {passage: [7], occupation: true, conjunction: false, mutation: false, translation: [], aspects: []});
  h = base(); h[7] = [...h[0]];
  assert.equal(E.judge(h, 7).conjunction, true);                      // querent's figure in 8, next to 7
  h = base(); h[11] = [...h[6]];
  assert.equal(E.judge(h, 7).conjunction, true);                      // quesited's figure in 12, next to 1
  h = base(); h[3] = [...h[0]]; h[4] = [...h[6]];
  assert.deepEqual(pick(E.judge(h, 7)), {passage: [4], occupation: false, conjunction: false, mutation: true, translation: [], aspects: [{house: 4, aspect: 'square'}]});
  h = base(); h[1] = [...h[5]];
  assert.deepEqual(E.judge(h, 7).translation, [{from: 2, to: 6}]);    // one figure in 2 (next to 1) and 6 (next to 7)
  h = base(); h[9] = [...h[0]];
  assert.deepEqual(E.judge(h, 4).aspects, [{house: 10, aspect: 'opposition'}]);
  h = base(); h[2] = [...h[0]];
  assert.deepEqual(E.judge(h, 5).aspects, [{house: 3, aspect: 'sextile'}]);
  h = base(); h[10] = [...h[0]];
  assert.deepEqual(E.judge(h, 7).aspects, [{house: 11, aspect: 'trine'}]);
  assert.throws(() => E.judge(base(), 1), RangeError);
  assert.throws(() => E.judge(base().slice(0, 11), 7));
});

test('house chart payloads load or are refused', () => {
  const mothers = [[1,1,1,1],[2,2,2,2],[1,2,1,2],[2,1,2,1]];
  assert.deepEqual(E.loadHouses({mothers, quesited: 10, selected: 3}), {mothers, quesited: 10, selected: 3});
  assert.deepEqual(E.loadHouses({mothers, quesited: 1, selected: 0}), {mothers, quesited: 7, selected: 1});
  assert.equal(E.loadHouses({mothers: [[1]], quesited: 7}), null);
  assert.equal(E.loadHouses(null), null);
});
```

- [ ] **Step 2: Implement.** In `divination-engine.js`, before the `return`, add the functions below verbatim. Then add `loadHouses`, and export all eight names.

```js
  const TABLEAU_CORNERS=[1,8,25,32], TABLEAU_CLOSING=[33,34,35,36], SIGNIFICATORS={man:27,woman:28};
  const cellOf=p=>({row:Math.floor((p-1)/8),col:(p-1)%8});
  // Grand Tableau: positions 1–32 in rows of eight, 33–36 the closing row (outside near and knight).
  function tableauNear(p) {
    if(!Number.isInteger(p)||p<1||p>32) return [];
    const a=cellOf(p);
    return Array.from({length:32},(_,i)=>i+1).filter(q=>{const b=cellOf(q);return q!==p&&Math.abs(a.row-b.row)<=1&&Math.abs(a.col-b.col)<=1;});
  }
  function tableauKnight(p) {
    if(!Number.isInteger(p)||p<1||p>32) return [];
    const a=cellOf(p);
    return Array.from({length:32},(_,i)=>i+1).filter(q=>{const b=cellOf(q),dr=Math.abs(a.row-b.row),dc=Math.abs(a.col-b.col);return (dr===1&&dc===2)||(dr===2&&dc===1);});
  }
  const validPermutation=(ids,size)=>Array.isArray(ids)&&ids.length===size&&new Set(ids).size===size&&ids.every(i=>Number.isInteger(i)&&i>=0&&i<size);
  function tableau(ids, significator='none') {
    if(!validPermutation(ids,36)) throw Error('A Grand Tableau needs all 36 cards once each');
    if(!Object.hasOwn(SIGNIFICATORS,significator)&&significator!=='none') throw Error('Choose the Man, the Woman or none');
    const position=significator==='none'?null:ids.indexOf(SIGNIFICATORS[significator])+1;
    return {cells:ids.map((id,i)=>({position:i+1,id,house:i})),significator,significatorPosition:position,
      near:position?tableauNear(position):[],knight:position?tableauKnight(position):[],corners:[...TABLEAU_CORNERS],closing:[...TABLEAU_CLOSING]};
  }
  function loadTableau(p) {
    if(!p||typeof p!=='object'||!validPermutation(p.ids,36)) return null;
    return {ids:[...p.ids],significator:['man','woman','none'].includes(p.significator)?p.significator:'none',
      selected:Number.isInteger(p.selected)&&p.selected>=0&&p.selected<36?p.selected:0};
  }
  // Geomantic house chart: mothers in houses 1–4, daughters 5–8, nieces 9–12. Index 0 is house 1.
  const sameFigure=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===4&&b.length===4&&a.every((n,i)=>n===b[i]);
  function houseChart(chart) {
    if(!chart||![chart.mothers,chart.daughters,chart.nieces].every(g=>Array.isArray(g)&&g.length===4)) throw Error('A full shield is required');
    return [...chart.mothers,...chart.daughters,...chart.nieces].map(f=>[...f]);
  }
  const houseDistance=(a,b)=>{const d=Math.abs(a-b)%12;return Math.min(d,12-d);};
  const HOUSE_ASPECTS={2:'sextile',3:'square',4:'trine',6:'opposition'};
  const HOUSES=Array.from({length:12},(_,i)=>i+1);
  // One common Renaissance method. House 1 is the querent; adjacency is circular (12 sits beside 1).
  function judge(houses, quesited) {
    if(!Array.isArray(houses)||houses.length!==12) throw Error('Twelve houses required');
    if(!Number.isInteger(quesited)||quesited<2||quesited>12) throw new RangeError('Choose a quesited house from 2 to 12');
    const at=h=>houses[h-1], querent=at(1), sought=at(quesited);
    const where=figure=>HOUSES.filter(h=>sameFigure(at(h),figure));
    const passage=where(querent).filter(h=>h!==1);
    const occupation=sameFigure(querent,sought);
    const conjunction=passage.some(h=>h!==quesited&&houseDistance(h,quesited)===1)||where(sought).some(h=>h!==quesited&&h!==1&&houseDistance(h,1)===1);
    const mutation=HOUSES.some(h=>{const n=h%12+1;if([h,n].some(x=>x===1||x===quesited))return false;
      return (sameFigure(at(h),querent)&&sameFigure(at(n),sought))||(sameFigure(at(h),sought)&&sameFigure(at(n),querent));});
    const nearQuerent=HOUSES.filter(h=>h!==1&&h!==quesited&&houseDistance(h,1)===1);
    const nearSought=HOUSES.filter(h=>h!==1&&h!==quesited&&houseDistance(h,quesited)===1);
    const translation=nearQuerent.flatMap(a=>nearSought.filter(b=>sameFigure(at(a),at(b))).map(b=>({from:a,to:b})));
    const aspects=passage.filter(h=>h!==quesited&&HOUSE_ASPECTS[houseDistance(h,quesited)]).map(h=>({house:h,aspect:HOUSE_ASPECTS[houseDistance(h,quesited)]}));
    return {quesited,querentFigure:[...querent],quesitedFigure:[...sought],passage,occupation,conjunction,mutation,translation,aspects};
  }
```

`loadHouses(p)` returns `null` unless `p` is an object whose `mothers` passes `shield` without throwing. Otherwise it returns:
- `mothers`: a copy of `p.mothers`;
- `quesited`: `p.quesited` when it is an integer from 2 to 12, else 7;
- `selected`: `p.selected` when it is an integer from 1 to 12, else 1.

Check this against the test above.

- [ ] **Step 3: Run the tests and the suite, then commit.** Commit message: `feat(divination): Grand Tableau and house chart engine`.

---

### Task 3: House copy

**Files:** `divination-data.js`, `tests/divination.test.cjs`

- [ ] **Step 1: The two tables.** Add `tableauHouses` and `houseMatters` to `divination-data.js` and export both.
  - `tableauHouses` has 36 entries, index-aligned with `lenormand`. Each entry is one original sentence naming the house through its card's theme, for example "In the house of the Ship — what is at a distance, or on the move." Each sentence must be true of any card that falls there; it describes the house, not the card.
  - `houseMatters` has 12 entries, `{name, matter}`. Each gives a short name and one line on the matters traditionally assigned to that astrological house (1 the querent and their situation, 2 resources, 3 siblings, short journeys and messages, 4 home, land and endings, 5 children, pleasure and news, 6 health routines, work and service, 7 partners, agreements and open rivals, 8 shared resources and endings, 9 long journeys, learning and belief, 10 career, reputation and authority, 11 friends, hopes and patrons, 12 hidden matters, retreat and difficulties). Word them reflectively, with no fatalism, and avoid "death"/"disease"/"enemy" phrasing. Say "the other party" rather than "enemies". Put health matters as routines and care rather than illness.
- [ ] **Step 2: Test.** Add a test that `tableauHouses.length === 36`, `houseMatters.length === 12`, and that every entry is non-empty. The test must also check that no entry matches `/you will|will happen|\bluck|fortune|death|disease|illness|enemy|enemies|doom|destined/i`. Commit: `feat(divination): house copy for the tableau and the house chart`.

---

### Task 4: The Grand Tableau view

**Files:** `divination.js`, `divination.css`, `divination/index.html`

- [ ] **Step 1: Layout option and cells.**
  - Add a third Lenormand layout option `[36, 'Grand Tableau · all 36 cards']`. When chosen, drawing uses `E.draw(36, 36)`, and all cells start revealed.
  - Render the tableau as an 8-column grid of 32 small cells, then a row of four. Each cell shows its position number, the card image or name, and its house (the house card's name).
  - Put the grid in a box that scrolls horizontally on phones. The page itself must not scroll.
  - Cells are buttons. Choosing one shows a reading panel with the card's name, keyword and existing meaning, its house (`tableauHouses[position-1]`) and the card's prompt.
- [ ] **Step 2: Significator.** Add a significator control (radio group or select): None (default), the Man, the Woman. With a significator:
  - Mark its cell.
  - Mark near cells and knight cells distinctly. Use an outline and a text badge, not colour alone.
  - Show a "Near the significator" list and a "A knight's move away" list.
  - Name the significator's own house.
  - When it falls in the closing row, say that the closing row sits outside the grid for nearness and knighting.

  Always show "The four corners" (positions 1, 8, 25, 32) and "The closing row" (33–36) as short lists.
- [ ] **Step 3: About.** Add an About paragraph for the tableau that states the 8×4+4 layout, that position *n* is the house of card *n*, the significator choice, one-ring nearness, knighting, the corners and the closing row. Other readers use a 9×4 layout; say so.
- [ ] **Step 4: Saving.**
  - `currentDraw` returns kind `grand-tableau` with `layout:'grand-tableau'`, `payload:{ids, significator, selected}`, and a summary. The summary is "Grand Tableau · the Man in the house of X", or "Grand Tableau · corners: A, B, C, D" when there is no significator. Keep it to 120 characters or fewer.
  - `loadDraw` accepts kind `grand-tableau` through `E.loadTableau`, and switches Lenormand to the 36-card layout.
  - Add `'grand-tableau'` to the `labels` object that feeds `Rooms.register`, labelled "Grand Tableau". The current-draw guard compares `draw.kind === kind`, so the Lenormand room must still return kind `lenormand` for three and five cards.
- [ ] **Step 5: Styles and commit.**
  - Style following the practice's existing card look. The cells are small, so check legibility at 390px and 1400px by inspection.
  - Bump `divination.js`, `divination-engine.js`, `divination-data.js` and `divination.css`, wherever each loads, if not already bumped this branch.
  - Commit: `feat(divination): the Grand Tableau`. Do not attempt browser verification.

---

### Task 5: The geomantic house chart view

**Files:** `divination.js`, `divination.css`

- [ ] **Step 1: View switch and chart.** In Geomancy, add a view switch, `Shield` / `House chart` (`aria-pressed` buttons), that works on the current cast.
  - The house chart shows the twelve houses as a grid of twelve cells, each with its house number, name (`houseMatters`), figure art and figure name. The witnesses, judge and reconciler sit beside the grid.
  - Add a labelled select for the quesited house, listing houses 2–12 by number and name; default 7.
  - Cells are buttons. Choosing one shows the figure's meaning and the house's matter.
- [ ] **Step 2: Judgement panel.** From `E.judge(E.houseChart(chart), quesited)`, list the steps in order, each saying what the tradition looked for and whether this chart shows it:
  1. The figure in the quesited house.
  2. Passage: the houses the querent's figure also appears in, or none.
  3. Perfection: occupation, conjunction, mutation and translation, each named with what was found, or a sentence saying the chart shows none.
  4. Aspects, listed.

  Write in the past tense and third person, e.g. "Geomancers looked first at…". Never say the matter will or will not happen.

  The About paragraph names this as one common Renaissance method, gives the placement rule, and says traditions differ. Link a source only after `curl -sI` shows the URL returns 200 and a quick fetch shows it covers geomantic house charts or perfection; the Princeton pages already cited are a starting point. Otherwise, name no link.
- [ ] **Step 3: Saving.**
  - `currentDraw` in house view returns kind `geomancy-houses`, `layout:'house-chart'`, `payload:{mothers, quesited, selected}`, and summary "House chart · house {n}, {name}: {figure}".
  - In shield view it still returns `geomancy`.
  - `loadDraw` accepts `geomancy-houses` through `E.loadHouses`, and opens Geomancy in house view.
  - Add `'geomancy-houses': 'Geomantic house chart'` to `labels`.
- [ ] **Step 4: Styles and commit.** Style so the twelve-cell grid holds at 390px and 1400px. Keep cache keys bumped once per file for the branch. Commit: `feat(divination): the geomantic house chart`. Do not attempt browser verification.

---

### Task 6: Documentation

- [ ] **Step 1: DIVINATION.md.** In `docs/DIVINATION.md`, document:
  - both readings, with their conventions (the geometry and judgement definitions exactly as coded);
  - their payloads and summaries;
  - the house copy's intent;
  - sources, but only those actually linked in the page.

  Record the three new kinds and migration `0005`.
- [ ] **Step 2: SITE-STRUCTURE.md.** In `docs/SITE-STRUCTURE.md`, update anything that lists kinds or the divination page.
- [ ] **Step 3: Check and commit.** Check every claim against the code. Use real test counts, from both the node suite and the Django tests. Commit: `docs: the Grand Tableau and the geomantic house chart`.

---

## Notes for the executor

- Stop dev preview servers before any merge. Never use `git add -A`. In PowerShell, use `git commit -F <file>`.
- Commands on `V:` can exceed two minutes.
- The node suite before this plan is 529 passing. The Django readings tests are 14 passing.
