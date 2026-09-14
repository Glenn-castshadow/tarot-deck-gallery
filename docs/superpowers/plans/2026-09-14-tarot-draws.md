# Tarot draws and reading options (C2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three tarot spreads — a one-card draw with a clarifier, a seven-card relationship layout, and a thirteen-card year ahead — plus two options that change how a deal is made.

**Architecture:** All three draws are entries in the existing `spreads` table in `tarot-readings.js`, so they reuse the dealing, revealing, reporting and saving machinery unchanged. The one-card draw is a two-position spread rather than a new room, which is why this sub-project needs no journal kind, no migration and no backend change at all. The two options are one new argument to `deal`.

**Tech Stack:** Vanilla ES2020 in plain `<script>` tags, no build step, no bundler. UMD modules attaching a global in the browser and `module.exports` under Node. Tests are `node --test tests/*.test.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-14-tarot-draws-design.md`

## Global Constraints

Copied from the spec and from Part E of the program spec. Every task's requirements implicitly include this section.

- **No backend change.** Do not touch `server/`, `server/ishtar/readings/kinds.py`, the migrations, or `rooms.js`. There is no new journal kind. A one-card draw saves as `kind: 'tarot-spread'` with `layout: 'question'`.
- **No new dependencies.** Vanilla ES2020, no build step, no bundler.
- **`tarot-readings.js` stays pure** — no DOM access. It is required under Node by the tests.
- **The daily card is untouched.** It stays seeded by date. The options apply only where a reader is actively dealing.
- **Voice:** symbolic reflection. No predictions, no verdicts, no luck or fortune framing. `tests/tarot-voice.test.cjs` is the gate and covers spread descriptions, tradition lines, position lenses and questions.
- **No invented lineage.** Neither new multi-card spread has a canonical source. Their `tradition` lines say so, the way the Horseshoe's already does.
- **British spelling. Spaced em dashes ` — `, never spaced hyphens. Curly apostrophes `’`, never straight.**
- **Accessibility:** keyboard operable, reduced motion respected, layouts verified at 390px and 1400px.
- **Cache keys** bumped on every changed file, on every page that loads it.
- **Commits** end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
|---|---|
| `tarot-readings.js` | The three spread definitions, the options argument to `deal`, and `dealtAt` in the payload with its validation and replay. |
| `tarot-readings.css` | One layout block per new spread. |
| `tarot.js` | The option controls, passing them to `deal`, and the year wheel's month labels. |
| `tarot/index.html` | Three spread choices, two toggles, cache keys. |
| `tests/tarot-readings.test.cjs` | Dealing, geometry, options, validation, replay. |
| `tests/tarot-voice.test.cjs` | Extended over the new spread copy. |
| `docs/FULL-READINGS.md` | The three layouts and the two options. |

Tasks 1 through 5 build the engine and are all in `tarot-readings.js`. Task 6 puts it on screen. Task 7 documents it.

---

### Task 1: The options argument to `deal`

**Files:**
- Modify: `tarot-readings.js:142-152`
- Modify: `tests/tarot-readings.test.cjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `deal(id, cards, randomInt, question, focus, options)` where `options` is `{reversals = true, majorsOnly = false}`. Every later task and all existing callers may omit it and get today's behaviour exactly.

**Background.** `deal` shuffles an array of indices into the 78-card catalogue and takes the first N. The Major Arcana are exactly indices 0 to 21, so restricting the pool to them leaves every stored index globally correct — `validDraw` and `loadSpread` need no change for this option.

- [ ] **Step 1: Write the failing tests**

Append to `tests/tarot-readings.test.cjs`:

```js
test('deal options default to the behaviour that shipped before them', () => {
  // The same seed must produce the same draw with no options, with an empty object, and with
  // the defaults written out. If any of these diverge, existing saved readings are at risk.
  const bare = Tarot.deal('celtic', cards, seeded(7), 'q', 'general');
  const empty = Tarot.deal('celtic', cards, seeded(7), 'q', 'general', {});
  const explicit = Tarot.deal('celtic', cards, seeded(7), 'q', 'general', {reversals: true, majorsOnly: false});
  assert.deepEqual(empty, bare);
  assert.deepEqual(explicit, bare);
});

test('reversals off yields no reversed card, and on yields both orientations', () => {
  const off = new Set();
  const on = new Set();
  for (let seed = 0; seed < 60; seed++) {
    for (const c of Tarot.deal('celtic', cards, seeded(seed), '', 'general', {reversals: false}).cards) off.add(c.orientation);
    for (const c of Tarot.deal('celtic', cards, seeded(seed), '', 'general', {reversals: true}).cards) on.add(c.orientation);
  }
  assert.deepEqual([...off], ['upright'], 'a reversal appeared with reversals off');
  assert.deepEqual([...on].sort(), ['reversed', 'upright'], 'the default should still reverse sometimes');
});

test('major-only restricts the pool to the 22 majors and still fills the largest spread', () => {
  const seen = new Set();
  for (let seed = 0; seed < 80; seed++) {
    const draw = Tarot.deal('celtic', cards, seeded(seed), '', 'general', {majorsOnly: true});
    assert.equal(draw.cards.length, 10);
    for (const c of draw.cards) {
      assert.ok(c.index >= 0 && c.index <= 21, `index ${c.index} is not a Major Arcanum`);
      assert.equal(cards[c.index].type, 'major');
      seen.add(c.index);
    }
  }
  assert.equal(seen.size, 22, 'every Major Arcanum should be reachable');
});

test('major-only still refuses a spread it cannot fill', () => {
  // Twenty-two majors against a ten-card spread is fine; two cards against it is not.
  assert.throws(() => Tarot.deal('celtic', cards.slice(0, 2), seeded(1), '', 'general', {majorsOnly: true}), RangeError);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/tarot-readings.test.cjs`
Expected: FAIL. The options tests fail because `deal` ignores the sixth argument, so reversals still appear with `reversals: false` and minor indices still appear with `majorsOnly: true`.

- [ ] **Step 3: Rewrite `deal`**

Replace the function at `tarot-readings.js:142-152` with:

```js
  // `options` was added with the reading options in C2b. Omitting it, or passing an empty object,
  // deals exactly as this function did before it existed — a test pins that.
  function deal(id, cards, randomInt, question='', focus='general', options={}) {
    const spread = spreads[id];
    if (!spread) throw new RangeError('Choose a spread and a complete deck.');
    const {reversals = true, majorsOnly = false} = options;
    // The Major Arcana are exactly indices 0-21 of the catalogue, so narrowing the pool to them
    // leaves every stored index globally correct; validDraw and loadSpread need no change for it.
    const order = cards.map((_,i)=>i).filter(i => !majorsOnly || cards[i].type === 'major');
    if (order.length < spread.positions.length) throw new RangeError('Choose a spread and a complete deck.');
    for (let i=order.length-1;i>0;i--) {
      const j=randomInt(i+1);
      if (!Number.isInteger(j)||j<0||j>i) throw new RangeError('Invalid shuffle value.');
      [order[i],order[j]]=[order[j],order[i]];
    }
    return {id,question:String(question).trim().slice(0,240),focus:Object.hasOwn(focuses,focus)?focus:'general',cards:order.slice(0,spread.positions.length).map(index=>({index,orientation:reversals&&randomInt(5)===0?'reversed':'upright'}))};
  }
```

Note the `!spread` check moved ahead of the pool build, because the pool's length is compared against `spread.positions.length`. The two throws keep the same message the function used before.

- [ ] **Step 4: Run the whole suite**

Run: `node --test tests/*.test.cjs`
Expected: PASS. Report the count; it should be the previous total plus 4. The pre-existing dealing tests must still pass untouched — they are what proves the default path is unchanged.

- [ ] **Step 5: Prove the default-equivalence test binds**

Temporarily change the default to `{reversals = false}` in the destructure, run the suite, and confirm **both** the default-equivalence test and the reversals test fail. Restore it and confirm green. A test that claims two code paths agree is worthless unless it has been seen to notice when they do not.

- [ ] **Step 6: Commit**

```bash
git add tarot-readings.js tests/tarot-readings.test.cjs
git commit -m "feat(tarot): reversals and major-only options on deal"
```

---

### Task 2: The one-card draw

**Files:**
- Modify: `tarot-readings.js` (the `spreads` table)
- Modify: `tarot-readings.css`
- Modify: `tests/tarot-readings.test.cjs`

**Interfaces:**
- Consumes: the `position(name, short, x, y, lens, question, role)` helper already in the file.
- Produces: `spreads.question`, two positions, `shape: 'question'`.

**This draw offers no yes, no no and no leaning.** The program spec originally called it a yes/no draw with an upright or reversed lean. Reversals are one in five here, so that lean would have read "leans toward" about eighty per cent of the time — a loaded coin presented as a reading. The draw keeps its shape and loses its verdict. Nothing in the copy may restore one.

- [ ] **Step 1: Write the failing test**

Append to `tests/tarot-readings.test.cjs`:

```js
test('the one-card draw deals two cards and pairs them', () => {
  const spread = Tarot.spreads.question;
  assert.equal(spread.positions.length, 2);
  assert.equal(spread.shape, 'question');
  assert.deepEqual(spread.pairs.map(p => [p[0], p[1]]), [[0, 1]]);
  assert.ok(spread.advice === 0 && spread.outcome === 1);
  for (let seed = 0; seed < 40; seed++) {
    const draw = Tarot.deal('question', cards, seeded(seed), 'Will it?', 'general');
    assert.equal(draw.cards.length, 2);
    assert.notEqual(draw.cards[0].index, draw.cards[1].index);
  }
});

test('the one-card draw promises no answer and no lean', () => {
  const spread = Tarot.spreads.question;
  const text = `${spread.name} ${spread.subtitle} ${spread.description} ${spread.tradition} ${spread.positions.map(p => `${p.name} ${p.lens} ${p.question}`).join(' ')}`.toLowerCase();
  for (const phrase of ['yes or no', 'leans toward', 'leans away', 'the answer', 'says yes', 'says no']) {
    assert.ok(!text.includes(phrase), `"${phrase}" appears in the one-card draw copy`);
  }
  // The clarifier is dealt with the first card, not drawn afterwards, and the copy must say so.
  assert.match(spread.tradition, /dealt together|at the same/i);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/tarot-readings.test.cjs`
Expected: FAIL, `Cannot read properties of undefined (reading 'positions')` — `spreads.question` does not exist.

- [ ] **Step 3: Add the spread**

Insert into the `spreads` object in `tarot-readings.js`, before `celtic` so it reads first in the picker:

```js
    question: {
      name: 'One card and a question', subtitle: 'One card · with a clarifier beside it', shape: 'question',
      description: 'A single card, held against something you are turning over. A second card is dealt beside it at the same moment, for when the first does not land.',
      tradition: 'Not a traditional layout, and not an oracle: it offers no answer, no yes or no, and no leaning either way. Both cards are dealt together, so the clarifier is set aside in the same moment as the first card rather than drawn later once the first is known.',
      pairs: [[0,1,'The card and its clarifier']],
      advice: 0, outcome: 1,
      positions: [
        position('The card','Your card',36,45,'Hold your question and read this card as a description of the ground it stands on rather than a response to it. The useful part is usually the aspect of the meaning you recognise before you have finished reading it.','What part of this had I already half noticed?'),
        position('A clarifier','Clarifier',64,45,'Turn this over only if the first card left you no purchase. It does not overrule the first or settle anything between them; it offers a second angle on the same ground.','What does this add that the first card left out?')
      ]
    },
```

- [ ] **Step 4: Add the layout block**

Append to `tarot-readings.css`, beside the other `.tarot-layout-*` rules:

```css
.tarot-layout-question { aspect-ratio: 100 / 58; }
.tarot-layout-question .tarot-place { width: 20%; }
.tarot-layout-question::after, .tarot-layout-question .tarot-cloth-mark { left: 50%; }
```

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot-readings.js tarot-readings.css tests/tarot-readings.test.cjs
git commit -m "feat(tarot): a one-card draw with a clarifier"
```

---

### Task 3: The relationship spread

**Files:**
- Modify: `tarot-readings.js` (the `spreads` table)
- Modify: `tarot-readings.css`
- Modify: `tests/tarot-readings.test.cjs`

**Interfaces:**
- Consumes: the `position` helper.
- Produces: `spreads.relationship`, seven positions, `shape: 'relationship'`.

**Two positions describe another person**, and the standing rule in this codebase is that a card cannot report someone's private thoughts. The Celtic Cross's environment position already says so. It matters more here than anywhere else in the deck, and the copy for positions 2 and 5 must carry it.

- [ ] **Step 1: Write the failing test**

Append to `tests/tarot-readings.test.cjs`:

```js
test('the relationship spread faces two columns with the connection between them', () => {
  const spread = Tarot.spreads.relationship;
  assert.equal(spread.positions.length, 7);
  assert.equal(spread.shape, 'relationship');
  const [you, them, between, helps, strains, advice, tendency] = spread.positions;
  // The two people face each other across the table and the connection sits between them.
  assert.ok(you.x < between.x && between.x < them.x, 'the connection should sit between the two people');
  assert.equal(you.y, them.y, 'the two people should be level with one another');
  assert.equal(between.y, you.y, 'the connection should share their row');
  // What helps and what strains straddle the centre line below them.
  assert.ok(helps.x < 50 && strains.x > 50, 'helps and strains should straddle the centre');
  assert.equal(helps.y, strains.y);
  assert.ok(helps.y > you.y, 'the second row should sit below the first');
  assert.ok(advice.y > helps.y && tendency.y > helps.y, 'advice and tendency form the last row');
  assert.ok(spread.advice === 5 && spread.outcome === 6);
  for (let seed = 0; seed < 40; seed++) {
    const draw = Tarot.deal('relationship', cards, seeded(seed), '', 'relationships');
    assert.equal(draw.cards.length, 7);
    assert.equal(new Set(draw.cards.map(c => c.index)).size, 7);
  }
});

test('the relationship spread refuses to read another person’s mind', () => {
  const spread = Tarot.spreads.relationship;
  const other = `${spread.positions[1].lens} ${spread.positions[1].question}`;
  const strains = `${spread.positions[4].lens} ${spread.positions[4].question}`;
  assert.match(other, /cannot|not able|no card|your own/i,
    'the position for the other person must say what a card cannot report');
  assert.ok(other.length > 80 && strains.length > 80);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/tarot-readings.test.cjs`
Expected: FAIL, `spreads.relationship` is undefined.

- [ ] **Step 3: Add the spread**

Insert into the `spreads` object after `horseshoe`:

```js
    relationship: {
      name: 'The Relationship spread', subtitle: 'Seven cards · two people and what runs between them', shape:'relationship',
      description: 'Two cards face each other with the connection between them, then what helps and what strains it, and finally an approach and where things tend.',
      tradition: 'A modern arrangement rather than an inherited one — seven-card relationship layouts vary from reader to reader and none is canonical, so this particular order is set out here and in the layout guide rather than attributed to a source. It reads any bond at all: family, friendship, work, or a relationship with something that is not a person.',
      pairs: [[0,1,'Each side of it'],[3,4,'What helps and what strains'],[5,6,'The approach and where it tends']],
      advice: 5, outcome: 6,
      positions: [
        position('You in this','You',16,28,'Read this as your own part: what you bring, what you want from the bond, and what you are doing with it at present. It describes your side and makes no claim about anybody else.','What am I contributing that I have not looked at directly?'),
        position('The other person in this','Them',84,28,'This describes the position the other person occupies in the relationship as you are able to observe it — what they appear to be doing and what the bond asks of them. A card cannot report their private thoughts or feelings, and this one does not pretend to.','What have I assumed about them that I have never actually checked?'),
        position('The connection itself','Between',50,28,'Between the two of you sits the thing neither of you owns alone: the history, the habit, the agreement, spoken or otherwise. Read it as its own subject rather than as a verdict on either party.','What does this bond need that neither of us has been providing?'),
        position('What helps it','Helps',32,58,'Look for the working part — a shared practice, a tolerance, a piece of good timing. Naming it matters, because the things that hold a bond together are usually the least remarked on.','What is already working that I could do more deliberately?'),
        position('What strains it','Strains',68,58,'This names the friction. A strain is not the same as a fault, and it is rarely located in one person: read it as a pressure the arrangement is under and describe it plainly.','Where is the pressure actually coming from, as far as I can tell?'),
        position('An approach to try','Advice',32,86,'Read this as something to attempt rather than a rule to follow. Choose a version of it small enough to try this week and revise afterwards.','What could I try that would still be fair if it does not work?'),
        position('Where it tends','Tendency',68,86,'This suggests the direction the relationship leans if nothing changes. It is a tendency, not a fate, and a bond has at least two people shaping it.','Which part of that direction is mine to influence?')
      ]
    },
```

- [ ] **Step 4: Add the layout block**

Append to `tarot-readings.css`:

```css
.tarot-layout-relationship { aspect-ratio: 100 / 78; }
.tarot-layout-relationship .tarot-place { width: 14%; }
.tarot-layout-relationship::after { left: 50%; top: 28%; width: 62%; }
.tarot-layout-relationship .tarot-cloth-mark { left: 50%; top: 72%; }
```

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot-readings.js tarot-readings.css tests/tarot-readings.test.cjs
git commit -m "feat(tarot): the relationship spread"
```

---

### Task 4: The year-ahead spread

**Files:**
- Modify: `tarot-readings.js` (the `spreads` table)
- Modify: `tarot-readings.css`
- Modify: `tests/tarot-readings.test.cjs`

**Interfaces:**
- Consumes: the `position` helper.
- Produces: `spreads.year`, thirteen positions, `shape: 'year'`. Position 0 is the theme at the centre; positions 1 to 12 are the twelve months, clockwise from the top.

The months are **not** named in the position copy, because which month each one is depends on when the reading was dealt. Position names are "The first month ahead" through "The twelfth month ahead"; Task 6 renders the calendar labels over them.

- [ ] **Step 1: Write the failing test**

Append to `tests/tarot-readings.test.cjs`:

```js
test('the year spread is a theme at the centre with twelve months clockwise from the top', () => {
  const spread = Tarot.spreads.year;
  assert.equal(spread.positions.length, 13);
  assert.equal(spread.shape, 'year');
  const [theme, ...months] = spread.positions;
  assert.equal(theme.x, 50);
  assert.equal(theme.y, 50);
  assert.equal(months.length, 12);
  // Every month sits the same distance from the centre once the ellipse is normalised.
  const radii = months.map(p => Math.hypot((p.x - 50) / 36, (p.y - 50) / 38));
  for (const r of radii) assert.ok(Math.abs(r - 1) < 0.02, `a month is off the wheel (radius ${r})`);
  // The first month is at the top, and the wheel runs clockwise.
  assert.equal(months[0].x, 50);
  assert.ok(months[0].y < 50, 'the first month should be above the centre');
  assert.ok(months[3].x > 50 && Math.abs(months[3].y - 50) < 1, 'the fourth month should be due right');
  assert.ok(months[6].x === 50 && months[6].y > 50, 'the seventh month should be at the bottom');
  assert.ok(months[9].x < 50 && Math.abs(months[9].y - 50) < 1, 'the tenth month should be due left');
  assert.ok(spread.advice === 0 && spread.outcome === 12);
});

test('the year spread deals thirteen distinct cards, and does so from the majors alone', () => {
  for (let seed = 0; seed < 40; seed++) {
    const draw = Tarot.deal('year', cards, seeded(seed), '', 'general');
    assert.equal(draw.cards.length, 13);
    assert.equal(new Set(draw.cards.map(c => c.index)).size, 13);
  }
  // Thirteen from twenty-two must still work, which is the tightest the major-only option gets.
  const majors = Tarot.deal('year', cards, seeded(3), '', 'general', {majorsOnly: true});
  assert.equal(majors.cards.length, 13);
  for (const c of majors.cards) assert.ok(c.index <= 21);
});

test('every spread points advice and outcome at positions it actually has', () => {
  // Now that six spreads exist, this is a cross-spread invariant rather than a per-spread check.
  // reportHTML reads spread.positions[spread.advice] directly, so an out-of-range index would
  // throw only once a reader revealed the whole spread.
  for (const [id, spread] of Object.entries(Tarot.spreads)) {
    assert.ok(Number.isInteger(spread.advice), `${id} has no advice index`);
    assert.ok(Number.isInteger(spread.outcome), `${id} has no outcome index`);
    assert.ok(spread.advice >= 0 && spread.advice < spread.positions.length, `${id} advice out of range`);
    assert.ok(spread.outcome >= 0 && spread.outcome < spread.positions.length, `${id} outcome out of range`);
    for (const [a, b, title] of spread.pairs) {
      assert.ok(a >= 0 && a < spread.positions.length, `${id} pair references position ${a}`);
      assert.ok(b >= 0 && b < spread.positions.length, `${id} pair references position ${b}`);
      assert.ok(typeof title === 'string' && title.length > 0, `${id} has an unlabelled pair`);
    }
  }
});

test('the year spread names no calendar month, because the months depend on the deal date', () => {
  const spread = Tarot.spreads.year;
  const text = spread.positions.map(p => `${p.name} ${p.short} ${p.lens} ${p.question}`).join(' ');
  for (const month of ['January','February','March','April','May','June','July','August','September','October','November','December']) {
    assert.ok(!text.includes(month), `${month} is named in the position copy`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/tarot-readings.test.cjs`
Expected: FAIL, `spreads.year` is undefined.

- [ ] **Step 3: Add the spread**

Insert into the `spreads` object after `relationship`. The month coordinates are a circle of horizontal radius 36 and vertical radius 38 about the centre, at thirty-degree steps from the top; they were computed rather than eyeballed and the test above re-derives them.

```js
    year: {
      name: 'The Year Ahead', subtitle: 'Thirteen cards · a theme and twelve months', shape:'year',
      description: 'A theme for the year sits at the centre, with one card for each of the twelve months ahead arranged around it.',
      tradition: 'A modern arrangement rather than an inherited one; twelve-month wheels are common in contemporary practice and no particular order is canonical, so this one is set out here. The wheel begins with the month after the reading, so it always covers the year in front of you. Each month is a theme to consider rather than a schedule of events.',
      pairs: [[0,1,'The theme and the month ahead'],[1,7,'Half a year apart'],[0,12,'The theme and the far end of the year']],
      advice: 0, outcome: 12,
      positions: [
        position('The year’s theme','Theme',50,50,'At the centre, this is the thread the year is asked to be read against. Let it colour the months around it rather than override them.','What would I like this year to be about, and is that what the card describes?'),
        position('The first month ahead','1st',50,12,'The month immediately after this reading. Read it as the near ground, the part you can already see the shape of.','What is already in motion here?'),
        position('The second month ahead','2nd',68,17.1,'Read this as the month the first one hands on to, and look for what it develops rather than what it introduces.','What does this continue?'),
        position('The third month ahead','3rd',81.2,31,'A quarter of the way round. Consider what the first three months have in common before reading this one alone.','What pattern have the first three made?'),
        position('The fourth month ahead','4th',86,50,'Opposite the tenth month on the wheel. This sits at the first turn, where an early direction usually either settles or is revised.','What would it cost to change direction here?'),
        position('The fifth month ahead','5th',81.2,69,'Read this as a middle month, the kind that rarely announces itself and often carries the actual work.','What might I be tempted to overlook here?'),
        position('The sixth month ahead','6th',68,82.9,'Approaching the halfway point. A useful place to ask what has changed since the theme at the centre was drawn.','What is different from what I expected at the start?'),
        position('The seventh month ahead','7th',50,88,'Directly opposite the first month, at the bottom of the wheel. Read it against that one: the two are the same distance from the year’s midpoint in either direction.','What looks different from here than it did at the beginning?'),
        position('The eighth month ahead','8th',32,82.9,'Past the midpoint, and the beginning of the return. Consider what is worth carrying into the remaining months and what is not.','What can I stop carrying?'),
        position('The ninth month ahead','9th',18.8,69,'Read this as a month of consolidation rather than of beginning, whatever the card holds.','What is nearly finished that deserves finishing properly?'),
        position('The tenth month ahead','10th',14,50,'Opposite the fourth month, at the far turn. What was decided there can usually be assessed here.','Was the direction I took at the first turn the right one?'),
        position('The eleventh month ahead','11th',18.8,31,'Near the close of the wheel. Read it for what it prepares rather than what it concludes.','What am I setting up without having decided to?'),
        position('The twelfth month ahead','12th',32,17.1,'The last month of the wheel, sitting beside the first. Read the two together: the year closes next to where it opened, not back at it.','What will have changed by the time this comes round?')
      ]
    },
```

- [ ] **Step 4: Add the layout block**

Append to `tarot-readings.css`:

```css
.tarot-layout-year { aspect-ratio: 100 / 96; }
.tarot-layout-year .tarot-place { width: 11%; }
.tarot-layout-year::after { left: 50%; top: 50%; width: 52%; }
.tarot-layout-year .tarot-cloth-mark { left: 50%; top: 50%; opacity: 0; }
```

The cloth mark is hidden on this layout because the theme card occupies the centre.

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot-readings.js tarot-readings.css tests/tarot-readings.test.cjs
git commit -m "feat(tarot): the year-ahead spread"
```

---

### Task 5: The deal date in the payload

**Files:**
- Modify: `tarot-readings.js` (`deal`, `validDraw`, `loadSpread`)
- Modify: `tests/tarot-readings.test.cjs`

**Interfaces:**
- Consumes: `spreads.year` from Task 4, `deal`'s options argument from Task 1.
- Produces: `deal` accepts `dealtAt` in its options and returns it on the draw **for the year spread only**; `validDraw` requires it there and rejects it nowhere else; `loadSpread` carries it into the replayed spread.

**Why this exists.** The year wheel's months are computed from when the reading was dealt. Without a stored date, a reading saved in March and reopened in September would silently relabel all twelve cards. The daily card payload already stores a `date`, so a date in a payload is an established pattern here.

**The half that matters most** is that the three existing spreads must keep validating without it. Every tarot spread already saved by a reader has no `dealtAt`, and a validator that started demanding one would make all of them unreplayable.

- [ ] **Step 1: Write the failing test**

Append to `tests/tarot-readings.test.cjs`:

```js
test('a year draw carries the date it was dealt, and the other spreads do not', () => {
  const year = Tarot.deal('year', cards, seeded(5), '', 'general', {dealtAt: '2026-03-09'});
  assert.equal(year.dealtAt, '2026-03-09');
  const celtic = Tarot.deal('celtic', cards, seeded(5), '', 'general', {dealtAt: '2026-03-09'});
  assert.equal(celtic.dealtAt, undefined, 'only the year spread should carry a deal date');
});

test('validDraw requires a deal date on a year draw and never on the others', () => {
  const year = Tarot.deal('year', cards, seeded(6), '', 'general', {dealtAt: '2026-03-09'});
  assert.ok(Tarot.validDraw(year, cards.length));
  const {dealtAt, ...dateless} = year;
  assert.equal(Tarot.validDraw(dateless, cards.length), false, 'a year draw with no date must be rejected');
  assert.equal(Tarot.validDraw({...year, dealtAt: 'March'}, cards.length), false, 'a malformed date must be rejected');
  // The half that matters: everything already saved has no dealtAt and must keep working.
  for (const id of ['celtic', 'horseshoe', 'three']) {
    const draw = Tarot.deal(id, cards, seeded(2), 'q', 'general');
    assert.equal(draw.dealtAt, undefined);
    assert.ok(Tarot.validDraw(draw, cards.length), `${id} must still validate without a deal date`);
  }
});

test('loadSpread carries the deal date through a replay', () => {
  const year = Tarot.deal('year', cards, seeded(8), 'q', 'general', {dealtAt: '2026-03-09'});
  const loaded = Tarot.loadSpread(year, cards.length);
  assert.equal(loaded.spread.dealtAt, '2026-03-09');
  assert.equal(loaded.revealed.size, 13);
  const celtic = Tarot.loadSpread(Tarot.deal('celtic', cards, seeded(8), 'q', 'general'), cards.length);
  assert.equal(celtic.spread.dealtAt, undefined);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/tarot-readings.test.cjs`
Expected: FAIL, `year.dealtAt` is `undefined` because `deal` does not read it yet.

- [ ] **Step 3: Return the date from `deal`**

In the `deal` function, destructure it alongside the other options and attach it only for the spread that needs it. Change the destructure and the return:

```js
    const {reversals = true, majorsOnly = false, dealtAt = ''} = options;
```

and, immediately before the existing `return`, build the draw and add the field conditionally:

```js
    const draw = {id,question:String(question).trim().slice(0,240),focus:Object.hasOwn(focuses,focus)?focus:'general',cards:order.slice(0,spread.positions.length).map(index=>({index,orientation:reversals&&randomInt(5)===0?'reversed':'upright'}))};
    // Only the year wheel's meaning depends on when it was dealt, so only it stores the date.
    // Attaching it to every draw would put an unused field in every payload already saved.
    if (id === 'year') draw.dealtAt = String(dealtAt);
    return draw;
```

- [ ] **Step 4: Require it in `validDraw`**

`validDraw` currently ends with a single `return` combining its remaining checks. Add the date rule to it:

```js
    if (draw.id === 'year') {
      if (typeof draw.dealtAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(draw.dealtAt)) return false;
    } else if (draw.dealtAt !== undefined) {
      return false;
    }
    return typeof draw.question === 'string' && draw.question.length <= 240 && Object.hasOwn(focuses, draw.focus);
```

- [ ] **Step 5: Carry it through `loadSpread`**

In `loadSpread`, the returned `spread` object is built explicitly. Add the field when it is present:

```js
    const spread = {id: payload.id, question: payload.question, focus: payload.focus, cards: spreadCards};
    if (payload.dealtAt) spread.dealtAt = payload.dealtAt;
    return {spread, revealed: new Set(spreadCards.map((_, slot) => slot))};
```

- [ ] **Step 6: Run the whole suite**

Run: `node --test tests/*.test.cjs`
Expected: PASS. The pre-existing `validDraw` and `loadSpread` tests must still pass — they are what proves the existing spreads were not caught by the new rule.

- [ ] **Step 7: Prove the backwards-compatibility half binds**

Temporarily change the `validDraw` rule to demand `dealtAt` on every spread rather than only on `year`, run the suite, and confirm the pre-existing round-trip tests fail alongside the new one. Restore it and confirm green. This is the specific regression that would make every saved tarot reading unreplayable, so it must be seen to be caught.

- [ ] **Step 8: Commit**

```bash
git add tarot-readings.js tests/tarot-readings.test.cjs
git commit -m "feat(tarot): store the deal date on a year reading"
```

---

### Task 6: The draws on screen

**Files:**
- Modify: `tarot.js:189` and `tarot.js:356` (the two `TarotReadings.deal` calls)
- Modify: `tarot/index.html` (the `#tarot-settings` block, and cache keys)
- Modify: `tarot-readings.css`

**Interfaces:**
- Consumes: `spreads.question`, `spreads.relationship`, `spreads.year`; `deal(..., options)` with `reversals`, `majorsOnly` and `dealtAt`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Add the three spreads and the two toggles to the page**

In `tarot/index.html`, replace the spread select's options so all six appear, shortest first:

```html
<select id="tarot-spread"><option value="question">One card &amp; a question · 1 card</option><option value="three">Past, Present &amp; Possibility · 3 cards</option><option value="horseshoe">Horseshoe · 7 cards</option><option value="relationship">Relationship · 7 cards</option><option value="celtic" selected>Celtic Cross · 10 cards</option><option value="year">The Year Ahead · 13 cards</option></select>
```

`celtic` carries `selected` because it is the current default and the room must not change what it deals for a returning reader.

Add the two toggles after the focus label and before the question label:

```html
<fieldset class="tarot-options">
  <legend>Options for this deal</legend>
  <label><input type="checkbox" id="tarot-reversals" checked> Include reversed cards</label>
  <label><input type="checkbox" id="tarot-majors"> Major Arcana only</label>
</fieldset>
```

Update the settings note to mention them:

```html
<p id="tarot-settings-note" class="tarot-settings-note">Choose your spread, focus and question, then use Shuffle &amp; deal to begin a fresh reading. The options apply to the next deal and are not saved. Your question stays on this page.</p>
```

- [ ] **Step 2: Bump the cache keys**

In `tarot/index.html`, bump `tarot-readings.js`, `tarot-readings.css` and `tarot.js` to their next values. Check the whole file for any other reference to each and bump every one. Record in your report what each key was and became.

- [ ] **Step 3: Pass the options when dealing**

In `tarot.js`, both `TarotReadings.deal(...)` calls take the same new sixth argument. Add a helper next to them:

```js
  const dealOptions = () => ({
    reversals: document.querySelector("#tarot-reversals")?.checked !== false,
    majorsOnly: document.querySelector("#tarot-majors")?.checked === true,
    dealtAt: localDateKey()
  });
```

and pass `dealOptions()` as the sixth argument at both call sites. `localDateKey` is already imported at the top of `tarot.js` from `BirthLore`. The `?.` and the `!== false` default mean a missing checkbox behaves as reversals-on, matching the engine default.

- [ ] **Step 4: Label the year wheel's months**

The year spread's positions are named "The first month ahead" and so on, deliberately, because the calendar month depends on the deal date. Render the calendar label over the short label for that spread. Add to `tarot.js`:

```js
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  // dealtAt is a local YYYY-MM-DD key. The wheel starts with the month AFTER it, so month+i
  // indexes the following month directly: for a September deal, month is 9 and MONTH_NAMES[9]
  // is October. Math.floor(m / 12) carries the year over at the December boundary.
  function yearMonthLabels(dealtAt) {
    const [year, month] = String(dealtAt).split("-").map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(month)) return [];
    return Array.from({length: 12}, (_, i) => {
      const m = month + i;
      return `${MONTH_NAMES[m % 12]} ${year + Math.floor(m / 12)}`;
    });
  }
```

The engine renders the short label from `spread.positions[i].short` and knows nothing about dates, which is correct — it is a pure module. So `tarot.js` overrides the twelve month labels after each render. Add:

```js
  // The engine renders each position button as <span>N</span>{short}<small>Turn over</small>, so
  // the short label is the text node at childNodes[1]. The aria-label has to be rewritten too, or
  // a screen reader still hears "The first month ahead" while the page shows "October 2026".
  // Index 0 is the theme at the centre and is left alone; the twelve months follow it.
  function applyYearMonthLabels() {
    if (!currentSpread || currentSpread.id !== "year") return;
    const labels = yearMonthLabels(currentSpread.dealtAt);
    if (labels.length !== 12) return;   // a malformed date leaves the ordinals in place
    const places = readingOutput.querySelectorAll(".tarot-table-label");
    const buttons = readingOutput.querySelectorAll("[data-tarot-position]");
    labels.forEach((label, i) => {
      const place = places[i + 1];
      if (place) place.textContent = label;
      const button = buttons[i + 1];
      if (!button) return;
      if (button.childNodes[1]) button.childNodes[1].textContent = label;
      button.setAttribute("aria-label", `Reveal ${i + 2}: ${label}`);
    });
  }
```

Call `applyYearMonthLabels()` immediately after every write to `readingOutput.innerHTML` in the spread path, so the labels survive a re-render from revealing a card as well as a fresh deal. There are two such writes; both need it.

A malformed or missing date leaves the ordinal labels in place rather than blanking them, which is why the guard returns instead of writing empty strings.

- [ ] **Step 5: Style the two new controls**

Append to `tarot-readings.css`:

```css
.tarot-options { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0; padding: 10px 12px; border: 1px solid #d0a76b40; border-radius: 8px; }
.tarot-options legend { padding: 0 6px; color: #e1caac; font-size: 12px; }
.tarot-options label { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
.tarot-options input { accent-color: #d0a76b; width: 16px; height: 16px; }
```

- [ ] **Step 6: Verify in the browser**

Start the site preview and open `http://localhost:8099/tarot/`, then the Full reading tab. Confirm each of these:

- All six spreads are listed and the Celtic Cross is selected by default.
- Dealing the one-card draw lays two cards and reveals them independently.
- Dealing the relationship spread lays seven, with the two people facing each other and the connection between them.
- Dealing the year spread lays thirteen in a wheel with the theme at the centre, and the twelve labels read as calendar months starting with **next** month, not this one.
- Unticking "Include reversed cards" and dealing repeatedly produces no reversed card.
- Ticking "Major Arcana only" and dealing the year spread produces thirteen majors.
- The daily card is unaffected by both toggles.
- Reveal next, Reveal all, the numbered position buttons and Enlarge all work on the year wheel.
- No horizontal overflow at 390px, and the layout holds at 1400px.
- No console errors originate from the tarot files.

- [ ] **Step 7: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot.js tarot/index.html tarot-readings.css
git commit -m "feat(tarot): deal the new spreads and honour the reading options"
```

---

### Task 7: The voice gate and the docs

**Files:**
- Modify: `tests/tarot-voice.test.cjs`
- Modify: `docs/FULL-READINGS.md`

**Interfaces:**
- Consumes: everything built in Tasks 1 to 6.
- Produces: nothing code depends on.

- [ ] **Step 1: Confirm the voice gate already covers the new copy**

`tests/tarot-voice.test.cjs` scans `TarotReadings.spreads` for every spread's `description` and `tradition`, and each position's `lens` and `question`. The three new spreads are in that table, so they are already in scope. Run it and confirm it passes:

Run: `node --test tests/tarot-voice.test.cjs`
Expected: PASS.

- [ ] **Step 2: Prove the new copy is actually reached**

Temporarily append `' You will meet someone this week.'` to `spreads.year.description`, run the test, and confirm it fails naming the Year Ahead. Remove it and confirm green. Report the failure message. A gate that was written before this copy existed must be shown to reach it.

- [ ] **Step 3: Add a test that the one-card draw stays answerless**

The general gate scans for outcome phrases. The one-card draw needs a rule of its own, because the risk there is a verdict rather than a forecast. Append to `tests/tarot-voice.test.cjs`:

```js
test('the one-card draw never offers an answer or a lean', () => {
  const spread = require('../tarot-readings.js').spreads.question;
  const text = `${spread.name} ${spread.subtitle} ${spread.description} ${spread.tradition} ${spread.positions.map(p => `${p.name} ${p.short} ${p.lens} ${p.question}`).join(' ')}`.toLowerCase();
  for (const phrase of ['yes or no', 'a yes', 'a no', 'leans toward', 'leans away', 'the answer is', 'says yes', 'says no', 'confirms', 'rules out']) {
    assert.ok(!text.includes(phrase), `"${phrase}" appears in the one-card draw copy`);
  }
});
```

Run it, then prove it binds by temporarily adding `' The upright card leans toward a yes.'` to the spread's description and confirming the failure.

- [ ] **Step 4: Document the three layouts and the two options**

In `docs/FULL-READINGS.md`, extend the Layouts section with the three new spreads, following the shape of the existing entries: the position order, and where the order comes from. For the relationship and year spreads, say plainly that they are modern arrangements with no canonical source and that the order is stated on the page — do not attribute them to anyone.

For the one-card draw, record that it offers no answer and no lean, and why: reversals are one in five, so an orientation-based lean would have read "leans toward" about eighty per cent of the time.

Add a short Options section covering the two toggles, that they are page-only with no storage, that they apply to the next deal, and that the daily card is deliberately unaffected because it is seeded by date.

Update the Verification section's test count.

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tests/tarot-voice.test.cjs docs/FULL-READINGS.md
git commit -m "docs: the new tarot layouts and reading options"
```

---

## Notes for the executor

- **Stop the dev preview servers before any merge.** This repo lives on the `V:` network drive and a running static server holds the tree open, which makes `git merge --squash` fail with `Permission denied`.
- **Never `git add -A`.** Two large untracked PNGs sit in `output/imagegen/` and have twice been swept into commits. Stage the named files each task lists.
- **`window.X` guards do not work here.** A top-level `const` in a classic script is a script-scope binding, not a property of `window`. Guard bare identifiers with `typeof`.
- **No backend work exists in this plan.** If a task seems to need a journal kind or a migration, that is a misreading — re-read the Global Constraints.
- The full suite before this plan starts is 439 passing. Report the count after each task that adds tests.
