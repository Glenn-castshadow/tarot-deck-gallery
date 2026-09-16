# Playing cards (C4c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 52-card cartomancy as a sixth practice on `/divination/`, with original vector cards and reflective copy, saved as the existing `cartomancy` kind.

**Architecture:** A new pure UMD module, `playing-cards.js`, holds the deck, its copy, the pip layouts and the SVG faces. `divination.js` gains the practice through its existing `modes` machinery. The backend needs no change, because `cartomancy` is already registered.

**Tech Stack:** Vanilla ES2020 with no build step, tested with `node --test tests/*.test.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-16-playing-cards-design.md`

## Global Constraints

Tags: **[Glenn]** his instruction; **[codebase]** already enforced; **[program]** Part E of the program spec; **[spec]** a C4c spec decision taken under Glenn's instruction to complete C4; **[judgement]** mine.

- **No backend change.** `cartomancy` ("Playing cards", category `divination`) is already in `kinds.py` and `rooms.js`; the label must match exactly. [spec, codebase]
- **Deck:** 52 cards, ace to king, suits in the order Hearts, Diamonds, Clubs, Spades (ids 0–51, suit then rank). No jokers; upright only. [spec]
- **Suit themes**, named as modern English-language associations: Hearts are feeling and relationships; Diamonds are resources and practical work; Clubs are effort, growth and exchange; Spades are difficulty, decisions and clear thought. Spades never mean misfortune. [spec]
- **Layouts:** one card, "What to notice"; or three cards, "What is present", "What asks for attention" and "A next step". [spec]
- **Art:** original vector faces only, with no third-party art and no image requests. Colour is never the only cue. [spec]
- **Existing practices render exactly as today**, apart from the header count ("Six ways to listen closely"). [spec]
- **Copy:** reflective and original, with no predictions, luck, fortune or verdicts. British spelling, spaced em dashes, curly apostrophes. No sentence may assert something the data does not always support. [codebase, judgement]
- **Code:** bare `typeof` guards, never `window.X`; escape every interpolated value; keyboard operable; verified at 390px and 1400px. [codebase, program]
- **Housekeeping:** no new dependencies. [Glenn] Bump the cache key of every changed file on every page that loads it. [codebase] Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. [session attribution instruction]

---

### Task 1: The deck module and its copy

**Files:** Create `playing-cards.js` and `tests/playing-cards.test.cjs`

The controller ran the core below against these tests (3 of 3 passed) and checked the rendered faces in a browser.

- [ ] **Step 1: Create `tests/playing-cards.test.cjs`** with these tests, verbatim:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../playing-cards.js');

test('the deck is 52 cards in suit then rank order', () => {
  assert.equal(P.cards.length, 52);
  assert.deepEqual(P.cards.map(c => c.id), Array.from({length: 52}, (_, i) => i));
  assert.equal(new Set(P.cards.map(c => c.name)).size, 52);
  assert.equal(P.cards[0].name, 'Ace of Hearts');
  assert.equal(P.cards[12].name, 'King of Hearts');
  assert.equal(P.cards[13].name, 'Ace of Diamonds');
  assert.equal(P.cards[50].name, 'Queen of Spades');
  assert.deepEqual(P.SUITS.map(s => s.key), ['hearts', 'diamonds', 'clubs', 'spades']);
  assert.deepEqual(P.SUITS.map(s => s.colour), ['red', 'red', 'black', 'black']);
});

test('pip layouts: one per rank value for 2–10, one for an ace, none for courts, all inside the face', () => {
  assert.equal(P.pips(1).length, 1);
  for (let rank = 2; rank <= 10; rank++) {
    const p = P.pips(rank);
    assert.equal(p.length, rank, `rank ${rank}`);
    assert.equal(new Set(p.map(([x, y]) => `${x},${y}`)).size, rank, `rank ${rank} has a duplicate pip`);
    for (const [x, y] of p) assert.ok(x > 0 && x < 1 && y > 0 && y < 1, `rank ${rank} pip outside the face`);
  }
  for (const rank of [11, 12, 13]) assert.deepEqual(P.pips(rank), []);
  assert.throws(() => P.pips(0), RangeError);
  assert.throws(() => P.pips(14), RangeError);
});

test('each card face names itself and carries its colour class', () => {
  for (const card of P.cards) {
    const s = P.svg(card);
    assert.match(s, new RegExp(`<title>${card.name}</title>`));
    assert.match(s, new RegExp(`class="pc-card pc-${card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'}"`));
    assert.match(s, new RegExp(`class="pc-rank">${card.rankKey}<`));
    const pathCount = (s.match(/<path /g) || []).length;
    const expected = 2 + (card.rank >= 11 ? 1 : card.rank);   // two corner marks, then face marks
    assert.equal(pathCount, expected, `${card.name}: ${pathCount} suit marks`);
  }
  assert.throws(() => P.svg({rank: 14, suit: 'hearts', name: 'x'}), RangeError);
});
```

- [ ] **Step 2: Create `playing-cards.js`** with this core, verbatim, then run `node --test tests/playing-cards.test.cjs`. All three tests should pass.

```js
/* The 52-card deck for cartomancy: data, pip layouts and original vector card faces.
   No third-party artwork and no image requests. Conventions: docs/DIVINATION.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlayingCards = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SUITS = [
    {key: 'hearts', name: 'Hearts', colour: 'red', path: 'M50 88C12 60 6 38 20 24c10-10 24-6 30 6 6-12 20-16 30-6 14 14 8 36-30 64Z'},
    {key: 'diamonds', name: 'Diamonds', colour: 'red', path: 'M50 8 82 50 50 92 18 50Z'},
    {key: 'clubs', name: 'Clubs', colour: 'black', path: 'M50 10a17 17 0 0 1 16 23 17 17 0 1 1-8 30l6 25H36l6-25a17 17 0 1 1-8-30A17 17 0 0 1 50 10Z'},
    {key: 'spades', name: 'Spades', colour: 'black', path: 'M50 8C70 30 88 42 88 58a17 17 0 0 1-30 10l6 22H36l6-22a17 17 0 0 1-30-10c0-16 18-28 38-50Z'}
  ];
  const RANKS = [
    {key: 'A', name: 'Ace', value: 1}, {key: '2', name: 'Two', value: 2}, {key: '3', name: 'Three', value: 3},
    {key: '4', name: 'Four', value: 4}, {key: '5', name: 'Five', value: 5}, {key: '6', name: 'Six', value: 6},
    {key: '7', name: 'Seven', value: 7}, {key: '8', name: 'Eight', value: 8}, {key: '9', name: 'Nine', value: 9},
    {key: '10', name: 'Ten', value: 10}, {key: 'J', name: 'Jack', value: 11}, {key: 'Q', name: 'Queen', value: 12},
    {key: 'K', name: 'King', value: 13}
  ];
  // The standard pip arrangements, as fractions of the face (x across, y down).
  const COLS = [0.25, 0.75];
  const two = y => COLS.map(x => [x, y]);
  const LAYOUTS = {
    2: [[.5, .2], [.5, .8]],
    3: [[.5, .2], [.5, .5], [.5, .8]],
    4: [...two(.2), ...two(.8)],
    5: [...two(.2), ...two(.8), [.5, .5]],
    6: [...two(.2), ...two(.5), ...two(.8)],
    7: [...two(.2), ...two(.5), ...two(.8), [.5, .35]],
    8: [...two(.2), ...two(.5), ...two(.8), [.5, .35], [.5, .65]],
    9: [...two(.2), ...two(.4), ...two(.6), ...two(.8), [.5, .5]],
    10: [...two(.2), ...two(.4), ...two(.6), ...two(.8), [.5, .3], [.5, .7]]
  };
  function pips(rank) {
    if (rank === 1) return [[.5, .5]];
    if (rank >= 11 && rank <= 13) return [];
    if (!LAYOUTS[rank]) throw new RangeError('Rank runs 1–13.');
    return LAYOUTS[rank].map(p => [...p]);
  }
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Face area inside a 200×300 card: x 30–170, y 40–260.
  const FACE = {x: 30, y: 40, w: 140, h: 220};
  function svg(card) {
    const suit = SUITS.find(s => s.key === card.suit), rank = RANKS.find(r => r.value === card.rank);
    if (!suit || !rank) throw new RangeError('Unknown card.');
    const mark = (cx, cy, size, flip) => `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 100})${flip ? ' rotate(180 50 50)' : ''}"><path d="${suit.path}"/></g>`;
    const corner = `<text x="16" y="34" class="pc-rank">${esc(rank.key)}</text>${mark(24, 50, 18, false)}`;
    const faceMarks = card.rank >= 11
      ? `<rect x="52" y="82" width="96" height="136" rx="10" class="pc-court"/><text x="100" y="160" class="pc-monogram">${esc(rank.key)}</text>${mark(100, 192, 30, false)}`
      : pips(card.rank).map(([x, y]) => mark(FACE.x + x * FACE.w, FACE.y + y * FACE.h, card.rank === 1 ? 70 : 30, y > .5)).join('');
    return `<svg class="pc-card pc-${suit.colour}" viewBox="0 0 200 300" role="img" aria-label="${esc(card.name)}"><title>${esc(card.name)}</title><rect x="2" y="2" width="196" height="296" rx="14" class="pc-face"/>${corner}<g transform="rotate(180 100 150)">${corner}</g>${faceMarks}</svg>`;
  }
  const cards = SUITS.flatMap((suit, s) => RANKS.map((rank, r) => ({id: s * 13 + r, rank: rank.value, rankKey: rank.key, suit: suit.key, name: `${rank.name} of ${suit.name}`})));
  return {SUITS, RANKS, cards, pips, svg};
});
```

- [ ] **Step 3: Add the copy.** Add a `COPY` array of 52 `{keyword, meaning, prompt}` entries, index-aligned with `cards` (suit then rank, ace first). Merge it into each card, so each card is `{id, rank, rankKey, suit, name, keyword, meaning, prompt}` and `cards` is exported with its copy. Every entry is original:
  - **keyword:** one or two words.
  - **meaning:** two or three sentences in the reflective register of the Lenormand and rune meanings in `divination-data.js` (read several first). Draw on the suit's theme and the rank's place in a progression:
    - aces are beginnings;
    - the middle ranks are development;
    - tens are fullness or completion;
    - the court cards are ways of carrying the suit's theme: the jack for learning or messages, the queen for care or inner mastery, the king for responsibility or outward mastery. Make no gendered prescription about who a court card "is".
  - **prompt:** one question.
  - **Spades:** name difficulty honestly as something to work with. Never write loss, illness, death or misfortune.
  - **Uniqueness:** every keyword and every meaning is unique.

- [ ] **Step 4: Test the copy.** Append this test:

```js
test('every card has original, reflective copy', () => {
  const banned = /you will|will happen|is going to|\bluck|fortune|misfortune|death|\bdie\b|illness|disease|curse|doom|destined|guarantee/i;
  for (const card of P.cards) {
    for (const field of ['keyword', 'meaning', 'prompt']) {
      assert.ok(typeof card[field] === 'string' && card[field].trim(), `${card.name} ${field}`);
      assert.doesNotMatch(card[field], banned, `${card.name} ${field}`);
      assert.doesNotMatch(card[field], /'/, `${card.name} ${field} uses a straight apostrophe`);
    }
    assert.ok(card.prompt.trim().endsWith('?'), `${card.name} prompt is a question`);
  }
  assert.equal(new Set(P.cards.map(c => c.keyword)).size, 52);
  assert.equal(new Set(P.cards.map(c => c.meaning)).size, 52);
});
```

- [ ] **Step 5: Commit.** Run the suite, then commit `playing-cards.js` and `tests/playing-cards.test.cjs`: `feat(divination): the playing-card deck, faces and copy`.

---

### Task 2: The practice on `/divination/`

**Files:** Modify `divination.js`, `divination.css`, `divination/index.html`, `tests/divination.test.cjs`, `tests/pages.test.cjs`

- [ ] **Step 1: Add the practice.** Add a `cartomancy` entry to `modes`:
  - `name`: "Playing cards".
  - `tag`: something like "52 cards · four suits".
  - `title` and `intro`.
  - `options`: `[[1,'One card'],[3,'Present · Attention · Next step']]`.
  - `verb`: something like "Deal the cards".
  - `note`: the About text. State the deck, that cards are upright only, the suit themes as modern English-language associations, the layouts, and that the faces are original vector drawings. Name no source.

  Also:
  - Add `positions` and `positionMeaning` for both layouts.
  - Add a `summary()` synthesis branch in the same register as the others.
  - Change the header's "Five ways to listen closely" to "Six ways to listen closely".
- [ ] **Step 2: Use the vector faces.**
  - `items()` returns `PlayingCards.cards` for `cartomancy`.
  - `visual()`, the art dialog and the library use `PlayingCards.svg(card)` for this practice instead of an `<img>`.
  - No `artPath` request may be made, because there are no webp files for this practice. Check every place `artPath` is used, including the back-of-card CSS variable `--dv-back`, which must not point to a missing file. Give cartomancy a CSS-drawn card back, or no back image.
  - Add the `.pc-*` classes to `divination.css` (face, red and near-black suits, rank, court frame, monogram) in the practice's palette.
- [ ] **Step 3: Save and load.**
  - Drawing uses `E.draw(52, count)`.
  - Save and load reuse the existing lenormand/oracle/runes path (`loadIds` with size 52).
  - `currentDraw` returns kind `cartomancy`, `layout` set to the count, and a summary joining the card names, at most 120 characters.
  - Add `cartomancy: 'Playing cards'` to `labels`.
  - Add `cartomancy` to `divination/index.html`'s `data-room`.
  - Load `/playing-cards.js?v=1` before `divination.js`.
- [ ] **Step 4: Tests.**
  - In `tests/divination.test.cjs`, extend the save-button wiring test with a `cartomancy` case for one card and for three cards. The stand-in page must provide `PlayingCards`, loaded from the real module.
  - In `tests/pages.test.cjs`, record `divination.js` → `playing-cards.js` according to the file's header rule.
- [ ] **Step 5: Keys and commit.**
  - Bump `divination.js` and `divination.css`, which shipped at `c4b-1`, and any other changed keys in `divination/index.html`. Check no other page loads these files.
  - Run the suite, then commit: `feat(divination): playing-card cartomancy`. Do not attempt browser verification.

---

### Task 3: Documentation

- [ ] **Step 1: DIVINATION.md.** In `docs/DIVINATION.md`, document the practice:
  - the deck;
  - the suit associations and how they are framed;
  - the layouts;
  - the vector art, including the pip layouts as coded;
  - the intent of the copy;
  - saving: kind, payload and summary.
- [ ] **Step 2: SITE-STRUCTURE.md.** In `docs/SITE-STRUCTURE.md`, update the `/divination/` script chain, the `data-room` list and the registered-room sentence.
- [ ] **Step 3: Check and commit.** Check every claim against the code and use the real test counts. Commit: `docs: playing-card cartomancy`.

---

## Notes for the executor

- Stop dev preview servers before any merge.
- Never run `git add -A`.
- Commands on `V:` can exceed two minutes.
- The node suite has 538 passing tests before this plan starts.
