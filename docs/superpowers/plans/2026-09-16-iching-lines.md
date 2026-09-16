# I Ching line texts (C4d) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write 384 original I Ching line reflections, one per line of each hexagram. The reading on `/divination/` shows them for changing lines, and the library study panel lists them.

**Architecture:**
- The texts live in a new pure UMD data module, `iching-lines.js`, with `lines[number]` holding six strings, bottom line first.
- `divination.js` shows a line's text when it exists and falls back to the generic position reflection otherwise.
- The texts are written in eight batches of eight hexagrams. Writers produce JSON files outside the repo, and the controller merges each batch into the module as its own commit.

**Tech Stack:** Vanilla ES2020, no build step. Tests run with `node --test tests/*.test.cjs`.

**Spec:** `docs/superpowers/specs/2026-09-16-iching-lines-design.md`

## Global Constraints

Tags: **[Glenn]** his instruction; **[codebase]** already enforced; **[program]** Part E and the C4 bullet of the program spec; **[spec]** a C4d spec decision taken under Glenn's instruction to complete C4; **[judgement]** mine.

- **The texts are written fresh.** Never quote, translate closely, or paraphrase closely any published translation, including Wilhelm/Baynes, Legge, Blofeld, Huang and Lynn. A line's traditional image may be named in a few words. [spec]
- **No oracle formulas and no verdicts.** Do not use "good fortune", "misfortune", "no blame", "remorse", "humiliation", "perseverance furthers", "the superior man", or any prediction. [spec, codebase]
- **Each text is one paragraph of two or three sentences.** It reflects the traditional situation of that line within its hexagram. Lines run bottom first, in King Wen order. [spec, program]
- **Voice.** Reflective, matching the other practices' second person where natural. British spelling, curly apostrophes, spaced em dashes. [codebase]
- **Fallback.** A hexagram without texts keeps the six position reflections. An entry is complete (six texts) or absent. [spec]
- **Existing I Ching behaviour is unchanged** apart from the texts shown. [spec]
- **Code.** Use bare `typeof` guards, never `window.X`, and escape nothing that is static data. Keep it keyboard operable and verify at 390px and 1400px. [codebase, program]
- **Dependencies and releases.** No new dependencies. [Glenn] Bump the cache key of every changed file. [codebase] Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. [session attribution instruction]

---

### Task 1: The module and the wiring

**Files:** create `iching-lines.js` and `tests/iching-lines.test.cjs`; modify `divination.js`, `divination/index.html`, `tests/divination.test.cjs` and `tests/pages.test.cjs`.

- [ ] **Step 1: Create `iching-lines.js`.**

```js
/* Original reflections for the six lines of each I Ching hexagram, bottom line first, keyed by
   King Wen number. Written for this site; not a translation. Conventions: docs/DIVINATION.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IChingLines = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const lines = {
    // Batches of eight hexagrams are added here in King Wen order.
  };
  function forLine(number, index) {
    const set = lines[number];
    return Array.isArray(set) && Number.isInteger(index) && index >= 0 && index < 6 ? set[index] : null;
  }
  const has = number => Array.isArray(lines[number]);
  return {lines, forLine, has};
});
```

- [ ] **Step 2: Create `tests/iching-lines.test.cjs`.**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../iching-lines.js');

const banned = /fortune|misfortune|\bblame|remorse|humiliation|you will|will happen|destined|\bdoom|\bluck|perseverance furthers|superior man/i;
const sentences = text => (text.match(/[.!?](?=\s|$)/g) || []).length;

test('every present hexagram has exactly six original, reflective line texts', () => {
  const all = [];
  for (const [key, set] of Object.entries(L.lines)) {
    const n = Number(key);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 64, `key ${key}`);
    assert.ok(Array.isArray(set) && set.length === 6, `hexagram ${n} has ${set && set.length} lines`);
    set.forEach((text, i) => {
      const where = `hexagram ${n} line ${i + 1}`;
      assert.ok(typeof text === 'string' && text.trim(), where);
      assert.doesNotMatch(text, banned, where);
      assert.doesNotMatch(text, /'/, `${where} uses a straight apostrophe`);
      const count = sentences(text);
      assert.ok(count >= 2 && count <= 3, `${where} has ${count} sentences`);
      all.push(text);
    });
  }
  assert.equal(new Set(all).size, all.length, 'every line text is unique');
});

test('forLine returns a text or null', () => {
  assert.equal(L.forLine(999, 0), null);
  assert.equal(L.forLine(1, -1), null);
  assert.equal(L.forLine(1, 6), null);
  assert.equal(L.forLine(1, 1.5), null);
  for (const key of Object.keys(L.lines)) {
    assert.equal(L.forLine(Number(key), 0), L.lines[key][0]);
    assert.equal(L.has(Number(key)), true);
  }
});
```

- [ ] **Step 3: Wire the module into `divination.js`.**
  - In `hexagramOutput`, each changing line's paragraph uses `IChingLines.forLine(h.number, i)` when `typeof IChingLines !== 'undefined'` and the text exists. Otherwise it uses `p.text`, as today. The kicker is unchanged.
  - In the I Ching study panel, when the hexagram has texts, add after the meaning a `<section class="dv-iching-lines" aria-label="The six lines">` with an `<ol>` of six items, bottom line first. Label each item "Line n · {position title}" and give it the text.
  - Keep everything else identical.
- [ ] **Step 4: Update `divination/index.html`.** Load `/iching-lines.js?v=1` before `divination.js`. Bump `divination.js` (it shipped at `c4c-1`). Add any CSS for `.dv-iching-lines` to `divination.css` and bump that too.
- [ ] **Step 5: Extend the tests.**
  - In the stand-in-page wiring test (`tests/divination.test.cjs`), add a case with a stub `IChingLines` that has texts for hexagram 1. Cast six 9s (hexagram 1, all lines changing) and assert the six stub texts appear. Then cast a hexagram the stub lacks and assert the position texts appear.
  - Record `divination.js` → `iching-lines.js` in `tests/pages.test.cjs` per its header rule. The read is `typeof`-guarded, so follow the header's rule for such reads.
- [ ] **Step 6: Commit.** Run the suite. Commit: `feat(divination): I Ching line texts module and wiring`.

---

### Tasks 2–9: The eight batches

Each batch covers eight hexagrams in King Wen order:

| Task | Hexagrams |
|---|---|
| 2 | 1–8 |
| 3 | 9–16 |
| 4 | 17–24 |
| 5 | 25–32 |
| 6 | 33–40 |
| 7 | 41–48 |
| 8 | 49–56 |
| 9 | 57–64 |

- [ ] **Step 1: Write the batch.** The writer reads the copy brief `.superpowers/sdd/2026-09-16-iching-lines/copy-brief.md` and `divination-data.js`'s entries for the eight hexagrams (name, gloss, keyword, meaning, symbol). It writes `.superpowers/sdd/2026-09-16-iching-lines/batch-N.json` as `{"<number>": ["line 1", …, "line 6"], …}` for exactly those eight hexagrams.
- [ ] **Step 2: Merge and test.** The controller merges the JSON into `lines` in `iching-lines.js`, one property per hexagram, in number order, and runs the tests. Any failure goes back to the writer.
- [ ] **Step 3: Commit.** Commit the batch: `content(divination): I Ching line texts, hexagrams A–B`.

---

### Task 10: Completeness and documentation

- [ ] **Step 1: Require all 64.** Append to `tests/iching-lines.test.cjs`:

```js
test('all 64 hexagrams have their six lines', () => {
  for (let n = 1; n <= 64; n++) assert.ok(L.has(n), `hexagram ${n} is missing`);
  assert.equal(Object.keys(L.lines).length, 64);
});
```

- [ ] **Step 2: Document.**
  - In `docs/DIVINATION.md`, document the line texts: what they are and are not, the copyright rule, the fallback, where they show, the batches, and the tests.
  - In `docs/SITE-STRUCTURE.md`, update the `/divination/` script chain.
  - Check every claim against the code and use real test counts.
- [ ] **Step 3: Commit.** Commit: `docs: I Ching line texts`.

---

## Notes for the executor

- Stop dev preview servers before any merge.
- Never run `git add -A`.
- Commands on `V:` can exceed two minutes.
- The node suite before this plan is 542 passing.
