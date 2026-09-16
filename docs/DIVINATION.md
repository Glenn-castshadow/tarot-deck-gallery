# Cards & divination

Added 2026-09-09. A separate room, now its own page at `/divination/#divination-room`, with mobile disclosure and six persistent-in-page practice states. No API, browser storage, cookies, account or newsletter requirement. Questions are escaped and held only in page memory; changing mode preserves draws and revealed cards. Reload resets them.

## Offerings

- Lenormand: all 36 traditional numbered symbols, original line emblems and meanings. Three- or five-card line, unique draws, centre focus, neighbouring pairs and mirrored ends, plus a third layout, the Grand Tableau, laying all 36 cards at once. Traditional Man/Woman names retained with inclusive contextual interpretation. See "Grand Tableau" below.
- Ishtar Reflection Oracle: 24 original cards with geometric botanical emblems, original writing and questions; single reflection or Notice/Nourish/Practice. Explicitly original, no claimed historical lineage.
- Runes: 24 Elder Futhark symbols rendered as vector marks, original modern reflective meanings; one-rune or Situation/Tension/Response. No blank rune or reversals. Distinguishes historical writing from modern divination.
- Geomancy: all 16 named patterns; four mothers, transposed daughters, parity-combined nieces, witnesses, judge and optional reconciler. Random mother rows or manually entered parity patterns. Read shield right to left; select any figure for meaning. Puer=1121, Puella=1211. A view switch also shows the same cast as a twelve-house chart with horary judgement steps; see "Geomantic house chart" below. No medical/factual predictive judgments.
- I Ching: all 64 hexagrams in King Wen order, cast with coins or the yarrow-stalk probabilities, or entered by hand. See "I Ching" below.
- Playing cards: an ordinary 52-card deck, four suits ace to king, no jokers, upright only, drawn as original vector faces generated in code. One card or three, with suit themes framed as common modern associations, explicitly named as one convention among several. See "Playing cards" below.

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
hexagram flips every changing line. Each changing line is read through its own
original line text (see "Line texts" below); the kicker above it still names the
line number and its position title from `linePositions`. When no line changes, a sentence says the figure stands as it
is; when lines do change, the relating hexagram is drawn beside the primary
one under "Where this may be moving", with its own gloss, meaning and prompt.

**Line texts.** `iching-lines.js` (C4d, 2026-09-16) is a pure UMD data module,
`IChingLines = {lines, forLine(number, index), has(number)}`. `lines[n]` holds six
strings for hexagram `n`, bottom line first, for all 64 hexagrams (384 texts). Each
is one paragraph of two or three sentences on the situation that line has
traditionally described, in the site's reflective second person. They are not
translations: the traditional line statements (爻辭) are not reproduced, and the
texts were written fresh, with at most a line's traditional image named in a few
words. They were written in eight batches of eight hexagrams, each reviewed for
closeness to published translations (Wilhelm/Baynes, Legge, Lynn and others),
for fidelity to the line and for voice, and revised until the reviews passed.
They carry no verdicts: none of "good fortune", "misfortune", "no blame",
"remorse", "humiliation", "perseverance furthers" or "the superior man", and no
predictions. `forLine` returns `null` for an unknown hexagram or an index outside
0–5. When every line of hexagram 1 or 2 changes, the classic adds a seventh
statement (用九, 用六); the site shows only the six line texts.

Where they show: in a reading, each changing line's paragraph under the primary
hexagram; in the library, the study card lists all six lines ("Line n · position
title", bottom first) in a `<section class="dv-iching-lines" aria-label="The six
lines">` after the meaning. `divination.js` reads the module through a bare
`typeof IChingLines` guard. If the module is missing, or has no entry for a
hexagram, a changing line falls back to its `linePositions` text and the study
card omits the list. An entry is always complete (six texts) or absent.

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
`tests/iching-lines.test.cjs` (3 tests) checks every line text: six per
hexagram, non-empty, two or three sentences, no banned verdict or prediction
wording, no straight apostrophes, and all 384 unique; `forLine` and `has`
for valid and invalid arguments; and that all 64 hexagrams are present. A
wiring test in `tests/divination.test.cjs` runs `divination.js` with a stub
`IChingLines` covering only hexagram 1, and checks the changing-line texts, the
fallback for another hexagram, and the study card's list and its absence.

**Browser checks performed.** Casting with both the coin and yarrow methods,
manual line entry, changing-line sections and the relating figure, the library
and study card, `currentDraw()`/`loadDraw()` shapes inspected via the console,
the other four practices regression-checked alongside it, and 390px layout
with no page overflow. All verified by DOM inspection because the browser
pane's screenshots rendered blank. The signed-in journal save of an I Ching
reading was not exercised in the browser (see docs/deployment.md).
C4d line texts (2026-09-16, local preview): a reading of hexagram 63 with lines
1 and 4 changing showed both line texts under their kickers; the study card for
hexagram 29 listed six lines, bottom first; the practice note read the new wording;
at 375px the page was 375px wide with no overflow, and 1400px was fine; the
console had no script errors.

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

## Playing cards

Sixth practice, added 2026-09-16, `playing-cards.js` and `divination.js`. No raster art at
all: the 52 card faces are inline SVG generated in code, and the card back is a CSS
pattern rather than an image, so this practice makes no image requests of any kind — not
even the shared-back webp that Lenormand, oracle and runes each request through
`--dv-back`. (Geomancy has no hidden back in its shield, but its welcome fan still requests
`geomancy-00.webp` through `--dv-back`; the I Ching sets `--dv-back` to `none`.)

**Data shape.** `playing-cards.js`'s `SUITS` holds four entries in the fixed order hearts,
diamonds, clubs, spades (`{key, name, colour, path}`; hearts and diamonds are `'red'`,
clubs and spades `'black'`; `path` is the SVG pip mark for that suit). `RANKS` holds
thirteen entries ace to king (`{key, name, value: 1..13}`). `cards` is built with
`SUITS.flatMap((suit, s) => RANKS.map((rank, r) => ({id: s*13+r, ...})))`: 52 entries
`{id: 0..51, rank: 1..13, rankKey, suit, name: "<Rank> of <Suit>", keyword, meaning,
prompt}` in suit-then-rank order, so id 0 is the Ace of Hearts, id 12 the King of Hearts,
id 13 the Ace of Diamonds and id 51 the King of Spades. The copy (`COPY`, index-aligned
with `cards`) gives each card a keyword, a two- or three-sentence reflective meaning and a
prompt ending in a question mark — all original, and all 52 keywords and 52 meanings are
unique.

**Pip layouts, as coded.** `pips(rank)` returns coordinates as fractions of the card's
face area (x across, y down). An ace is a single centred pip, `[[.5, .5]]`. Ranks 11–13
(jack, queen, king) return `[]`, since court cards are drawn as a monogram instead of
pips. Ranks 2–10 come from the `LAYOUTS` table, built from two columns `COLS = [0.25,
0.75]` — a quarter and three-quarters of the way across the face:

```
2:  (.5,.2) (.5,.8)
3:  (.5,.2) (.5,.5) (.5,.8)
4:  (.25,.2) (.75,.2) (.25,.8) (.75,.8)
5:  4 + (.5,.5)
6:  (.25,.2) (.75,.2) (.25,.5) (.75,.5) (.25,.8) (.75,.8)
7:  6 + (.5,.35)
8:  6 + (.5,.35) (.5,.65)
9:  (.25,.2) (.75,.2) (.25,.4) (.75,.4) (.25,.6) (.75,.6) (.25,.8) (.75,.8) (.5,.5)
10: 8-of-the-9 (without its centre) + (.5,.3) (.5,.7)
```

**`svg(card)`.** Draws these onto a 200×300 card (`FACE = {x:30, y:40, w:140, h:220}`),
with every pip in the lower half rotated 180° as on a printed card (`mark(...)`'s `flip`
argument is `y > .5`). Rank and suit sit in two opposite corners — the second corner is
the same corner markup wrapped in a 180°-rotated group around the card's centre, not a
second literal copy — and an ace's single pip is drawn larger than the others. Court cards
(rank ≥ 11) get a rounded, stroked frame (`.pc-court`) holding the rank letter as a large
monogram in place of pips. Every face carries its rank letter and its suit shape, so
colour is never the only visual cue. The SVG also has a `<title>` and `aria-label` with the
card's full name (e.g. "King of Spades"), but inside this room it sits in an
`aria-hidden="true"` span (see "Artwork" below), so assistive technology takes the name
from the control around it instead.

## Suit associations

`divination.js`'s `SUIT_THEMES`, matching the per-suit comments inside the `COPY` array in
`playing-cards.js`: hearts for feeling and relationships, diamonds for resources and practical work, clubs for
effort, growth and exchange, spades for difficulty, decisions and clear thought. The
practice's "About this practice" note names these explicitly as "common modern
English-language associations" and says other traditions assign the suits differently.
Spades' copy is written to treat difficulty as something to work with rather than as
misfortune. No test can check that framing; what the deck's own test
(`tests/playing-cards.test.cjs`) does check, across all 52 cards, is that the keyword,
meaning and prompt contain none of a fixed list of predictive and fatalistic words ("will
happen", "fortune", "misfortune", "doom", "destined" and the like) and no straight
apostrophe.

## Layouts

One card ("What to notice") or three cards ("What is present", "What asks for attention",
"A next step") — `divination.js`'s `positions()`/`positionMeaning()` for `mode ===
'cartomancy'`. The three-card synthesis (`cartomancySummary`) reads the first card as
something already present, the second as what asks for attention, and closes on the
third card's own prompt as a next step; it then names the suits drawn — singular phrasing
when all three share a suit ("All three cards are Hearts, the suit of feeling and
relationships.") or a listed sentence when they don't — and asks the reader to notice
where the first two cards' keywords meet. The one-card synthesis turns the single card
into one small chosen action, in the same voice as the other one-card practices.

## Artwork

Vector, generated at draw time and again in the "Explore all 52 cards" library —
`visual()`'s `cartomancy` branch renders `PC.svg(item)` straight into the page inside an
`aria-hidden="true"` wrapper span, so the SVG's own `<title>` is hidden from assistive
technology and the accessible name comes from the control around it: the button text
(the card's name) in the library, the button's `aria-label` ("Enlarge King of Spades") in
the spread, and the `role="img"` label ("King of Spades face") in the artwork dialog. No
`<img>` is ever written for this practice, and no `assets/divination-v2` request or webp
master exists for it. The card back is CSS, not an image: `--pc-back` (`divination.css`)
is a two-layer diagonal `repeating-linear-gradient` weave. `render()` sets `--dv-back` to
`var(--pc-back)` for this practice, and the face-down cards in the spread and the welcome
fan take their pattern from `.dv-card:not(.is-revealed)` and `.dv-back-fan i` through
`--dv-back`; `.dv-card-back` inside a face-down card is only the ✧ glyph drawn over that
pattern. The artwork dialog's enlarged back view uses `--pc-back` directly through
`.dv-pc-back`, so it is the one "Back" side in this room's dialog that needs no fetched
image.

## Saving

`currentDraw()` gives cartomancy no special case: it falls through to the generic branch
shared with Lenormand, oracle and runes, `{kind: 'cartomancy', deck: '', layout:
String(ids.length), question, focus: '', payload: {ids}, summary}`, with `summary` the
drawn cards' names joined by " · " and truncated to 120 characters (e.g. "Ace of Hearts ·
King of Spades · Seven of Clubs"). `loadDraw` restores it through that same generic
branch. `E.loadIds` rejects anything but one to five distinct in-range ids, and
`loadDraw` then returns `false` unless the id count is one of the practice's own layout
options (`modes[kind].options`): one or three for cartomancy, oracle and runes, three or
five for Lenormand (whose 36-card tableau loads through its own `grand-tableau` branch).
A refused reading changes no state, so the practice still renders as it was. The `cartomancy` kind ("Playing cards", category
`divination`) already existed in `kinds.py`, migration `0005` and `rooms.js`'s
`PAGES`/`LABELS` as of C4b; C4c adds only the frontend room —
`Rooms.register('cartomancy', ...)` in `divination.js` and `cartomancy` in the
`data-room` list on `#divination-room` — so no backend change shipped with this practice.

**Tests.** `tests/playing-cards.test.cjs` (4 tests) checks the 52-card, suit-then-rank
catalogue and its named boundary cards; pip counts exact for ranks 2–10, one pip for an
ace, none for courts, every pip strictly inside the face (`0 < x,y < 1`), and no duplicate
pip within a rank; that every `svg(card)` names the card in its `<title>`, carries the
right `pc-red`/`pc-black` class and the right rank text, and draws the expected number of
`<path>` suit marks (two corner marks plus one per pip, or three for a court card); and
that every card's copy is present, unique, free of the banned predictive words and
straight apostrophes, and ends its prompt with a question mark. `tests/divination.test.cjs`
extends its save-button wiring test rather than gaining a new one, so it stays at 19
tests. The extension covers `cartomancy` (both a one- and a three-card draw) with a
card-count assertion against the rendered `pc-card` elements; a copy scan of the rendered
practice (intro, note, position labels and meanings, and the synthesis for one card, three
cards of one suit and three of mixed suits) against the same banned-word list and
straight-apostrophe check as the deck's own test; and refused loads (`loadDraw` returns
`false` for cartomancy with two or five ids and oracle with two, and the practice then
renders without throwing), alongside a Lenormand five-card line that still loads. `tests/pages.test.cjs` pins `playing-cards.js` into
`divination.js`'s expected script dependencies.

## Saved kinds

Migration `0005_reading_kind_c4.py` (`server/ishtar/readings/migrations/`, on top of
`0004_alter_reading_kind`) adds three choices to `Reading.kind`: `grand-tableau` ("Grand
Tableau"), `geomancy-houses` ("Geomantic house chart") and `cartomancy` ("Playing cards"),
all in the `divination` category (`server/ishtar/readings/kinds.py`). `rooms.js`'s `PAGES`
and `LABELS` list all three, and as of C4c all three are also registered with
`Rooms.register()` in `divination.js` and carry `data-room` markup on `#divination-room`:
`grand-tableau` and `geomancy-houses` since C4b, `cartomancy` since this release. Before
C4c shipped, `cartomancy` existed server- and `rooms.js`-side one release early — its own
room had not shipped yet, so a saved `cartomancy` reading could not be created, and if one
had existed it would have resolved to `'unknown'` in `Rooms.openFromQuery`. See "Playing
cards" above for what the room itself adds.

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

`node --test tests/*.test.cjs` — 546 passing tests across the whole suite, up from 542
before the I Ching line texts (C4d) added `tests/iching-lines.test.cjs` (3 tests) and one
wiring test in `tests/divination.test.cjs`, which is now 20. It was 19 after C4c, which gained no new test for cartomancy, since C4c
extended the existing save-button wiring test (the one- and three-card draws, the practice
copy scan and the refused-layout loads) rather than adding one — see "Playing cards" above. The original ten
(catalog completeness, without-replacement draws, a hand-calculated shield fixture,
invalid input, exhaustive judge parity/named-figure checks for all 65,536 mother casts,
and the I Ching set — see "I Ching" above) and the nine added for the Grand Tableau and
the geomantic house chart (see "Grand Tableau" and "Geomantic house chart" above) are
unchanged. `tests/playing-cards.test.cjs` is new and adds the other 4: the 52-card
catalogue in suit-then-rank order, pip layouts and their bounds for every rank, `svg()`'s
title/colour-class/rank-text/path-count output, and the deck's original, unique,
non-predictive copy — see "Playing cards" above for what each checks.

The Django readings suite (`server/ishtar/readings/tests/test_readings.py`,
run with `.venv/Scripts/python.exe manage.py test` from `server/ishtar`) still has
16 passing tests: C4c is a frontend-only room and shipped no backend change, so this
count is unchanged since C4b (`test_grand_tableau_saves_and_reads_back` and
`test_c4_kinds_are_divination` — see "Saved kinds" above — remain the only additions
over the pre-C4 count of 14).

Browser checks recorded here cover the five practices that predate this release (I
Ching's own checks are recorded in "I Ching" above): reveal-next/all, state
preservation when switching, manual all-even shield => Populus, symbol library
selection and 320/390px layouts. Playing cards reuses these same reveal, state and
library code paths, and its lack of any image request is additionally pinned by the
automated suite (`tests/divination.test.cjs` asserts no `<img`, `.webp` or
`divination-v2` string appears anywhere in the room's markup for a cartomancy draw).
The controller also browser-verified the playing-cards practice at 390px, 1100px and
1400px: one-card and three-card draws with the SVG faces; the art dialog; no image
requests; a save kind of `cartomancy`; the tab order, with I Ching as 05 and Playing cards
as 06; and the pluralised status line ("1 card laid face down. Reveal it below.").
The shield intentionally scrolls horizontally within its own container on narrow screens;
its screen-reader descriptions are positioned relative to each cell to avoid page overflow.
The room's scripts are divination-data.js, divination-engine.js, divination-art.js,
playing-cards.js, iching-lines.js and divination.js, in that order, and `divination/index.html` loads
styles.css, site-shell.css, account.css, divination.css and then mobile-sections.css. divination.js initializes before
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
