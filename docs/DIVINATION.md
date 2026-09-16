# Cards & divination

Added 2026-09-09. A separate room, now its own page at `/divination/#divination-room`, with mobile disclosure and five persistent-in-page practice states. No API, browser storage, cookies, account or newsletter requirement. Questions are escaped and held only in page memory; changing mode preserves draws and revealed cards. Reload resets them.

## Offerings

- Lenormand: all 36 traditional numbered symbols, original line emblems and meanings. Three- or five-card line, unique draws, centre focus, neighbouring pairs and mirrored ends, plus a third layout, the Grand Tableau, laying all 36 cards at once. Traditional Man/Woman names retained with inclusive contextual interpretation. See "Grand Tableau" below.
- Ishtar Reflection Oracle: 24 original cards with geometric botanical emblems, original writing and questions; single reflection or Notice/Nourish/Practice. Explicitly original, no claimed historical lineage.
- Runes: 24 Elder Futhark symbols rendered as vector marks, original modern reflective meanings; one-rune or Situation/Tension/Response. No blank rune or reversals. Distinguishes historical writing from modern divination.
- Geomancy: all 16 named patterns; four mothers, transposed daughters, parity-combined nieces, witnesses, judge and optional reconciler. Random mother rows or manually entered parity patterns. Read shield right to left; select any figure for meaning. Puer=1121, Puella=1211. A view switch also shows the same cast as a twelve-house chart with horary judgement steps; see "Geomantic house chart" below. No medical/factual predictive judgments.
- I Ching: all 64 hexagrams in King Wen order, cast with coins or the yarrow-stalk probabilities, or entered by hand. See "I Ching" below.

## Mechanics

Unbiased crypto rejection sampling and partial Fisher-Yates deal without replacement.
Geomantic combination maps each row sum to 1 if odd, 2 if even. Daughters transpose
mothers: daughter row i uses mother i's row. Nieces combine mothers1+2,3+4,
daughters1+2,3+4. Right witness combines nieces1+2, left witness nieces3+4;
judge combines witnesses; reconciler combines mother1 and judge. Repeated geomantic
figures are valid. All generated figure patterns are in the 16-symbol catalog.

## I Ching

Fifth practice, `divination-data.js`, `divination-engine.js`, `divination-art.js`
and `divination.js`. No raster art: the mode does not use `assets/divination-v2`
at all, and the back-of-card fan uses the seal glyph instead of an image.

**Data shape.** `hexagrams` holds 64 entries in King Wen order:
`{id, number:1..64, name (pinyin with tone marks), character, symbol (six-
character line string bottom-up, '1' yang, '0' yin), gloss (an original
three-to-five-word English gloss, not the Wilhelm or Legge titles), keyword,
meaning (original, 75+ characters), prompt (ends with '?')}`. `trigrams` holds
the 8 trigrams (`{name, character, image, symbol}`, three lines bottom-up).
`linePositions` holds six original one-paragraph reflections on what a
changing line at each position (bottom to top) traditionally draws attention
to. The line strings and King Wen order follow a standard reference (the
Unicode Yijing Hexagram Symbols chart, which fixes both); a structural test
enforces the King Wen pairing rule: for odd n, hexagram n+1 is n turned upside
down, except when that is the same figure, in which case it is n with every
line flipped. Every gloss, meaning, prompt and position text is original.

**Casting.** `castLine(method, random)` returns 6, 7, 8 or 9. `'coins'` sums
three coins, each `2 + random(2)` (tails 2, heads 3). `'yarrow'` maps
`random(16)` to 6 (0), 7 (1–5), 8 (6–12), 9 (13–15) — the 1/16, 5/16, 7/16,
3/16 yarrow probabilities. `random` defaults to the existing `randomInt`.
`castHexagram(method, random)` casts six lines bottom-up. The UI's "Casting
method" select offers Three coins or Yarrow-stalk probabilities.

**Manual entry.** A `<details>` "Cast with your own coins" offers six line
buttons (bottom to top) cycling 7 → 8 → 9 → 6 with spoken labels ("Line 1:
young yang. Change."), and a checkbox "Use the lines below" that makes the
cast button read those values instead of drawing.

**Changing lines and the relating hexagram.** `readLines(values, hexagrams)`
takes the hexagram table explicitly, so the engine stays data-free; it throws
unless given six values each 6–9. 7 and 9 are yang, 6 and 8 are yin; 6 and 9
are changing. It returns `{primary, changing (positions 0..5), relating
(hexagram index or null), primarySymbol, relatingSymbol}`; the relating
hexagram flips every changing line. Since individual line statements (爻辭) are
out of scope, each changing line is instead read through the six position
texts in `linePositions`, combined with the line number, standing in for the
line statements. When no line changes, a sentence says the figure stands as it
is; when lines do change, the relating hexagram is drawn beside the primary
one under "Where this may be moving", with its own gloss, meaning and prompt.

**Figures.** `DivinationArt.hexagram(values)` draws an inline SVG of six lines
bottom-up (yang solid, yin broken); every line is drawn the same way, and a
changing line is marked only by the traditional small circle (old yang) or
cross (old yin) placed beside it. `DivinationArt.hexagramFromSymbol(symbol)`
draws a plain figure, with no changing-line marks, for the library and the
relating hexagram.

**Journal payload.** `currentDraw()` returns `{kind:'iching', deck:'',
layout:method, question, focus:'', payload:{lines:[…6 values]}}`. `loadDraw`
validates the lines through `loadLines` (a sanitised copy, or `null` on
anything but six values 6–9, mirroring `loadIds`) and restores the casting
method from `layout` when it is `'coins'`, `'yarrow'` or `'manual'`.

**Tests.** `tests/divination.test.cjs` (10 tests) checks: 64 unique names and
line strings; the King Wen pairing rule for all 32 pairs; every hexagram's
lower and upper three lines match a trigram; hexagram 1 is 111111, 2 is
000000, 63 is 101010, 64 is 010101, 11 is 111000, 12 is 000111; `castLine`
distributions with an injected sequence (coins: 2+2+2 → 6, 3+3+3 → 9; yarrow:
each bucket boundary); `readLines` for no change, one change, all lines
changing (1 → 2), and rejection of bad input; `loadLines` sanitising; and
prose constraints (meaning length, prompt ends `?`, gloss word count 3–5) for
hexagrams and the six position texts. A Django test asserts that posting an
`iching` reading returns 201 (`server/ishtar/readings/tests/test_readings.py`;
see `server/ishtar/readings` and docs/ACCOUNTS.md "Service").

**Browser checks performed.** Casting with both the coin and yarrow methods,
manual line entry, changing-line sections and the relating figure, the library
and study card, `currentDraw()`/`loadDraw()` shapes inspected via the console,
the other four practices regression-checked alongside it, and 390px layout
with no page overflow. All verified by DOM inspection because the browser
pane's screenshots rendered blank. The signed-in journal save of an I Ching
reading was not exercised in the browser (see docs/deployment.md).

## Grand Tableau

A third Lenormand layout, added 2026-09-16, `divination-engine.js`, `divination-data.js`
and `divination.js`. It reuses the existing Lenormand catalogue and artwork; no new art
assets were added.

**Geometry.** Positions are 1-based. `cellOf(p) = {row: floor((p-1)/8), col: (p-1)%8}`
places positions 1–32 in four rows of eight. `tableauNear(p)` returns every other
position in 1–32 within one row and one column of `p` (up to eight neighbours, fewer at
edges and corners); `tableauKnight(p)` returns positions a chess knight's move away
(`{|Δrow|, |Δcol|} = {1, 2}`). Both return `[]` for any `p` outside 1–32, so the four
closing positions never have near or knight cells. The four corners are fixed at
`[1, 8, 25, 32]` and the closing row at `[33, 34, 35, 36]`.

**`tableau(ids, significator='none')`.** `ids` must be a 36-length permutation of 0–35,
or it throws "A Grand Tableau needs all 36 cards once each". `significator` is `'man'`,
`'woman'` or `'none'` (default); anything else throws "Choose the Man, the Woman or
none". The Man is Lenormand id 27 (card 28) and the Woman id 28 (card 29)
(`SIGNIFICATORS = {man: 27, woman: 28}`). It returns `{cells: [{position, id, house}],
significator, significatorPosition, near, knight, corners, closing}`; `house` is
`position - 1`, the index into `tableauHouses`. `near` and `knight` are only populated
when a significator is chosen; `corners` and `closing` always are.

**`loadTableau(payload)`** validates `payload.ids` as a 36-permutation (`null` if not),
sanitises `significator` to one of the three values (default `'none'`) and `selected` to
an integer 0–35 (default 0), and returns fresh copies.

**UI.** Lenormand's "Reading layout" select gains a third option, "Grand Tableau · all 36
cards", alongside the three- and five-card lines. Choosing it (or loading a saved Grand
Tableau) reveals a "Significator" select — None (default), The Man, The Woman — that stays
hidden for the shorter lines. All 36 cards are laid face up at once; unlike the shorter
lines, there is no tap-to-reveal step. The grid places positions 1–32 in an eight-column
CSS grid, then a "Closing row" label, then positions 33–36 centred under it. Each cell
shows its position number, card art, name, a "House of the ⟨name⟩" caption and, when a
significator is set, a "Significator", "Near" or "Knight" badge. Selecting a cell
re-renders only the reading article below the grid — the position, house name, card
keyword, the house's own line from `tableauHouses`, the card's meaning and prompt, and a
"View artwork" button. Below that, "Reading the tableau" lists the cards near the
significator and a knight's move away (only when the significator sits in positions
1–32), the four corners, and the closing row; with no significator it invites choosing
one, and with a significator in the closing row it explains that the row sits outside the
grid for nearness and knighting.

**Phone.** At 700px and narrower the tableau keeps its eight-column grid at a 660px
minimum width and scrolls horizontally inside its own box, and every cell's card image is
hidden (`.dv-tableau-cell > .dv-artwork { display: none }`) — only the position number,
name and house caption remain, so all 36 cells stay legible without 36 card images
crowding the row, and the 36 lazy-loaded images are never requested on a phone. The house-chart view, by contrast, keeps its (smaller) card art on
phone; see "Geomantic house chart" below.

**House copy.** `tableauHouses` (`divination-data.js`) holds one original sentence per
position, index-aligned with `lenormand` — position 1 (the Rider) is "news, messages and
things arriving from outside," position 36 (the Cross) is "duty, responsibility and
matters that carry real weight." Each line names the house's own domain, not the specific
card that lands there, since any of the 36 cards can occupy any position.

**Journal.** `currentDraw()` returns `{kind: 'grand-tableau', layout: 'all 36 cards',
payload: {ids, significator, selected}, summary}`. When a significator is chosen, the
summary names it and the card whose position it landed in (e.g. "Grand Tableau · the Man
in the house of the Woman"); when none is chosen, it lists whichever four cards occupy the
corners of that draw ("Grand Tableau · corners: ⟨card⟩, ⟨card⟩, ⟨card⟩, ⟨card⟩"), truncated
to 120 characters. `loadDraw` maps the saved `grand-tableau` kind back onto the Lenormand
practice state, validates the payload with `loadTableau`, sets the layout to 36 cards and
marks every card revealed (the layout has no reveal state to restore).

**Tests.** `tests/divination.test.cjs` checks `tableauNear`/`tableauKnight` against
hand-built lists for the top-left and top-right corners (1, 8, both also in the fixed
`corners` list), an interior cell (12), a non-corner cell in the bottom row (28), and a
closing-row position (34, both empty); `tableau` finds the Man at
position 28 and the Woman at 29 in an identity permutation, returns `null`/`[]` for no
significator, empties `near` when the significator moves into the closing row, and throws
on a short array, a duplicate id, or an unknown significator; `loadTableau` sanitises or
rejects malformed payloads.

## Geomantic house chart

A view switch inside Geomancy, added 2026-09-16 — "Shield" or "House chart" — showing the
same sixteen-figure cast, from `divination-engine.js`'s `houseChart`, `houseDistance`,
`judge`, `loadHouses` and `divination.js`'s house-chart view functions. The shield itself
is unchanged; this is a second reading of the same `shield()` result, not a different
cast.

**Placement.** `houseChart(chart)` requires a full shield's `mothers`, `daughters` and
`nieces` (each a four-figure array) and returns twelve figures in house order: mothers in
houses 1–4, daughters in 5–8, nieces in 9–12. Houses run in a circle:
`houseDistance(a, b) = min(|a−b| mod 12, 12 − (|a−b| mod 12))`, so houses 12 and 1 are one
house apart and houses 11 and 2 are three apart. Two figures "match" when their four-row
point patterns are identical, regardless of which mother, daughter or niece produced them.

**`judge(houses, quesited)`.** `houses` must have exactly 12 entries; `quesited` must be
an integer 2–12 (house 1 is always the querent, so `quesited` of 1 or out of range throws
a `RangeError`). Given house 1's figure (the querent) and the quesited house's figure:
- **passage** — every house other than 1 holding the querent's figure (this can include
  the quesited house itself, if it shares the querent's figure).
- **occupation** — `true` when the querent's and quesited figures are identical.
- **conjunction** — `true` when a passage house other than the quesited house sits one
  house from the quesited house, or a house holding the quesited figure (other than house
  1 or the quesited house) sits one house from house 1.
- **mutation** — `true` when some circular neighbouring pair of houses, neither of them
  house 1 or the quesited house, holds the querent's and quesited figures side by side (in
  either order).
- **translation** — for every house next to house 1 and every *different* house next to
  the quesited house (both excluding house 1 and the quesited house), a `{from, to}` entry
  when the two hold the same figure. Requiring the two houses to differ was a bug fix made
  on this branch: a single house that sits next to both house 1 and the quesited house
  (for example house 2, next to both house 1 and house 3) does not by itself count as a
  translation — the figure has to travel between two distinct houses, not merely sit
  beside both from one.
- **aspects** — for each passage house other than the quesited house itself, when its
  house-distance to the quesited house is 2, 3, 4 or 6, an aspect (sextile, square, trine,
  opposition respectively); distances of 1 and 5 get no aspect.

**`loadHouses(payload)`** validates `payload.mothers` by running it through `shield()` (so
invalid mother figures fail the same way a fresh cast would), then returns sanitised
`mothers`, `quesited` (2–12, default 7) and `selected` (1–12, default 1), or `null` if
`payload` isn't an object or the mothers are invalid.

**UI.** The Shield/House chart switch sits above the output; switching re-renders the same
cast and toggles the About section's house-chart paragraph. The house view opens with a
"The quesited house" select listing houses 2–12 by name — house 1 is never selectable,
since it is fixed as the querent — defaulting to house 7. A four-by-three grid of the
twelve houses follows (house name, figure art and name, and a "Querent"/"Quesited" badge
on house 1 and the chosen quesited house), with the witnesses, judge and reconciler listed
beside it on wide screens and below it on narrow ones. Selecting a house re-renders only
the reading article, showing the house's matter (from `houseMatters`) and the figure's own
meaning and prompt. Changing the quesited house re-renders the whole output.

**Judgement.** Below the chart, the judgement steps are written out in past-tense horary
voice, explicitly giving no verdict ("It gives no verdict on the question."): (1) the
figures in house 1 and the quesited house; (2) passage, the other houses carrying the
querent's figure; (3) perfection, checking for occupation, conjunction, mutation and
translation, each explained in a sentence naming the actual houses and figures involved
(a display-only helper kept in sync with, and checked against, `judge`'s own logic); (4)
aspects, listing each passage house's aspect to the quesited house, or one of three
explanatory sentences when there are none (no passage at all; the only passage house is
the quesited house itself; or no passage house stands 2, 3, 4 or 6 houses away).

**Phone.** At 700px and narrower the house grid drops to three columns and the side list
(witnesses, judge, reconciler) becomes a four-column row below the grid, with smaller
artwork — the card art itself stays visible, unlike the Grand Tableau's phone view above.

**Journal.** `currentDraw()` returns `{kind: 'geomancy-houses', layout: 'twelve houses',
payload: {mothers, quesited, selected}, summary}`; the summary names the quesited house
and its figure, in the shape "House chart · house 7, Partners and Agreements: Puella",
truncated to 120 characters. `loadDraw` maps `geomancy-houses` back onto the Geomancy
practice, validates the payload with `loadHouses`, rebuilds the shield from the saved
mothers, and sets the practice's view to houses and its quesited house to the saved value.

`saveControl()`'s save button now reads its saved-kind attribute from
`currentDraw()?.kind`, falling back to the practice name only when there is no draw yet.
This is needed because the Lenormand and Geomancy practices can each save under two
different kinds depending on the current reading (`lenormand`/`grand-tableau`,
`geomancy`/`geomancy-houses`), so the practice name alone no longer identifies which kind
to save.

**About copy.** The About section's house-chart paragraph (shown only while this view is
active) states the placement, the circular adjacency, the four perfection definitions and
the aspect count as coded above, and closes: "Traditions differ over the placement, these
definitions and how the steps were weighed, so this is one reading among several." It
links two Princeton pages, both anchors on the same page used for the shield's own source:
[the geomantic houses](https://www.princeton.edu/~ezb/geomancy/geostep.html#houses) and
[methods of interpretation](https://www.princeton.edu/~ezb/geomancy/geostep.html#methods).

**Tests.** `tests/divination.test.cjs` checks house placement against a hand-built shield;
`houseDistance`'s circular wrap (12↔1 is 1, 11↔2 is 3); `judge` against hand-built charts
covering occupation, conjunction from both directions, mutation, translation and each of
the four aspects, plus rejection of an out-of-range quesited house and a short house
array; `loadHouses` sanitising and rejection; the two-different-houses translation fix
directly (a figure shared by two houses that both neighbour house 1 and the quesited house
is not a translation, but the same figure in two distinct neighbouring houses is); and a
structural check — the view's own judgement code, lifted out of `divination.js` and run
standalone — that it names a location for every conjunction and mutation `judge` finds,
sampled across a broad share of the 65,536 possible casts and every quesited house.

## Saved kinds

Migration `0005_reading_kind_c4.py` (`server/ishtar/readings/migrations/`, on top of
`0004_alter_reading_kind`) adds three choices to `Reading.kind`: `grand-tableau` ("Grand
Tableau"), `geomancy-houses` ("Geomantic house chart") and `cartomancy` ("Playing cards"),
all in the `divination` category (`server/ishtar/readings/kinds.py`). `rooms.js`'s `PAGES`
and `LABELS` list all three, but only `grand-tableau` and `geomancy-houses` are registered
with `Rooms.register()` in `divination.js` and carry `data-room` markup on
`#divination-room`. `cartomancy` exists server- and `rooms.js`-side one release early — its
own room ships in C4c — so a saved `cartomancy` reading cannot yet be created, and if one
existed it would resolve to `'unknown'` in `Rooms.openFromQuery`.

Django tests (`server/ishtar/readings/tests/test_readings.py`) check that all three C4
kinds carry the `divination` category (`test_c4_kinds_are_divination`), that the existing
kinds are still present (`test_existing_kinds_are_still_present`), and that a
`grand-tableau` reading round-trips through create and read
(`test_grand_tableau_saves_and_reads_back`). As with every kind added here before, the
backend must deploy and the `ishtar-app` service must restart before the frontend ships —
`KINDS` is read into module scope at import, so an unrestarted worker rejects the new
kinds with "Unknown reading kind."

## Sources and conventions

- Petit Lenormand 36-card system and line layouts: https://www.usgamesinc.com/tarot-and-inspiration/all-products/dreaming-way-lenormand.html
- Historical 24-character Elder Futhark: https://natmus.dk/historisk-viden/temaer/runer/runer-i-jernalderen/
- Shield construction: https://www.princeton.edu/~ezb/geomancy/geostep.html
- The geomantic houses (anchor on the shield-construction page): https://www.princeton.edu/~ezb/geomancy/geostep.html#houses
- Methods of interpretation, including translation, occupation, conjunction and mutation (anchor on the same page): https://www.princeton.edu/~ezb/geomancy/geostep.html#methods
- Historical figure naming variations: https://www.princeton.edu/~ezb/geomancy/figures.html
- King Wen sequence and the 64 hexagram line patterns: https://www.unicode.org/charts/PDF/U4DC0.pdf

All explanatory readings, prompts and SVG emblems are original site content; no
publisher card art or guidebook readings are reproduced. Meanings are framed as symbolic
reflection. Oracle emblems are decorative original motifs, not a traditional alphabet.

## Validation

`node --test tests/*.test.cjs` — 538 passing tests across the whole suite.
`tests/divination.test.cjs` has 19: the original ten (catalog completeness,
without-replacement draws, a hand-calculated shield fixture, invalid input,
exhaustive judge parity/named-figure checks for all 65,536 mother casts, and
the I Ching set — see "I Ching" above), plus nine added for the Grand Tableau
and the geomantic house chart — see "Grand Tableau" and "Geomantic house
chart" above for what each covers.

The Django readings suite (`server/ishtar/readings/tests/test_readings.py`,
run with `.venv/Scripts/python.exe manage.py test` from `server/ishtar`) has
16 passing tests, up from 14 before this branch: `test_grand_tableau_saves_and_reads_back`
and `test_c4_kinds_are_divination` are new — see "Saved kinds" above.

Browser checks cover all five practices (I Ching's own checks are recorded in
"I Ching" above), reveal-next/all, state preservation when switching,
manual all-even shield => Populus, symbol library selection and 320/390px layouts.
The shield intentionally scrolls horizontally within its own container on narrow screens;
its screen-reader descriptions are positioned relative to each cell to avoid page overflow.
New scripts are divination-data.js, divination-engine.js, divination-art.js and divination.js,
with divination.css loaded after mobile-sections.css. divination.js initializes before
mobile-sections.js wraps the main sections. No runtime dependency added.

## GPT Image 2 artwork (2026-09-09)

103 generated WebP masters: 36 Lenormand faces, 24 Ishtar Reflection Oracle faces,
24 rune stone faces, 16 geomancy plaques, and one shared back each for Lenormand,
oracle and runes. Geomancy is a face-up shield with no hidden reverse.

Generated with the bundled imagegen CLI, model gpt-image-2, medium quality,
960×1536 for cards and 768×960 for stones/plaques, WebP compression 92.
Full original prompts and generation settings: output/imagegen/divination-v2/prompts.json.
Masters remain in that directory. tools/prepare_divination_art.cjs reproduces the prompt list.

Run tools/export_divination_art.ps1 -RequireComplete to create 480px-wide WebP
thumbnails at quality 84 in assets/divination-v2 and detail copies in its large folder.
Only the assets directory is deployed; prompt manifests and source output stay local.
Detail images load when the Face/Back artwork dialog opens. Library images lazy-load.

Rune and geomancy marks are exact SVG overlays over intentionally blank image centers.
Fehu branches, Eihwaz lower hook and Perthro open side were corrected during visual review;
reference glyph comparison: https://www.unicode.org/charts/PDF/U16A0.pdf.
No generated letters or dots are relied on for the divination symbols.

Visitors can preview the back before drawing, enlarge a revealed card, or use the
library's View artwork control. The dialog supports Face/Back, Escape, visible keyboard
focus and focus restoration.
