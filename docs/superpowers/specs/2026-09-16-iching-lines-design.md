# C4d I Ching line texts

Date: 2026-09-16. Status: design.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C4. The split is
recorded in `2026-09-14-numerology-depth-design.md`. C4a, C4b and C4c have shipped. This is C4d, the
last.

## Purpose

When a cast has changing lines, the I Ching reading on `/divination/` shows one of six generic
position reflections for each changing line: "The beginning", "The inner position", and so on. The
program asks for 384 original line reflections, one for each line of each hexagram. They are
written in eight batches of eight hexagrams, and each hexagram keeps the position reflections until
its own lines are written.

## What exists

- `divination-data.js` holds `hexagrams`: 64 entries in King Wen order, with `number`, `character`,
  `name`, `symbol` (bottom line first), `gloss`, `keyword`, `meaning` and `prompt`. It also holds
  `linePositions`: six `{title, text}` entries.
- `divination.js` `hexagramOutput` renders each changing line as a "Line n · old yang becoming yin ·
  {position title}" kicker with the position text beneath. The library study panel shows a
  hexagram's gloss, trigrams and meaning, but no lines.

## Decisions

Every decision here is mine, taken under Glenn's instruction to complete C4 in the same unattended
way as C3.

| Decision | Choice | Cost if wrong |
|---|---|---|
| Where the texts live | A new data module, `iching-lines.js`, with `lines[number]` holding six strings, bottom line first | None |
| Fallback | A hexagram without an entry keeps the position reflections. A partial entry is refused, so the module holds only complete sets of six | None |
| Shipping | All eight batches are written in this sub-project and shipped in one release. Each batch is a separate commit, reviewed on its own | The program imagined eight releases; one release is simpler and loses nothing |
| What a line text is | One original paragraph of two or three sentences. It reflects the traditional situation of that line within its hexagram and names the line's traditional image in a few words where one exists | None |
| What a line text is not | Not a translation, quotation or close paraphrase of any published translation (Wilhelm and Baynes, Legge, or any other). Not a verdict: no "good fortune", "misfortune", "blame", "remorse" or any other oracle formula. No prediction | A traditional reader misses the formulas; the site's voice rules them out everywhere |
| Display | For each changing line, the line text replaces the position text, and the position title stays in the kicker. The library study panel lists all six line texts for any hexagram that has them | None |
| Copy rules | Reflective, second person where the other practices use it, British spelling, curly apostrophes, spaced em dashes | None |

## Architecture

- **`iching-lines.js`** (new): a pure UMD module exporting `lines` (an object keyed by hexagram
  number) and `forLine(number, index)`, which returns the text or `null`.
- **`divination.js`**:
  - `hexagramOutput` uses `IChingLines.forLine(h.number, i)` when it is available, and falls back to
    `D.linePositions[i].text`.
  - The study panel adds a "The six lines" list when the hexagram has texts.
  - `IChingLines` is guarded with a bare `typeof`.
- **`divination/index.html`** loads `iching-lines.js` before `divination.js`.

## Testing

`tests/iching-lines.test.cjs`:
- Every key is a hexagram number from 1 to 64, and every entry holds exactly six non-empty strings.
- Every text is two or three sentences, with no straight apostrophes and no banned words: fortune,
  misfortune, blame, remorse, humiliation, you will, will happen, destined, doom, luck.
- All 384 texts are unique.
- Once every batch has landed, all 64 hexagrams are present.
- `forLine` returns `null` for a missing hexagram and for an index outside 0–5.

`tests/divination.test.cjs`:
- A cast with changing lines renders the line text when one exists, and the position text when it
  does not.

Browser checks:
- A cast with changing lines shows the new texts.
- The study panel shows six lines.
- Layout holds at 390px and 1400px.

## Files

| File | Change |
|---|---|
| `iching-lines.js`, `tests/iching-lines.test.cjs` | Create |
| `divination.js`, `divination/index.html`, `tests/divination.test.cjs`, `tests/pages.test.cjs` | Modify, including cache keys |
| `docs/DIVINATION.md`, `docs/SITE-STRUCTURE.md` | Modify |

## Out of scope

- Commentary layers: the Judgement, the Image, and the Ten Wings.
- The "all lines changing" texts for hexagrams 1 and 2.
- Nuclear hexagrams.
- Any backend change.

## Constraints

Part E of the program spec binds unchanged. The copyright rule above is absolute: every text is
written fresh.
