# Tarot card reference (C2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 78 tarot cards a standalone reference paragraph and a sourced Golden Dawn attribution, shown in the card detail dialog the deck browser already opens.

**Architecture:** One new pure UMD data module, `tarot-reference.js`, keyed by the canonical card index that the card images already use. It carries the 78 reference paragraphs and derives the attributions rather than transcribing them. The existing "Explore deck" tab becomes the card reference; the existing detail dialog grows a reference block. No existing card data moves.

**Tech Stack:** Vanilla ES2020 in plain `<script>` tags, no build step, no bundler. UMD modules that attach a global in the browser and `module.exports` under Node. Tests are `node --test tests/*.test.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-13-tarot-reference-design.md`

## Global Constraints

Exact values, copied from the spec and from Part E of the program spec. Every task's requirements implicitly include this section.

- **Canonical card index:** 0 to 21 are the Major Arcana in order; 22 to 77 are the minors grouped `Wands`, `Cups`, `Swords`, `Pentacles`, each `Ace` through `King`. This is fixed by every deck's `cards/NN.jpg` filenames. Never reorder it.
- **No existing card data moves.** The majors stay in `birth-lore.js`, the minor scaffolding in `tarot.js`, the per-minor text in `tarot-readings.js`. Do not create `tarot-data.js`. Do not refactor the reading engine.
- **Reference copy must not describe any one deck's artwork.** The site ships four decks with different imagery. Entries describe what the card holds, never what is pictured.
- **Voice:** symbolic reflection. No predictions, no "you will" about outcomes, no luck or fortune framing, no verdicts.
- **Attribution system:** Golden Dawn, with Waite's numbering. Strength is VIII and takes Leo; Justice is XI and takes Libra.
- **No new dependencies.** Open source only, and nothing new here.
- **No new journal kind.** Do not touch `server/ishtar/readings/kinds.py` or `rooms.js`.
- **Every engine is a pure UMD module** tested with `node --test tests/*.test.cjs`. No DOM in `tarot-reference.js`.
- **Cache keys** bumped on every changed file, on every page that loads it.
- **Accessibility:** keyboard operable, `aria-expanded`/`aria-controls` on disclosures, reduced motion respected, layout verified at 390px and 1400px.
- **Commits** end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

### The writing brief

Binding on every reference entry written in Tasks 7 through 11.

- One paragraph per card, **400 to 750 characters**. Not two paragraphs, not a list.
- **Never describe artwork.** Four decks ship with this site and their imagery differs. Write what the card holds, not what is pictured. A sentence beginning "the figure in the foreground" is a defect in this codebase even though it would be unremarkable on most tarot sites.
- **Must not paraphrase the card's own reading copy.** The entry exists precisely because the upright and reversed text is written for a card in a spread position. Read `card.upright` and `card.reversed` first, then write something that is not those sentences rearranged. Task 11 adds a mechanical four-word-run check, but it only catches literal reuse.
- **Reflection, not prediction.** No outcome the reader does not control. The card is a lens, not a forecast. `tests/tarot-voice.test.cjs` is the gate and it must pass.
- The attribution may be alluded to where it earns its place, for instance Saturn's weight in Leo behind the Five of Wands. It must never be stated as a fact about the reader.
- **Each entry must be distinct from every other** in substance, not merely in wording. Ten cards that each say a version of "this card asks you to pause" is the failure mode of writing 78 of anything.
- British spelling, matching the rest of the site.

## File Structure

| File | Responsibility |
|---|---|
| `tarot-reference.js` | Create. Card identity (names, slugs), the derived attributions, the 78 reference paragraphs. Pure data and arithmetic, no DOM. |
| `tests/tarot-reference.test.cjs` | Create. Identity, slug round-trip, and the literal expected attribution tables. |
| `tests/tarot-voice.test.cjs` | Create. The forbidden-phrase scan over new reference copy and existing reading copy. |
| `tarot.js` | Modify. Reference block in the detail dialog, tab rename, `?card=` handling. |
| `tarot-readings.css` | Modify. Styles for the reference block and the About disclosure. |
| `tarot/index.html` | Modify. Script tag, tab label, About disclosure, cache keys. |
| `docs/TAROT-REFERENCE.md` | Create. Conventions, sources, the Waite ordering note. |
| `docs/SITE-STRUCTURE.md` | Modify. Script order for `/tarot/`. |

Tasks 1 through 3 build the module. Task 4 puts the voice gate in place. Tasks 5 and 6 put the reference on screen. Tasks 7 through 11 write the copy in batches against a working surface and a passing gate. Task 12 documents it.

---

### Task 1: Module skeleton, card identity and slugs

**Files:**
- Create: `tarot-reference.js`
- Create: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `TarotReference.MAJOR_NAMES` — array of 22 strings.
  - `TarotReference.SUITS` — `['Wands', 'Cups', 'Swords', 'Pentacles']`.
  - `TarotReference.RANKS` — `['Ace', 'Two', ... 'Ten', 'Page', 'Knight', 'Queen', 'King']`, 14 entries.
  - `TarotReference.name(index)` — string, `''` for an out-of-range index.
  - `TarotReference.slug(index)` — string, `''` for an out-of-range index.
  - `TarotReference.indexForSlug(slug)` — integer 0 to 77, or `-1`.

- [ ] **Step 1: Write the failing test**

Create `tests/tarot-reference.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const R = require('../tarot-reference.js');

// The real 78-card catalogue, built without booting the DOM application.
// Same harness as tests/tarot-readings.test.cjs.
const source = fs.readFileSync(require.resolve('../tarot.js'), 'utf8');
const catalogue = source.slice(source.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(catalogue + '\ntarotCards', {
  TarotReadings: require('../tarot-readings.js'),
  majorArcana: require('../birth-lore.js').majorArcana
});

test('the reference names the same 78 cards, in the same order, as the real catalogue', () => {
  assert.equal(cards.length, 78, 'the catalogue itself changed size');
  for (let i = 0; i < 78; i++) {
    assert.equal(R.name(i), cards[i].name, `index ${i} disagrees with the catalogue`);
  }
  assert.equal(R.name(-1), '');
  assert.equal(R.name(78), '');
});

test('every card has a slug that round-trips back to its index', () => {
  const seen = new Set();
  for (let i = 0; i < 78; i++) {
    const slug = R.slug(i);
    assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `index ${i} produced the slug "${slug}"`);
    assert.ok(!seen.has(slug), `slug "${slug}" is used twice`);
    seen.add(slug);
    assert.equal(R.indexForSlug(slug), i);
  }
  assert.equal(R.indexForSlug('not-a-card'), -1);
  assert.equal(R.indexForSlug(''), -1);
  assert.equal(R.indexForSlug(null), -1);
});

test('slugs are the ones the URLs will use', () => {
  assert.equal(R.slug(0), 'the-fool');
  assert.equal(R.slug(10), 'wheel-of-fortune');
  assert.equal(R.slug(21), 'the-world');
  assert.equal(R.slug(22), 'ace-of-wands');
  assert.equal(R.slug(35), 'king-of-wands');
  assert.equal(R.slug(36), 'ace-of-cups');
  assert.equal(R.slug(77), 'king-of-pentacles');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: FAIL, `Cannot find module '../tarot-reference.js'`.

- [ ] **Step 3: Write the module**

Create `tarot-reference.js`. Follow the UMD wrapper used by `sky-calendar-text.js`:

```js
/* Standalone reference entries and traditional attributions for all 78 cards.
   The reading copy in birth-lore.js and tarot-readings.js is written for a card in a
   spread position; this module is what a card means on its own. Attributions follow the
   Golden Dawn with Waite's numbering; see docs/TAROT-REFERENCE.md for sources.
   Pure data and arithmetic - no DOM, no logic beyond the derivations documented here. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TarotReference = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Index 0-21, character-identical to BirthLore.majorArcana's names, pinned by a test.
  const MAJOR_NAMES = [
    'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
    'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
    'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
    'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
  ];

  // Suit order is the one the card images use: cards/22.jpg is the Ace of Wands.
  const SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];
  const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                 'Ten', 'Page', 'Knight', 'Queen', 'King'];

  const inRange = index => Number.isInteger(index) && index >= 0 && index < 78;

  function name(index) {
    if (!inRange(index)) return '';
    if (index < 22) return MAJOR_NAMES[index];
    const offset = index - 22;
    return `${RANKS[offset % 14]} of ${SUITS[Math.floor(offset / 14)]}`;
  }

  const slug = index => name(index).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const slugs = new Map();
  for (let i = 0; i < 78; i++) slugs.set(slug(i), i);
  const indexForSlug = value => (typeof value === 'string' && slugs.has(value) ? slugs.get(value) : -1);

  return {MAJOR_NAMES, SUITS, RANKS, name, slug, indexForSlug};
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Prove the catalogue test binds**

Temporarily change `'The Hermit'` to `'The Hermits'` in `MAJOR_NAMES`, run the test, and confirm it fails with `index 9 disagrees with the catalogue`. Change it back and confirm it passes again. A name list that silently drifts from the real catalogue is the failure this test exists to catch, so it must be shown to catch it.

- [ ] **Step 6: Commit**

```bash
git add tarot-reference.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): card identity and slugs for the reference module"
```

---

### Task 2: The 36 pip attributions, derived and pinned

**Files:**
- Modify: `tarot-reference.js`
- Modify: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: `name(index)`, `SUITS`, `RANKS` from Task 1.
- Produces: `TarotReference.attribution(index)` returning, for the 36 pip cards (ranks Two through Ten), `{line, kind: 'decan', sign, ruler}` where `line` is `"<ruler> in <sign>"`. Returns `null` for every other index until Task 3 fills them in.

**Background the implementer needs.** The Golden Dawn assigns the 36 pip cards to the 36 decans of the zodiac. The decan rulers run in Chaldean order beginning with Mars at 0 Aries. That exact sequence already exists in this repo as `faceOrder` in `classical-engine.js`, where it serves the essential dignity of face. Rather than typing 36 attributions, derive them, and pin the result with a literal table in the test. A derivation checked only against itself proves nothing.

- [ ] **Step 1: Write the failing test**

Append to `tests/tarot-reference.test.cjs`:

```js
// The traditional table, written out so the derivation is pinned to something
// other than itself. Golden Dawn decan attributions for the 36 pip cards.
const PIPS = [
  ['Two of Wands', 'Mars', 'Aries'], ['Three of Wands', 'Sun', 'Aries'], ['Four of Wands', 'Venus', 'Aries'],
  ['Five of Pentacles', 'Mercury', 'Taurus'], ['Six of Pentacles', 'Moon', 'Taurus'], ['Seven of Pentacles', 'Saturn', 'Taurus'],
  ['Eight of Swords', 'Jupiter', 'Gemini'], ['Nine of Swords', 'Mars', 'Gemini'], ['Ten of Swords', 'Sun', 'Gemini'],
  ['Two of Cups', 'Venus', 'Cancer'], ['Three of Cups', 'Mercury', 'Cancer'], ['Four of Cups', 'Moon', 'Cancer'],
  ['Five of Wands', 'Saturn', 'Leo'], ['Six of Wands', 'Jupiter', 'Leo'], ['Seven of Wands', 'Mars', 'Leo'],
  ['Eight of Pentacles', 'Sun', 'Virgo'], ['Nine of Pentacles', 'Venus', 'Virgo'], ['Ten of Pentacles', 'Mercury', 'Virgo'],
  ['Two of Swords', 'Moon', 'Libra'], ['Three of Swords', 'Saturn', 'Libra'], ['Four of Swords', 'Jupiter', 'Libra'],
  ['Five of Cups', 'Mars', 'Scorpio'], ['Six of Cups', 'Sun', 'Scorpio'], ['Seven of Cups', 'Venus', 'Scorpio'],
  ['Eight of Wands', 'Mercury', 'Sagittarius'], ['Nine of Wands', 'Moon', 'Sagittarius'], ['Ten of Wands', 'Saturn', 'Sagittarius'],
  ['Two of Pentacles', 'Jupiter', 'Capricorn'], ['Three of Pentacles', 'Mars', 'Capricorn'], ['Four of Pentacles', 'Sun', 'Capricorn'],
  ['Five of Swords', 'Venus', 'Aquarius'], ['Six of Swords', 'Mercury', 'Aquarius'], ['Seven of Swords', 'Moon', 'Aquarius'],
  ['Eight of Cups', 'Saturn', 'Pisces'], ['Nine of Cups', 'Jupiter', 'Pisces'], ['Ten of Cups', 'Mars', 'Pisces']
];

test('all 36 pip attributions match the traditional table', () => {
  assert.equal(PIPS.length, 36);
  const byName = new Map();
  for (let i = 0; i < 78; i++) {
    const a = R.attribution(i);
    if (a && a.kind === 'decan') byName.set(R.name(i), a);
  }
  assert.equal(byName.size, 36, 'exactly the 36 pip cards should carry a decan');
  for (const [card, ruler, sign] of PIPS) {
    const a = byName.get(card);
    assert.ok(a, `${card} has no decan attribution`);
    assert.equal(a.ruler, ruler, `${card} ruler`);
    assert.equal(a.sign, sign, `${card} sign`);
    assert.equal(a.line, `${ruler} in ${sign}`, `${card} line`);
  }
});

test('the derived decan rulers agree with the classical engine', () => {
  // classical-engine.js already carries the Chaldean face order and is covered by the
  // horary tests. If these two ever disagree, one of them has been edited wrongly.
  const faceRuler = require('../classical-engine.js').faceRuler;
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  for (let i = 0; i < 78; i++) {
    const a = R.attribution(i);
    if (!a || a.kind !== 'decan') continue;
    const signIndex = signs.indexOf(a.sign);
    const decan = PIPS.findIndex(p => p[0] === R.name(i)) % 3;
    assert.equal(a.ruler, faceRuler(signIndex, decan * 10 + 5), `${R.name(i)} disagrees with classical-engine`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: FAIL, `R.attribution is not a function`.

- [ ] **Step 3: Write the derivation**

Add to `tarot-reference.js`, before the `return`:

```js
  // Chaldean order of the decan rulers from Mars at 0 Aries, identical to
  // classical-engine.js's faceOrder, which a test cross-checks.
  const FACE_ORDER = ['Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter'];
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // The Golden Dawn runs the 36 pips through the zodiac from Aries. Each sign takes its
  // element's suit, and the rank base cycles 2, 5, 8 as the signs advance, so Aries takes
  // Wands 2-4, Taurus takes Pentacles 5-7, Gemini takes Swords 8-10, and so on round.
  const SUIT_OF_ELEMENT = ['Wands', 'Pentacles', 'Swords', 'Cups']; // fire, earth, air, water
  const decans = new Map(); // card index -> {sign, ruler}
  for (let sign = 0; sign < 12; sign++) {
    const suit = SUIT_OF_ELEMENT[sign % 4];
    const base = 2 + 3 * (sign % 3);
    for (let decan = 0; decan < 3; decan++) {
      // RANKS[1] is 'Two', so a rank NUMBER n sits at RANKS index n - 1.
      const index = 22 + SUITS.indexOf(suit) * 14 + (base + decan - 1);
      decans.set(index, {sign: SIGNS[sign], ruler: FACE_ORDER[(sign * 3 + decan) % 7]});
    }
  }

  function attribution(index) {
    if (!inRange(index)) return null;
    const decan = decans.get(index);
    if (decan) return {line: `${decan.ruler} in ${decan.sign}`, kind: 'decan', ...decan};
    return null;
  }
```

Verify the arithmetic lands where you expect before moving on: index 23 must be the Two of Wands with Mars in Aries, index 26 the Five of Wands with Saturn in Leo, and indices 22, 50, 64 and 77 (the aces and the King of Pentacles) must carry no decan at all. The map must hold exactly 36 entries, none outside 22 to 77.

- [ ] **Step 4: Export it**

Change the module's return to:

```js
  return {MAJOR_NAMES, SUITS, RANKS, name, slug, indexForSlug, attribution};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: PASS, 5 tests.

- [ ] **Step 6: Prove the pinning test binds**

Temporarily change `FACE_ORDER` to start `['Sun', 'Mars', ...]`, run the test, and confirm **both** new tests fail: the literal table and the classical-engine cross-check. Restore it. If only one fails, the other is not actually checking what it claims.

- [ ] **Step 7: Commit**

```bash
git add tarot-reference.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): derive the 36 Golden Dawn pip attributions"
```

---

### Task 3: Ace, court and major attributions

**Files:**
- Modify: `tarot-reference.js`
- Modify: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: `attribution(index)` from Task 2, which currently returns `null` for the 42 non-pip cards.
- Produces: `attribution(index)` non-null for all 78. Shapes:
  - aces: `{line, kind: 'ace', element}` where `line` is `"The root of the powers of Fire"`.
  - courts: `{line, kind: 'court', element}` where `line` is `"Water of Fire"`.
  - majors: `{line, kind: 'major', letter, sign?, ruler?, element?}` where `line` is the planet, sign or element name.

- [ ] **Step 1: Write the failing test**

Append to `tests/tarot-reference.test.cjs`:

```js
test('every card has an attribution and each kind has the fields it claims', () => {
  const counts = {decan: 0, ace: 0, court: 0, major: 0};
  for (let i = 0; i < 78; i++) {
    const a = R.attribution(i);
    assert.ok(a, `${R.name(i)} (index ${i}) has no attribution`);
    assert.ok(a.line && a.line.length > 2, `${R.name(i)} has an empty line`);
    counts[a.kind]++;
    if (a.kind === 'decan') { assert.ok(a.sign); assert.ok(a.ruler); }
    if (a.kind === 'ace' || a.kind === 'court') assert.ok(a.element);
    if (a.kind === 'major') assert.ok(a.letter, `${R.name(i)} has no Hebrew letter`);
  }
  assert.deepEqual(counts, {decan: 36, ace: 4, court: 16, major: 22});
});

test('aces take the root of their element and courts the element-of-element form', () => {
  assert.equal(R.attribution(22).line, 'The root of the powers of Fire');   // Ace of Wands
  assert.equal(R.attribution(36).line, 'The root of the powers of Water');  // Ace of Cups
  assert.equal(R.attribution(50).line, 'The root of the powers of Air');    // Ace of Swords
  assert.equal(R.attribution(64).line, 'The root of the powers of Earth');  // Ace of Pentacles
  // King fire, Queen water, Knight air, Page earth, each over its suit's element.
  assert.equal(R.attribution(35).line, 'Fire of Fire');   // King of Wands
  assert.equal(R.attribution(34).line, 'Water of Fire');  // Queen of Wands
  assert.equal(R.attribution(33).line, 'Air of Fire');    // Knight of Wands
  assert.equal(R.attribution(32).line, 'Earth of Fire');  // Page of Wands
  assert.equal(R.attribution(76).line, 'Water of Earth'); // Queen of Pentacles
});

test('the majors follow Waite: Strength is VIII with Leo, Justice is XI with Libra', () => {
  const strength = R.attribution(8);
  assert.equal(R.name(8), 'Strength');
  assert.equal(strength.sign, 'Leo');
  assert.equal(strength.letter, 'Teth');
  const justice = R.attribution(11);
  assert.equal(R.name(11), 'Justice');
  assert.equal(justice.sign, 'Libra');
  assert.equal(justice.letter, 'Lamed');
  // Waite, not Crowley: The Emperor keeps Heh and Aries, The Star keeps Tzaddi and Aquarius.
  assert.equal(R.attribution(4).letter, 'Heh');
  assert.equal(R.attribution(4).sign, 'Aries');
  assert.equal(R.attribution(17).letter, 'Tzaddi');
  assert.equal(R.attribution(17).sign, 'Aquarius');
  // The three elemental majors carry an element, not a sign or planet.
  assert.equal(R.attribution(0).element, 'Air');    // The Fool
  assert.equal(R.attribution(12).element, 'Water'); // The Hanged Man
  assert.equal(R.attribution(20).element, 'Fire');  // Judgement
  // Every Hebrew letter is used exactly once across the 22.
  const letters = Array.from({length: 22}, (_, i) => R.attribution(i).letter);
  assert.equal(new Set(letters).size, 22);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: FAIL, `The Fool (index 0) has no attribution`.

- [ ] **Step 3: Add the three tables**

Add to `tarot-reference.js`, before `attribution`:

```js
  const SUIT_ELEMENT = {Wands: 'Fire', Cups: 'Water', Swords: 'Air', Pentacles: 'Earth'};
  // Waite's King, Queen, Knight and Page read as element-of-element. This is the form in
  // common use with Waite's deck; the Golden Dawn's own Knight, Queen, Prince and Princess
  // do not map one to one onto it, which docs/TAROT-REFERENCE.md states.
  const COURT_ELEMENT = {King: 'Fire', Queen: 'Water', Knight: 'Air', Page: 'Earth'};

  // Index 0-21. Golden Dawn attributions with Waite's numbering: Strength VIII takes Leo
  // and Justice XI takes Libra. The Crowley exchange of The Star and The Emperor is not used.
  const MAJORS = [
    {letter: 'Aleph',  element: 'Air'},        {letter: 'Beth',   ruler: 'Mercury'},
    {letter: 'Gimel',  ruler: 'Moon'},         {letter: 'Daleth', ruler: 'Venus'},
    {letter: 'Heh',    sign: 'Aries'},         {letter: 'Vau',    sign: 'Taurus'},
    {letter: 'Zain',   sign: 'Gemini'},        {letter: 'Cheth',  sign: 'Cancer'},
    {letter: 'Teth',   sign: 'Leo'},           {letter: 'Yod',    sign: 'Virgo'},
    {letter: 'Kaph',   ruler: 'Jupiter'},      {letter: 'Lamed',  sign: 'Libra'},
    {letter: 'Mem',    element: 'Water'},      {letter: 'Nun',    sign: 'Scorpio'},
    {letter: 'Samekh', sign: 'Sagittarius'},   {letter: 'Ayin',   sign: 'Capricorn'},
    {letter: 'Peh',    ruler: 'Mars'},         {letter: 'Tzaddi', sign: 'Aquarius'},
    {letter: 'Qoph',   sign: 'Pisces'},        {letter: 'Resh',   ruler: 'Sun'},
    {letter: 'Shin',   element: 'Fire'},       {letter: 'Tau',    ruler: 'Saturn'}
  ];
```

- [ ] **Step 4: Extend `attribution` to cover all 78**

Replace the `attribution` function written in Task 2 with:

```js
  function attribution(index) {
    if (!inRange(index)) return null;
    if (index < 22) {
      const major = MAJORS[index];
      return {line: major.sign || major.ruler || major.element, kind: 'major', ...major};
    }
    const decan = decans.get(index);
    if (decan) return {line: `${decan.ruler} in ${decan.sign}`, kind: 'decan', ...decan};
    const offset = index - 22;
    const element = SUIT_ELEMENT[SUITS[Math.floor(offset / 14)]];
    const rank = RANKS[offset % 14];
    if (rank === 'Ace') return {line: `The root of the powers of ${element}`, kind: 'ace', element};
    return {line: `${COURT_ELEMENT[rank]} of ${element}`, kind: 'court', element};
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: PASS, 8 tests.

- [ ] **Step 6: Run the whole suite**

Run: `node --test tests/*.test.cjs`
Expected: PASS. Report the total count; it should be the previous total plus 8.

- [ ] **Step 7: Commit**

```bash
git add tarot-reference.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): ace, court and major attributions in Waite's order"
```

---

### Task 4: The voice test

**Files:**
- Create: `tests/tarot-voice.test.cjs`

**Interfaces:**
- Consumes: `TarotReference.entry(index)` does not exist yet, so this task scans `REFERENCE` through a new export added here. Produces `TarotReference.REFERENCE`, an object keyed by card index whose values are reference paragraphs. It is empty until Task 7.
- Produces: a passing gate that every later copy batch must satisfy.

**Why this test cannot be copied from the sky section.** `tests/sky-calendar-text.test.cjs` uses `FORBIDDEN = ['you will', 'will happen', 'is going to', 'the answer is', 'luck', 'fortune']`. Run against today's tarot copy that list produces four hits and every one is correct text:

| Phrase | Where | Why it is fine |
|---|---|---|
| fortune | `Wheel of Fortune` | the card's name |
| luck | "instead of waiting for luck to do it" | the sentence rejects luck |
| the answer is | "The answer is taking shape beneath the noise" | it answers nothing |
| you will | "Decide what you will try and when you will stop" | the reader's own action |

Zero true positives against four false ones. Copy that list and the first person it blocks switches it off, and then the 78 new entries ship unchecked. The list below is phrases naming an **outcome**, never bare words, so a reader's own action never matches.

- [ ] **Step 1: Add the empty reference store to the module**

In `tarot-reference.js`, before the `return`:

```js
  // Standalone reference copy, keyed by card index. Filled in batches; see
  // docs/superpowers/plans/2026-09-13-tarot-reference.md. Every entry describes what the
  // card holds, never what any one deck pictures, because four decks ship with this site.
  const REFERENCE = {};

  const entry = index => (inRange(index)
    ? {reference: REFERENCE[index] || '', attribution: attribution(index)}
    : null);
```

and return `{MAJOR_NAMES, SUITS, RANKS, REFERENCE, name, slug, indexForSlug, attribution, entry}`.

- [ ] **Step 2: Write the test**

Create `tests/tarot-voice.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const R = require('../tarot-reference.js');

// Phrases that name an OUTCOME. Deliberately not bare words: "luck" and "fortune" both
// occur correctly in existing copy (the Wheel of Fortune is a card, and one line tells the
// reader not to wait for luck), and "you will" is correct when the verb is the reader's own
// action. See docs/superpowers/specs/2026-09-13-tarot-reference-design.md.
const FORBIDDEN = [
  'you will meet', 'you will receive', 'you will find', 'you will be given',
  'you will get', 'is going to happen', 'will happen to you',
  'the answer is yes', 'the answer is no', 'means yes', 'means no',
  'definitely will', 'certainly will', 'is destined to', 'guaranteed'
];

const scan = (text, where) => {
  const lower = String(text).toLowerCase();
  for (const phrase of FORBIDDEN) {
    assert.ok(!lower.includes(phrase), `"${phrase}" appears in ${where}`);
  }
};

const source = fs.readFileSync(require.resolve('../tarot.js'), 'utf8');
const catalogue = source.slice(source.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(catalogue + '\ntarotCards', {
  TarotReadings: require('../tarot-readings.js'),
  majorArcana: require('../birth-lore.js').majorArcana
});

test('no reference entry predicts an outcome or returns a verdict', () => {
  for (const [index, text] of Object.entries(R.REFERENCE)) {
    scan(text, `the reference entry for ${R.name(Number(index))}`);
  }
});

test('no existing reading copy predicts an outcome or returns a verdict', () => {
  // The card's own name is not scanned: "Wheel of Fortune" is a name, not a claim.
  for (const card of cards) {
    scan(`${card.upright} ${card.reversed} ${card.prompt} ${card.keywords}`, card.name);
  }
  const T = require('../tarot-readings.js');
  for (const spread of Object.values(T.spreads)) {
    scan(`${spread.description} ${spread.tradition}`, spread.name);
    for (const position of spread.positions) scan(`${position.lens} ${position.question}`, `${spread.name}: ${position.name}`);
  }
  for (const focus of Object.values(T.focuses)) scan(focus.lens, focus.label);
});
```

- [ ] **Step 3: Run the test**

Run: `node --test tests/tarot-voice.test.cjs`
Expected: PASS. Both tests pass immediately, the first because `REFERENCE` is empty and the second because the existing copy is already clean under this list. That is the intended state, and it is exactly why the next step is not optional.

- [ ] **Step 4: Prove the test binds, in both directions**

A test that passes the moment it is written has not been shown to work. Do both checks and report both results:

1. Temporarily add `R.REFERENCE[0] = 'You will meet someone this week.';` at the top of the first test. Run it. Expected: FAIL with `"you will meet" appears in the reference entry for The Fool`. Remove it.
2. Temporarily append `' The answer is yes.'` to one card's `upright` in the sandboxed catalogue. Run it. Expected: FAIL naming that card. Remove it.

If either check passes when it should fail, the scan is not reaching that text and the test is worthless. Fix it before continuing.

- [ ] **Step 5: Commit**

```bash
git add tarot-reference.js tests/tarot-voice.test.cjs
git commit -m "test(tarot): a voice gate written for tarot, not copied from sky"
```

---

### Task 5: The reference on screen

**Files:**
- Modify: `tarot.js:236-270` (the `openCardDetails` function)
- Modify: `tarot/index.html`
- Modify: `tarot-readings.css`
- Modify: `docs/SITE-STRUCTURE.md`

**Interfaces:**
- Consumes: `TarotReference.entry(index)` from Task 4, returning `{reference, attribution}`.
- Produces: the reference block in the detail dialog. No new exported names.

- [ ] **Step 1: Load the module on the page**

In `tarot/index.html`, add the script tag immediately after `tarot-readings.js` and before `birth-lore.js`, so the reference module is available when `tarot.js` runs:

```html
<script src="/tarot-reference.js?v=1"></script>
```

Bump `tarot.js?v=3` to `tarot.js?v=4` and `tarot-readings.css?v=1` to `tarot-readings.css?v=2` in the same file.

- [ ] **Step 2: Rename the tab and retitle the section**

In `tarot/index.html`, change the third reading tab's label from `Explore deck` to `Card reference`:

```html
<button class="reading-tab" data-reading-mode="deck" aria-pressed="false">Card reference</button>
```

Change the `#ishtar-deck` header from deck-centric to card-centric. The kicker becomes `All 78 cards`, the heading `id="ishtar-title"` keeps its deck name (it is rewritten by `tarot.js` on deck switch), and `#reading-deck-description` becomes:

```html
<p id="reading-deck-description">Every card, with what it holds on its own and the attribution tradition gives it. Choose a card to read its entry.</p>
```

- [ ] **Step 3: Add the About disclosure**

In `tarot/index.html`, immediately after the closing tag of the `.ishtar-library-tools` block, add:

```html
<details class="tarot-about">
  <summary>About these attributions</summary>
  <p>Each card carries the attribution given it by the Hermetic Order of the Golden Dawn, the system A. E. Waite's deck was built on. The thirty-six pip cards from Two to Ten take the thirty-six decans of the zodiac, with the decan rulers running in Chaldean order from Mars at the first degree of Aries. The aces take the root of their suit's element. The court cards are read here as element within element, the form in common use with Waite's deck; the Golden Dawn's own Knight, Queen, Prince and Princess do not map one to one onto Waite's King, Queen, Knight and Page.</p>
  <p>The Major Arcana follow Waite's numbering, so Strength is the eighth card and takes Leo, and Justice is the eleventh and takes Libra. The older Marseille order reverses those two numbers and gives neither an astrological attribution. A later variant associated with Aleister Crowley exchanges the attributions of The Star and The Emperor; it is not used here.</p>
  <p>This is one tradition among several, recorded because the decks on this site descend from it, not because it is the only way the cards have been read.</p>
</details>
```

- [ ] **Step 4: Render the reference in the detail dialog**

In `tarot.js`, inside `openCardDetails`, the `notes` template for a real card currently opens with a `deck-meta` div and ends with a `<dl>` holding Keywords, Upright and Reversed. Insert the reference block between the `detail-artist` paragraph and the `<dl>`, and add the prompt to the `<dl>`:

```js
    const ref = typeof TarotReference !== 'undefined' && !isBack ? TarotReference.entry(index) : null;
    const referenceMarkup = ref ? `
        ${ref.attribution ? `<p class="card-attribution"><span>Attribution</span> ${ref.attribution.line}</p>` : ''}
        ${ref.reference ? `<p class="card-reference">${ref.reference}</p>` : ''}` : '';
```

and place `${referenceMarkup}` after the `<p class="detail-artist">` line, then add `<dt>Reflection</dt><dd>${card.prompt}</dd>` as the last pair in the `<dl>`.

Guard on the bare identifier `TarotReference`, **not** `window.TarotReference`. A top-level `const` in a classic script is a script-scope binding and is never a property of `window`; `window.TarotReference` is always `undefined` and the block would silently never render. This module uses the UMD wrapper that assigns to `root`, so the global does exist, but the bare-identifier guard is the pattern this codebase requires and a `typeof` check on an undeclared name is safe.

- [ ] **Step 5: Style the block**

Append to `tarot-readings.css`:

```css
.card-attribution { margin-top: 10px; color: var(--plum); font: 500 12px "DM Mono", monospace; letter-spacing: .08em; text-transform: uppercase; }
.card-attribution span { color: var(--ink-soft); margin-right: 8px; }
.card-reference { margin-top: 12px; font-size: 15px; line-height: 1.65; }
.tarot-about { margin-top: 16px; font-size: 13px; }
.tarot-about summary { cursor: pointer; color: var(--plum); font-weight: 600; }
.tarot-about p { margin-top: 10px; color: var(--ink-soft); line-height: 1.6; }
```

- [ ] **Step 6: Verify in the browser**

Start the site preview and open `http://localhost:8099/tarot/`. Switch to the Card reference tab and confirm each of these:

- The tab reads "Card reference" and all 78 cards list, with the filters still showing 22, 14, 14, 14 and 14.
- The Star's dialog shows the attribution `Aquarius`. A major's `line` is its sign, planet or element; the Hebrew letter is carried in the data but is not rendered here.
- The Five of Wands shows `Saturn in Leo`, and the Queen of Wands shows `Water of Fire`.
- The reflection prompt now appears in the dialog, below Reversed.
- No reference paragraph appears yet, because none are written until Task 7. The block must be absent, not an empty gap.
- The About disclosure opens and closes with the keyboard alone.

Check the console for errors and verify the layout at 390px and 1400px.

- [ ] **Step 7: Update the script order doc**

In `docs/SITE-STRUCTURE.md`, add `tarot-reference.js` to the `/tarot/` script chain between `tarot-readings.js` and `birth-lore.js`.

- [ ] **Step 8: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot.js tarot/index.html tarot-readings.css docs/SITE-STRUCTURE.md
git commit -m "feat(tarot): show attributions in the card detail dialog"
```

---

### Task 6: A card has a URL

**Files:**
- Modify: `tarot.js`
- Modify: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: `TarotReference.indexForSlug(slug)` from Task 1, `setReadingMode` and `openCardDetails` inside `tarot.js`.
- Produces: `/tarot/?card=<slug>` opens the reference with that card's detail dialog showing.

`?reading=` is owned by `rooms.js` and must keep working untouched. `?card=` is a separate parameter read only by `tarot.js`.

- [ ] **Step 1: Write the failing test**

Append to `tests/tarot-reference.test.cjs`. The routing itself needs a DOM, so the test covers the parsing contract that `tarot.js` depends on, which is where the bugs actually live:

```js
test('a card URL parameter resolves to exactly one card, or to nothing', () => {
  const fromQuery = search => R.indexForSlug(new URLSearchParams(search).get('card') || '');
  assert.equal(fromQuery('?card=the-star'), 17);
  assert.equal(fromQuery('?card=five-of-wands'), 26);
  assert.equal(fromQuery('?card=wheel-of-fortune'), 10);
  assert.equal(fromQuery('?reading=42'), -1, 'the reading parameter must not be read as a card');
  assert.equal(fromQuery('?card=THE-STAR'), -1, 'slugs are lowercase only');
  assert.equal(fromQuery('?card=<script>'), -1);
  assert.equal(fromQuery(''), -1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`

Expected: this test may PASS already, because it exercises `indexForSlug` which Task 1 built. That is fine and is the point: it pins the contract `tarot.js` is about to rely on, including that `?reading=` is not mistaken for a card. Confirm `?card=five-of-wands` resolves to 26 before continuing; if the suit ordering were wrong this is where it surfaces.

- [ ] **Step 3: Open the named card on load**

At the end of `tarot.js`, replace the final line

```js
  setReadingMode(location.hash === "#ishtar-deck" ? "deck" : "daily");
```

with

```js
  const namedCard = typeof TarotReference !== 'undefined'
    ? TarotReference.indexForSlug(new URLSearchParams(location.search).get("card") || "")
    : -1;
  setReadingMode(namedCard >= 0 || location.hash === "#ishtar-deck" ? "deck" : "daily");
  if (namedCard >= 0) openCardDetails(namedCard, "upright", true);
```

- [ ] **Step 4: Keep the URL honest when browsing**

In `openCardDetails`, when `browsing` is true, record the card in the URL so a reader can copy the link to what they are looking at:

```js
    if (browsing && typeof TarotReference !== 'undefined' && !isBack) {
      const url = new URL(location.href);
      url.searchParams.set("card", TarotReference.slug(index));
      history.replaceState({}, "", url);
    }
```

and in `clearCardDetail`, remove it:

```js
      const url = new URL(location.href);
      url.searchParams.delete("card");
      history.replaceState({}, "", url);
```

Use `replaceState`, not `pushState`. Stepping through 78 cards with the arrow keys must not fill the back button with 78 entries.

- [ ] **Step 5: Verify in the browser**

Open `http://localhost:8099/tarot/?card=the-star`. The page must open on the Card reference tab with The Star's dialog showing. Step to the next card and confirm the URL updates to `?card=the-moon` without adding history entries: press Back once and confirm you leave the page rather than walking backwards through cards. Close the dialog and confirm `?card=` disappears. Load `?card=nonsense` and confirm the page opens normally on the daily card with no error. Confirm `?reading=` still opens a saved reading.

- [ ] **Step 6: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): give every card a URL"
```

---

### Task 7: Reference copy for the Major Arcana (indices 0 to 21)

**Files:**
- Modify: `tarot-reference.js`
- Modify: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: `TarotReference.name(index)` and `TarotReference.attribution(index)` for context while writing; `TarotReference.entry(index)` to read a result back.
- Produces: `REFERENCE[0]` through `REFERENCE[21]`, filled. Nothing else changes.

**The writing brief in Global Constraints is binding on this task.** Read it before writing a
word. The two rules most often broken are the ban on describing one deck's artwork and the ban on
paraphrasing the card's own reading copy.

This batch covers The Fool to The World.

- [ ] **Step 1: Read the cards you are writing for**

Run this to print each card's name, attribution and existing reading copy, so you can avoid
paraphrasing it:

```bash
node -e "
const R = require('./tarot-reference.js');
const fs = require('fs'), vm = require('vm');
const s = fs.readFileSync('./tarot.js','utf8');
const c = s.slice(s.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(c + '
tarotCards', {TarotReadings:require('./tarot-readings.js'), majorArcana:require('./birth-lore.js').majorArcana});
for (let i = 0; i <= 21; i++) console.log(i, R.name(i), '|', R.attribution(i).line, '
  up:', cards[i].upright, '
  rev:', cards[i].reversed, '
');
"
```

- [ ] **Step 2: Write the failing completeness test**

Append to `tests/tarot-reference.test.cjs`:

```js
test('every card in the the Major Arcana batch has a reference entry', () => {
  for (let i = 0; i <= 21; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: FAIL, `The Fool has no reference entry`.

- [ ] **Step 4: Write the entries**

Add them to `REFERENCE` in `tarot-reference.js`, keyed by index, in ascending order, under a
comment naming the batch:

```js
  // the Major Arcana, indices 0-21.
  REFERENCE[0] = '...';
```

- [ ] **Step 5: Run the batch test and the voice gate**

```bash
node --test tests/tarot-reference.test.cjs tests/tarot-voice.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Check the batch against itself for sameness**

```bash
node -e "
const R = require('./tarot-reference.js');
const t = [];
for (let i = 0; i <= 21; i++) t.push([R.name(i), R.entry(i).reference]);
console.log('opening sentences:');
t.forEach(([n, x]) => console.log(' ', n + ':', x.split(/(?<=\.)\s/)[0]));
const words = {};
for (const [, x] of t) for (const w of x.toLowerCase().match(/[a-z]{5,}/g) || []) words[w] = (words[w] || 0) + 1;
console.log('most repeated:', Object.entries(words).sort((a,b)=>b[1]-a[1]).slice(0,12));
"
```

Read the opening sentences as a list. If several open the same way, rewrite them. If one content
word appears in most of the batch, it is carrying too much of the writing. This step has no
assertion behind it because the failure it catches is a judgement, which is exactly why a person
has to look at the output rather than a test result.

- [ ] **Step 7: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot-reference.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): reference entries for the Major Arcana"
```

---

### Task 8: Reference copy for Wands (indices 22 to 35)

**Files:**
- Modify: `tarot-reference.js`
- Modify: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: `TarotReference.name(index)` and `TarotReference.attribution(index)` for context while writing; `TarotReference.entry(index)` to read a result back.
- Produces: `REFERENCE[22]` through `REFERENCE[35]`, filled. Nothing else changes.

**The writing brief in Global Constraints is binding on this task.** Read it before writing a
word. The two rules most often broken are the ban on describing one deck's artwork and the ban on
paraphrasing the card's own reading copy.

This batch covers Ace of Wands to King of Wands.

- [ ] **Step 1: Read the cards you are writing for**

Run this to print each card's name, attribution and existing reading copy, so you can avoid
paraphrasing it:

```bash
node -e "
const R = require('./tarot-reference.js');
const fs = require('fs'), vm = require('vm');
const s = fs.readFileSync('./tarot.js','utf8');
const c = s.slice(s.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(c + '
tarotCards', {TarotReadings:require('./tarot-readings.js'), majorArcana:require('./birth-lore.js').majorArcana});
for (let i = 22; i <= 35; i++) console.log(i, R.name(i), '|', R.attribution(i).line, '
  up:', cards[i].upright, '
  rev:', cards[i].reversed, '
');
"
```

- [ ] **Step 2: Write the failing completeness test**

Append to `tests/tarot-reference.test.cjs`:

```js
test('every card in the Wands batch has a reference entry', () => {
  for (let i = 22; i <= 35; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: FAIL, `Ace of Wands has no reference entry`.

- [ ] **Step 4: Write the entries**

Add them to `REFERENCE` in `tarot-reference.js`, keyed by index, in ascending order, under a
comment naming the batch:

```js
  // Wands, indices 22-35.
  REFERENCE[22] = '...';
```

- [ ] **Step 5: Run the batch test and the voice gate**

```bash
node --test tests/tarot-reference.test.cjs tests/tarot-voice.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Check the batch against itself for sameness**

```bash
node -e "
const R = require('./tarot-reference.js');
const t = [];
for (let i = 22; i <= 35; i++) t.push([R.name(i), R.entry(i).reference]);
console.log('opening sentences:');
t.forEach(([n, x]) => console.log(' ', n + ':', x.split(/(?<=\.)\s/)[0]));
const words = {};
for (const [, x] of t) for (const w of x.toLowerCase().match(/[a-z]{5,}/g) || []) words[w] = (words[w] || 0) + 1;
console.log('most repeated:', Object.entries(words).sort((a,b)=>b[1]-a[1]).slice(0,12));
"
```

Read the opening sentences as a list. If several open the same way, rewrite them. If one content
word appears in most of the batch, it is carrying too much of the writing. This step has no
assertion behind it because the failure it catches is a judgement, which is exactly why a person
has to look at the output rather than a test result.

- [ ] **Step 7: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot-reference.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): reference entries for Wands"
```

---

### Task 9: Reference copy for Cups (indices 36 to 49)

**Files:**
- Modify: `tarot-reference.js`
- Modify: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: `TarotReference.name(index)` and `TarotReference.attribution(index)` for context while writing; `TarotReference.entry(index)` to read a result back.
- Produces: `REFERENCE[36]` through `REFERENCE[49]`, filled. Nothing else changes.

**The writing brief in Global Constraints is binding on this task.** Read it before writing a
word. The two rules most often broken are the ban on describing one deck's artwork and the ban on
paraphrasing the card's own reading copy.

This batch covers Ace of Cups to King of Cups.

- [ ] **Step 1: Read the cards you are writing for**

Run this to print each card's name, attribution and existing reading copy, so you can avoid
paraphrasing it:

```bash
node -e "
const R = require('./tarot-reference.js');
const fs = require('fs'), vm = require('vm');
const s = fs.readFileSync('./tarot.js','utf8');
const c = s.slice(s.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(c + '
tarotCards', {TarotReadings:require('./tarot-readings.js'), majorArcana:require('./birth-lore.js').majorArcana});
for (let i = 36; i <= 49; i++) console.log(i, R.name(i), '|', R.attribution(i).line, '
  up:', cards[i].upright, '
  rev:', cards[i].reversed, '
');
"
```

- [ ] **Step 2: Write the failing completeness test**

Append to `tests/tarot-reference.test.cjs`:

```js
test('every card in the Cups batch has a reference entry', () => {
  for (let i = 36; i <= 49; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: FAIL, `Ace of Cups has no reference entry`.

- [ ] **Step 4: Write the entries**

Add them to `REFERENCE` in `tarot-reference.js`, keyed by index, in ascending order, under a
comment naming the batch:

```js
  // Cups, indices 36-49.
  REFERENCE[36] = '...';
```

- [ ] **Step 5: Run the batch test and the voice gate**

```bash
node --test tests/tarot-reference.test.cjs tests/tarot-voice.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Check the batch against itself for sameness**

```bash
node -e "
const R = require('./tarot-reference.js');
const t = [];
for (let i = 36; i <= 49; i++) t.push([R.name(i), R.entry(i).reference]);
console.log('opening sentences:');
t.forEach(([n, x]) => console.log(' ', n + ':', x.split(/(?<=\.)\s/)[0]));
const words = {};
for (const [, x] of t) for (const w of x.toLowerCase().match(/[a-z]{5,}/g) || []) words[w] = (words[w] || 0) + 1;
console.log('most repeated:', Object.entries(words).sort((a,b)=>b[1]-a[1]).slice(0,12));
"
```

Read the opening sentences as a list. If several open the same way, rewrite them. If one content
word appears in most of the batch, it is carrying too much of the writing. This step has no
assertion behind it because the failure it catches is a judgement, which is exactly why a person
has to look at the output rather than a test result.

- [ ] **Step 7: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot-reference.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): reference entries for Cups"
```

---

### Task 10: Reference copy for Swords (indices 50 to 63)

**Files:**
- Modify: `tarot-reference.js`
- Modify: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: `TarotReference.name(index)` and `TarotReference.attribution(index)` for context while writing; `TarotReference.entry(index)` to read a result back.
- Produces: `REFERENCE[50]` through `REFERENCE[63]`, filled. Nothing else changes.

**The writing brief in Global Constraints is binding on this task.** Read it before writing a
word. The two rules most often broken are the ban on describing one deck's artwork and the ban on
paraphrasing the card's own reading copy.

This batch covers Ace of Swords to King of Swords.

- [ ] **Step 1: Read the cards you are writing for**

Run this to print each card's name, attribution and existing reading copy, so you can avoid
paraphrasing it:

```bash
node -e "
const R = require('./tarot-reference.js');
const fs = require('fs'), vm = require('vm');
const s = fs.readFileSync('./tarot.js','utf8');
const c = s.slice(s.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(c + '
tarotCards', {TarotReadings:require('./tarot-readings.js'), majorArcana:require('./birth-lore.js').majorArcana});
for (let i = 50; i <= 63; i++) console.log(i, R.name(i), '|', R.attribution(i).line, '
  up:', cards[i].upright, '
  rev:', cards[i].reversed, '
');
"
```

- [ ] **Step 2: Write the failing completeness test**

Append to `tests/tarot-reference.test.cjs`:

```js
test('every card in the Swords batch has a reference entry', () => {
  for (let i = 50; i <= 63; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: FAIL, `Ace of Swords has no reference entry`.

- [ ] **Step 4: Write the entries**

Add them to `REFERENCE` in `tarot-reference.js`, keyed by index, in ascending order, under a
comment naming the batch:

```js
  // Swords, indices 50-63.
  REFERENCE[50] = '...';
```

- [ ] **Step 5: Run the batch test and the voice gate**

```bash
node --test tests/tarot-reference.test.cjs tests/tarot-voice.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Check the batch against itself for sameness**

```bash
node -e "
const R = require('./tarot-reference.js');
const t = [];
for (let i = 50; i <= 63; i++) t.push([R.name(i), R.entry(i).reference]);
console.log('opening sentences:');
t.forEach(([n, x]) => console.log(' ', n + ':', x.split(/(?<=\.)\s/)[0]));
const words = {};
for (const [, x] of t) for (const w of x.toLowerCase().match(/[a-z]{5,}/g) || []) words[w] = (words[w] || 0) + 1;
console.log('most repeated:', Object.entries(words).sort((a,b)=>b[1]-a[1]).slice(0,12));
"
```

Read the opening sentences as a list. If several open the same way, rewrite them. If one content
word appears in most of the batch, it is carrying too much of the writing. This step has no
assertion behind it because the failure it catches is a judgement, which is exactly why a person
has to look at the output rather than a test result.

- [ ] **Step 7: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot-reference.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): reference entries for Swords"
```

---

### Task 11: Reference copy for Pentacles (indices 64 to 77)

**Files:**
- Modify: `tarot-reference.js`
- Modify: `tests/tarot-reference.test.cjs`

**Interfaces:**
- Consumes: `TarotReference.name(index)` and `TarotReference.attribution(index)` for context while writing; `TarotReference.entry(index)` to read a result back.
- Produces: `REFERENCE[64]` through `REFERENCE[77]`, filled. Nothing else changes.

**The writing brief in Global Constraints is binding on this task.** Read it before writing a
word. The two rules most often broken are the ban on describing one deck's artwork and the ban on
paraphrasing the card's own reading copy.

This batch covers Ace of Pentacles to King of Pentacles.

- [ ] **Step 1: Read the cards you are writing for**

Run this to print each card's name, attribution and existing reading copy, so you can avoid
paraphrasing it:

```bash
node -e "
const R = require('./tarot-reference.js');
const fs = require('fs'), vm = require('vm');
const s = fs.readFileSync('./tarot.js','utf8');
const c = s.slice(s.indexOf('const suitProfiles')).split('const readingDecks =')[0];
const cards = vm.runInNewContext(c + '
tarotCards', {TarotReadings:require('./tarot-readings.js'), majorArcana:require('./birth-lore.js').majorArcana});
for (let i = 64; i <= 77; i++) console.log(i, R.name(i), '|', R.attribution(i).line, '
  up:', cards[i].upright, '
  rev:', cards[i].reversed, '
');
"
```

- [ ] **Step 2: Write the failing completeness test**

Append to `tests/tarot-reference.test.cjs`:

```js
test('every card in the Pentacles batch has a reference entry', () => {
  for (let i = 64; i <= 77; i++) {
    const text = R.entry(i).reference;
    assert.ok(text, `${R.name(i)} has no reference entry`);
    assert.ok(text.length >= 400 && text.length <= 750,
      `${R.name(i)} is ${text.length} characters, outside 400-750`);
    assert.ok(!/the (figure|image|card) (in|at|shows|depicts)/i.test(text),
      `${R.name(i)} describes one deck's artwork`);
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tests/tarot-reference.test.cjs`
Expected: FAIL, `Ace of Pentacles has no reference entry`.

- [ ] **Step 4: Write the entries**

Add them to `REFERENCE` in `tarot-reference.js`, keyed by index, in ascending order, under a
comment naming the batch:

```js
  // Pentacles, indices 64-77.
  REFERENCE[64] = '...';
```

- [ ] **Step 5: Run the batch test and the voice gate**

```bash
node --test tests/tarot-reference.test.cjs tests/tarot-voice.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Check the batch against itself for sameness**

```bash
node -e "
const R = require('./tarot-reference.js');
const t = [];
for (let i = 64; i <= 77; i++) t.push([R.name(i), R.entry(i).reference]);
console.log('opening sentences:');
t.forEach(([n, x]) => console.log(' ', n + ':', x.split(/(?<=\.)\s/)[0]));
const words = {};
for (const [, x] of t) for (const w of x.toLowerCase().match(/[a-z]{5,}/g) || []) words[w] = (words[w] || 0) + 1;
console.log('most repeated:', Object.entries(words).sort((a,b)=>b[1]-a[1]).slice(0,12));
"
```

Read the opening sentences as a list. If several open the same way, rewrite them. If one content
word appears in most of the batch, it is carrying too much of the writing. This step has no
assertion behind it because the failure it catches is a judgement, which is exactly why a person
has to look at the output rather than a test result.

- [ ] **Step 7: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add tarot-reference.js tests/tarot-reference.test.cjs
git commit -m "feat(tarot): reference entries for Pentacles"
```

**Task 11 only.** Before committing, add the two assertions that can only pass once the last batch
has landed:

```js
test('all 78 cards have a reference entry, and no two share one', () => {
  const missing = [];
  for (let i = 0; i < 78; i++) if (!R.entry(i).reference) missing.push(R.name(i));
  assert.deepEqual(missing, [], 'cards without a reference entry');
  const texts = Array.from({length: 78}, (_, i) => R.entry(i).reference);
  assert.equal(new Set(texts).size, 78, 'two cards share the same entry');
});

test("no reference entry is a rearrangement of that card's own reading copy", () => {
  const source = fs.readFileSync(require.resolve('../tarot.js'), 'utf8');
  const catalogue = source.slice(source.indexOf('const suitProfiles')).split('const readingDecks =')[0];
  const cards = vm.runInNewContext(catalogue + '
tarotCards', {
    TarotReadings: require('../tarot-readings.js'),
    majorArcana: require('../birth-lore.js').majorArcana
  });
  const shingles = text => new Set((text.toLowerCase().match(/[a-z]+/g) || [])
    .map((w, i, a) => a.slice(i, i + 4).join(' ')).filter(s => s.split(' ').length === 4));
  for (let i = 0; i < 78; i++) {
    const ref = shingles(R.entry(i).reference);
    const reading = shingles(`${cards[i].upright} ${cards[i].reversed}`);
    const shared = [...ref].filter(s => reading.has(s));
    assert.ok(shared.length <= 2,
      `${R.name(i)} shares ${shared.length} four-word runs with its reading copy: ${shared.slice(0, 3).join(' / ')}`);
  }
});
```

Prove the second one binds: temporarily set `REFERENCE[0]` to the literal value of the Fool's
`upright` text and confirm the test fails naming The Fool. Restore it.


---

### Task 12: Documentation

**Files:**
- Create: `docs/TAROT-REFERENCE.md`
- Modify: `docs/FULL-READINGS.md`

**Interfaces:**
- Consumes: everything built in Tasks 1 to 11.
- Produces: nothing code depends on.

- [ ] **Step 1: Write `docs/TAROT-REFERENCE.md`**

Follow the shape of `docs/SKY.md` and `docs/HORARY.md`: what the feature is, the conventions it follows, where they come from, what is derived versus authored, and how it is verified. It must cover:

- The canonical card index and why it is not free to change, naming `deck-art/ishtar-insights/manifest.csv`.
- That the 36 pip attributions are derived from the Chaldean decan order rather than transcribed, that `classical-engine.js` holds the same sequence, and that a test pins both against a literal table.
- The Waite numbering, with Strength at VIII and Justice at XI, the Marseille order that differs, and the Crowley variant that is not used.
- That the court attributions are the Waite-adapted element-of-element form and that the Golden Dawn's own courts do not map one to one.
- That reference copy never describes a specific deck's artwork, and why.
- The voice gate, including why the sky section's phrase list is not reused, with the four false positives named.
- Verification: the test counts, and what browser QA covered.

- [ ] **Step 2: Cross-reference from the readings doc**

In `docs/FULL-READINGS.md`, add a line under a new "Card reference" heading pointing at `docs/TAROT-REFERENCE.md` and saying that the reference entries are separate from the reading copy documented there, and why.

- [ ] **Step 3: Run the whole suite and commit**

```bash
node --test tests/*.test.cjs
git add docs/TAROT-REFERENCE.md docs/FULL-READINGS.md
git commit -m "docs: the tarot card reference, its sources and its derivations"
```

---

## Notes for the executor

- **Stop the dev preview servers before any merge.** This repo lives on the `V:` network drive and a running static server holds the tree open, which makes `git merge --squash` fail with `Permission denied`.
- **Never `git add -A`.** Two large untracked PNGs sit in `output/imagegen/` and have twice been swept into commits. Stage the named files each task lists.
- **`window.X` guards do not work here.** A top-level `const` in a classic script is a script-scope binding, not a property of `window`. Guard bare identifiers with `typeof`.
- The full suite before this plan starts is 420 passing. Report the count after each task that adds tests.
