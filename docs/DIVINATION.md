# Cards & divination

Added 2026-09-09. A separate room at #divination-room with mobile disclosure and four persistent-in-page practice states. No API, browser storage, cookies, account or newsletter requirement. Questions are escaped and held only in page memory; changing mode preserves draws and revealed cards. Reload resets them.

## Offerings

- Lenormand: all 36 traditional numbered symbols, original line emblems and meanings. Three- or five-card line, unique draws, center focus, neighboring pairs and mirrored ends. Traditional Man/Woman names retained with inclusive contextual interpretation. No Grand Tableau or automatic person selection.
- Ishtar Reflection Oracle: 24 original cards with geometric botanical emblems, original writing and questions; single reflection or Notice/Nourish/Practice. Explicitly original, no claimed historical lineage.
- Runes: 24 Elder Futhark symbols rendered as vector marks, original modern reflective meanings; one-rune or Situation/Tension/Response. No blank rune or reversals. Distinguishes historical writing from modern divination.
- Geomancy: all 16 named patterns; four mothers, transposed daughters, parity-combined nieces, witnesses, judge and optional reconciler. Random mother rows or manually entered parity patterns. Read shield right to left; select any figure for meaning. Puer=1121, Puella=1211. No astrological house assignment or medical/factual predictive judgments.

## Mechanics

Unbiased crypto rejection sampling and partial Fisher-Yates deal without replacement.
Geomantic combination maps each row sum to 1 if odd, 2 if even. Daughters transpose
mothers: daughter row i uses mother i's row. Nieces combine mothers1+2,3+4,
daughters1+2,3+4. Right witness combines nieces1+2, left witness nieces3+4;
judge combines witnesses; reconciler combines mother1 and judge. Repeated geomantic
figures are valid. All generated figure patterns are in the 16-symbol catalog.

## Sources and conventions

- Petit Lenormand 36-card system and line layouts: https://www.usgamesinc.com/tarot-and-inspiration/all-products/dreaming-way-lenormand.html
- Historical 24-character Elder Futhark: https://natmus.dk/historisk-viden/temaer/runer/runer-i-jernalderen/
- Shield construction: https://www.princeton.edu/~ezb/geomancy/geostep.html
- Historical figure naming variations: https://www.princeton.edu/~ezb/geomancy/figures.html

All explanatory readings, prompts and SVG emblems are original site content; no
publisher card art or guidebook readings are reproduced. Meanings are framed as symbolic
reflection. Oracle emblems are decorative original motifs, not a traditional alphabet.

## Validation

`node --test tests/*.test.cjs` — 72 passing tests, including five new tests for
catalog completeness, without-replacement draws, a hand-calculated shield fixture,
invalid input and exhaustive judge parity/named-figure checks for all65,536 mother casts.
Browser checks cover all four practices, reveal-next/all, state preservation when switching,
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
