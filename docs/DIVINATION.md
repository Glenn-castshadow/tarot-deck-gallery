# Cards & divination

Added 2026-09-09. A separate room at #divination-room with mobile disclosure and five persistent-in-page practice states. No API, browser storage, cookies, account or newsletter requirement. Questions are escaped and held only in page memory; changing mode preserves draws and revealed cards. Reload resets them.

## Offerings

- Lenormand: all 36 traditional numbered symbols, original line emblems and meanings. Three- or five-card line, unique draws, center focus, neighboring pairs and mirrored ends. Traditional Man/Woman names retained with inclusive contextual interpretation. No Grand Tableau or automatic person selection.
- Ishtar Reflection Oracle: 24 original cards with geometric botanical emblems, original writing and questions; single reflection or Notice/Nourish/Practice. Explicitly original, no claimed historical lineage.
- Runes: 24 Elder Futhark symbols rendered as vector marks, original modern reflective meanings; one-rune or Situation/Tension/Response. No blank rune or reversals. Distinguishes historical writing from modern divination.
- Geomancy: all 16 named patterns; four mothers, transposed daughters, parity-combined nieces, witnesses, judge and optional reconciler. Random mother rows or manually entered parity patterns. Read shield right to left; select any figure for meaning. Puer=1121, Puella=1211. No astrological house assignment or medical/factual predictive judgments.
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

## Sources and conventions

- Petit Lenormand 36-card system and line layouts: https://www.usgamesinc.com/tarot-and-inspiration/all-products/dreaming-way-lenormand.html
- Historical 24-character Elder Futhark: https://natmus.dk/historisk-viden/temaer/runer/runer-i-jernalderen/
- Shield construction: https://www.princeton.edu/~ezb/geomancy/geostep.html
- Historical figure naming variations: https://www.princeton.edu/~ezb/geomancy/figures.html
- King Wen sequence and the 64 hexagram line patterns: https://www.unicode.org/charts/PDF/U4DC0.pdf

All explanatory readings, prompts and SVG emblems are original site content; no
publisher card art or guidebook readings are reproduced. Meanings are framed as symbolic
reflection. Oracle emblems are decorative original motifs, not a traditional alphabet.

## Validation

`node --test tests/*.test.cjs` — 197 passing tests across the whole suite.
`tests/divination.test.cjs` has 10, including the original five for catalog
completeness, without-replacement draws, a hand-calculated shield fixture,
invalid input and exhaustive judge parity/named-figure checks for all 65,536
mother casts, plus the I Ching tests added later (see "I Ching" above).
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
