# C4b Divination layouts: the Lenormand Grand Tableau and the geomantic house chart

Date: 2026-09-16. Status: design.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C4. The split is recorded in `2026-09-14-numerology-depth-design.md`: C4a shipped; C4b is this spec; C4c (playing cards) and C4d (I Ching line texts) follow.

## Purpose

This spec adds two larger readings to the two existing practices on `/divination/`:

- **The Grand Tableau:** all 36 Lenormand cards laid in rows of eight, four rows deep, with a final row of four. Each position is a house. The reader may name a significator; the page then shows the cards near it, the cards a knight's move away, and the four corners.
- **The geomantic house chart:** the twelve figures of the existing shield placed in the twelve astrological houses. The chart is read by the traditional judgement steps for a chosen question house.

Both are saveable. The program spec lists their kinds, `grand-tableau` and `geomancy-houses`, so this sub-project adds kinds, a migration, and a backend-first deploy.

## What exists

- **`divination.js`:** one dense module with five practice tabs. Lenormand offers three- and five-card lines; Geomancy casts a shield from four mothers, either random or hand-made. State lives per practice. `DivinationRoom.currentDraw` and `loadDraw` feed `Rooms.register` for the five existing kinds.
- **`divination-engine.js`:** `draw(size, count)` shuffles without replacement. `shield(mothers)` returns `{mothers, daughters, nieces, witnesses, judge, reconciler, all}`. `loadIds` accepts at most five ids.
- **`divination-data.js`:** `lenormand` holds the 36 cards in standard order. Card 28, the Man, is id 27; card 29, the Woman, is id 28. `figures` holds the 16 figures, each with a four-row point symbol written top to bottom.
- **Server:** `kinds.py` is the kind registry. `Reading.kind` is a `CharField` with choices, so adding a kind needs a migration. Workers read `KINDS` at import time, so the service must restart.

## Decisions

Every decision here is mine, taken under Glenn's instruction to complete C4 in the same unattended way as C3.

| Decision | Choice | Cost if wrong |
|---|---|---|
| Kinds added | `grand-tableau` ("Grand Tableau"), `geomancy-houses` ("Geomantic house chart"), and `cartomancy` ("Playing cards"), all in category `divination`, in one migration | `cartomancy` exists server-side one release before its room. A kind with no room is harmless: the journal simply has nothing to save under it yet |
| Where the Grand Tableau lives | A third Lenormand layout, "Grand Tableau · all 36 cards", beside the three- and five-card lines | None |
| Tableau layout | Rows of eight in positions 1–32, then a final row of four in positions 33–36. Position *n* is the house of card *n* | Some readers use 9×4. The About section names the layout |
| Reveal | All 36 cards are laid face up at once | None |
| Significator | Reader's choice of the Man, the Woman, or none; none is the default | None |
| Nearness | The cards in the up-to-eight cells touching the significator, within the 8×4 grid | Some readers weigh distance in more steps. This site shows one ring |
| Knighting | The cells a chess knight's move from the significator, within the 8×4 grid | None |
| Corners | Positions 1, 8, 25 and 32, the corners of the 8×4 grid, read together | None |
| The final row | Positions 33–36 are read together as the closing cards. They take no part in nearness or knighting, and the page says so when the significator lands there | None |
| House copy | One original line per house, naming the house card and its theme. The card's existing meaning is reused for the card in the house | None |
| Where the house chart lives | A view switch inside Geomancy, "Shield" or "House chart", on the same cast | None |
| House placement | Mothers 1–4 in houses 1–4, daughters 1–4 in houses 5–8, nieces 1–4 in houses 9–12. The witnesses, judge and reconciler are shown beside the chart | None; this is the common Renaissance placement |
| Querent and quesited | The querent is house 1. The reader chooses the quesited house from the eleven others by its matter; house 7 is the default | None |
| Judgement steps | Presented in the historical past tense, in the horary voice: (1) the figure in the quesited house; (2) passage: the other houses where the querent's figure appears; (3) perfection by occupation (the same figure in houses 1 and quesited), conjunction (the querent's figure in a house next to the quesited, or the quesited's figure next to house 1), mutation (the two figures side by side elsewhere) or translation (one figure appearing next to both house 1 and the quesited house); (4) aspects: for each house the querent's figure passes into, its aspect to the quesited house by house count (sextile 2, square 3, trine 4, opposition 6, counted the shorter way round) | Traditions differ in detail. The About section names this as one common method, not the only one |
| Adjacency | Circular: house 12 sits next to house 1 | None |
| Verdicts | None. Each step says what the tradition looked for and whether this chart shows it, never whether the matter will happen | None |
| Sources | Linked only after the URL is checked to return 200 and to cover the topic; otherwise the tradition is named without a link | None |

### Grand Tableau geometry

Positions are 1-based. For position *p* ≤ 32: `row = floor((p-1)/8)` (0–3) and `col = (p-1) mod 8` (0–7).

```
near(p)    = positions q ≤ 32, q ≠ p, with |row−row'| ≤ 1 and |col−col'| ≤ 1
knight(p)  = positions q ≤ 32 with {|Δrow|, |Δcol|} = {1, 2}
corners    = [1, 8, 25, 32]
closing    = [33, 34, 35, 36]
```

### House chart geometry

```
houses[1..4]  = mothers[0..3]
houses[5..8]  = daughters[0..3]
houses[9..12] = nieces[0..3]
adjacent(h)   = {h−1, h+1} with 12 and 1 adjacent
distance(a,b) = min(|a−b|, 12−|a−b|)
aspect(d)     = {2: sextile, 3: square, 4: trine, 6: opposition}[d]
```

Figures are compared by their point pattern.

## Architecture

- **`divination-engine.js`** gains the pure functions `tableau(ids, significator)` → `{cells, significatorPosition, near, knight, corners, closing}` and `loadTableau(payload)`, plus `houseChart(shield)`, `judge(chart, quesited)` → `{quesitedFigure, passage, occupation, conjunction, mutation, translation, aspects}` and `loadHouses(payload)`.
- **`divination-data.js`** gains `tableauHouses`, 36 original house lines, and `houseMatters`, twelve short house names with one-line matters, written for this site.
- **`divination.js`** gains the Grand Tableau layout and the house chart view. `currentDraw` and `loadDraw` handle the two new kinds, and `Rooms.register` covers them.
- **`rooms.js`** gains pages and labels for the three new kinds. **`server/ishtar/readings/kinds.py`** gains the three kinds, with migration `0005` and server tests.

**Payloads:**
- `grand-tableau`: `{ids: <36-permutation>, significator: 'man'|'woman'|'none', selected: 0–35}`. The summary names the significator's house, or the four corners when there is no significator.
- `geomancy-houses`: `{mothers, quesited: 2–12, selected: 1–12}`. The summary names the quesited house and its figure.

## Deploy

Two stages, backend first, as in the sky release.

1. Ship `server/ishtar` with `git archive` to `/tmp/ishtar-app-src`, strip CRs, and run `/tmp/deploy-app.sh`. Confirm migration `0005` applied, the service restarted after the deploy started, and `/api/health/` answered.
2. Ship the static release through a gated script that refuses to run unless the deployed `kinds.py` contains `grand-tableau`.

## Testing

- **Engine.**
  - Every position's `near` and `knight` sets, checked against hand lists for a corner, an edge, an interior cell and a final-row cell.
  - `tableau` refuses a non-permutation.
  - House placement is checked against a hand-built shield.
  - `judge` is checked on hand-built charts, one per perfection mode and one per aspect, plus a chart with none.
  - Adjacency wraps from 12 to 1.
  - Loaders reject malformed payloads.
- **Copy.** All 36 house lines and 12 matters exist and pass the predictive scan.
- **Server.** The three kinds exist with their category; `0005` is present; a `grand-tableau` save round-trips.
- **Browser.**
  - Both views render.
  - Choosing a significator highlights its near cells and knight cells.
  - Changing the quesited house updates the steps.
  - Save and reopen work for both kinds.
  - The layout holds at 390px (the 8×4 grid scrolls inside its own box) and at 1400px.

## Files

| File | Change |
|---|---|
| `server/ishtar/readings/kinds.py`, `migrations/0005_*.py`, `tests/test_readings.py` | Add the three kinds |
| `rooms.js`, `tests/rooms.test.cjs` | Add pages and labels |
| `divination-engine.js`, `divination-data.js`, `divination.js`, `divination.css` | The two readings |
| `divination/index.html` and every page loading a changed file | Cache keys |
| `tests/divination.test.cjs` | Engine, data and copy tests |
| `docs/DIVINATION.md`, `docs/SITE-STRUCTURE.md` | Conventions, sources and kinds |

## Out of scope

- The playing-card room (C4c) and I Ching line texts (C4d).
- Reversed Lenormand cards, 9×4 tableaux, and distance weighting beyond one ring.
- Geomantic house-chart variants that place figures differently.
- Company, and the index figure (Part of Fortune).
- Any geomantic verdict.

## Constraints

Part E of the program spec binds unchanged.
