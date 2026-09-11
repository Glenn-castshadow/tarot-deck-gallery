# Jyotish (sidereal chart)

The celestial atlas reads the already-calculated natal chart a second way: against the
sidereal zodiac used by Vedic (Jyotish) astrology. Nothing is recalculated from scratch —
the Lagna, the nine grahas and their motion all come from `NatalEngine`'s tropical chart,
shifted by the ayanamsa. No birth details are sent to a chart API; everything runs in the
browser from the saved birth profile through `setBirthChart`.

## Included

- **Rashi chart** — the sidereal Lagna and the twelve rashis (Sanskrit name with the
  Western sign in parentheses), whole-sign bhavas counted from the Lagna, and the nine
  grahas (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu) with sign, degrees,
  house, nakshatra, pada and direction of motion. Uranus, Neptune and Pluto are not grahas
  and are not shown.
- **Nakshatras** — all twenty-seven lunar mansions (name, presiding deity, symbol and
  Vimshottari lord), with pada, for the Lagna and every graha; the Moon's nakshatra anchors
  the reading.
- **Dashas** — the Vimshottari mahadasha sequence from birth, the antardashas within any
  selected mahadasha, and the current mahadasha/antardasha for today.
- **Navamsa (D9) chart** — the same chart drawing fed navamsa placements instead of rashi
  placements, a placements table, and vargottama flags (same sign in D1 and D9).
- Two SVG chart formats — South Indian (fixed cells, the default) and North Indian
  (diamond, bhava 1 at top) — sharing one renderer (`jyotish-chart.js`) for both the Rashi
  and Navamsa charts, with a format toggle on each.
- Original reflective copy: twelve Lagna readings, nine graha themes, twenty-seven
  nakshatra readings (keyword, reflection and prompt), nine dasha-lord readings and twelve
  bhava one-liners. Traditional names, symbols, deities and the Vimshottari years are
  factual/traditional data and are not treated as original copy.
- A "Method & conventions" disclosure on every tab, and a "Try a sample chart" profile bar
  matching the rest of the atlas. Without a recorded birth time and confirmed birthplace the
  section shows the same "Add birth details" prompt used elsewhere in the atlas.

The section's own stylesheet is `jyotish.css`, but `jyotish.js` deliberately reuses classes
owned by neighbouring sections, the same way `chart-in-time.js` does. `.cx-profile-bar`,
`.cx-missing`, `.cx-empty` and `.cx-table-wrap` are defined in `celestial-extras.css`;
`.acg-eyebrow` and `.acg-small-label` are defined in `astrocartography.css`. `jyotish.css`
re-declares element rules under its own `.jyotish`/`.jy-*` classes rather than editing those
shared rules (its one direct touch is a print-mode border-color override scoped to
`.jyotish .cx-table-wrap`), so the section loses styling if any of those shared classes is
removed or renamed elsewhere.

## Conventions

### Ayanamsa

**The code's calibrated constant, not the design spec's textbook figure, is what ships.**
The spec (`docs/superpowers/specs/2026-09-12-jyotish-design.md`) describes Lahiri
(Chitrapaksha) per the Swiss Ephemeris `SIDM_LAHIRI` mode as 23°15′00.658″
(23.250182778°) at t₀ = JD 2435553.5 (1956-03-21). `jyotish-engine.js`'s `AYANAMSA_T0` is
instead **23.245560968496193°**, measured directly with `swe.get_ayanamsa_ut(2435553.5)`
from pyswisseph 2.10.03 (Moshier, `SIDM_LAHIRI`) during Task 2. The engine's own comment
records why: the textbook constant differed from the measured value by about 0.0046°,
above the project's 0.0005° calibration tolerance, so the measured value was adopted
instead. `tests/jyotish.test.cjs` checks the *engine* constant against the fixture's
independently recorded `ayanamsaAtT0` (from the same `build_jyotish_fixtures.py` run) to
within 0.0005° — a tight, single-value calibration check, distinct from the 0.005° band
used for the ayanamsa across the full 1901–2100 range further below.

From that anchor, `ayanamsa(date)` carries the value forward by the accumulated IAU 2006
general precession in longitude, `p(T) = 5028.796195T + 1.1054348T² + 0.00007964T³ −
0.000023857T⁴` arcseconds (T in Julian centuries from J2000):
`ayanamsa(t) = AYANAMSA_T0 + (p(T) − p(T₀)) / 3600`. Nutation is not applied to the
ayanamsa. Other ayanamsas (Raman, Krishnamurti, Fagan-Bradley) are out of scope; the UI
states the zodiac is Lahiri sidereal.

### Sidereal positions and grahas

Sidereal longitude = the natal chart's tropical apparent longitude minus the ayanamsa, mod
360°. The nine grahas are Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (the natal
mean north node) and Ketu (mean south node, 180° from Rahu); Uranus, Neptune and Pluto are
omitted. Retrograde flags come from the natal chart's points, except Rahu and Ketu, which
`sidereal()` always reports as retrograde (`p.kind === 'node'`), by convention rather than
by measured motion.

### Rashi chart and bhavas

Lagna is the sidereal Ascendant. Bhavas are whole signs counted from the Lagna's sign
(bhava 1 = the Lagna's sign); there is no Bhava Chalit or Sripati cusp system in this
release. Rashi names pair the Sanskrit name with the Western equivalent (Mesha (Aries), …).

### Nakshatras

Twenty-seven nakshatras of 13°20′ (360°/27) each, starting at 0° Ashwini; four padas of
3°20′ (13°20′/4) each. Every nakshatra carries its traditional name, symbol, presiding
deity and Vimshottari lord (`nakshatraOf`, `JyotishEngine.nakshatras`). The Lagna and every
graha get a nakshatra and pada.

### Vimshottari dasha

Lord sequence and years: Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16,
Saturn 19, Mercury 17 (summing to 120). The first mahadasha is the Moon's nakshatra lord;
its balance is `(1 − elapsed fraction of the nakshatra) × lord years`. A year is 365.25
days — the common software default; some traditions use a 360-day year instead, and this
is called out in the UI's conventions disclosure rather than left implicit. Nine
mahadashas are listed from birth; antardashas inside a mahadasha follow the lord sequence
starting from the mahadasha's own lord, each lasting `maha years × sub-lord years / 120`.
Pratyantardashas are out of scope.

### Navamsa (D9)

Each rashi is divided into nine parts of 3°20′ (30°/9); the navamsa sign of a longitude is
`(9 × signIndex + partIndex) mod 12` — the standard rule under which movable signs start
their navamsa count from themselves, fixed signs from their ninth, and dual signs from
their fifth (`tests/jyotish.test.cjs` checks this equivalence for all twelve signs and all
nine parts). The Navamsa chart is drawn from the navamsa Lagna with the nine grahas placed
by navamsa sign. Vargottama (same sign in D1 and D9) is flagged per graha.

### Chart formats

`jyotish-chart.js` is a pure renderer (plain data in, SVG string out, no engine
dependency) shared by the Rashi and Navamsa charts. South Indian (default) is a fixed 4×4
grid with signs in unmoving cells (Pisces top-left, clockwise) and the Lagna cell marked
with a diagonal corner stroke. North Indian is a diamond with bhava 1 fixed at the top
centre and each house labelled with its sign number (1–12) rather than a fixed sign
position. Grahas render as two-letter labels (Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke) with an
"R" suffix when retrograde; each house group carries `data-house` and `data-sign`
attributes (and `data-lagna="true"` on the Lagna house) for DOM-level verification.

### Copy and voice

Original reflective text only: Lagna readings (12), graha themes (9), nakshatra readings
(27: keyword, two-sentence reflection, prompt), dasha-lord readings (9, framed as "a
period traditionally associated with …" plus a prompt) and bhava one-liners (12).
Traditional names, deities and symbols are cited data, not original copy. Voice matches
the rest of the atlas: no "you will", no luck/fortune/misfortune language, no verdicts on
marriage, wealth, health or death — `tests/jyotish-text.test.cjs` enforces both the banned
vocabulary and copy variety (no over-shared opening skeleton, bounded repetition of stock
phrasing) so the 27 nakshatra readings stay distinct prose rather than a mail-merged
template.

## Independent validation

Run the whole suite:

```
node --test tests/*.test.cjs
```

which is **247 tests passing** at the time of writing (the rest of the atlas plus the 50
Jyotish tests below). Note the glob: `node --test tests/` fails on Node 24 with
`MODULE_NOT_FOUND`, so the path must be expanded by the shell.

The three Jyotish-specific files:

```
node --test tests/jyotish.test.cjs        # 43 tests
node --test tests/jyotish-text.test.cjs   # 2 tests
node --test tests/jyotish-chart.test.cjs  # 5 tests
```

**`tools/build_jyotish_fixtures.py`** (development only, never shipped) uses pyswisseph in
Moshier mode with `SIDM_LAHIRI` to write `tests/fixtures/jyotish-reference.json`: twelve
cases (ten natal reference births spanning both hemispheres, polar/high-latitude sites and
1901–2099, plus a case placed near a nakshatra boundary and one at the 1901 edge of the
supported range). For each case it records Swiss Ephemeris's ayanamsa and sidereal
longitudes (`FLG_SIDEREAL`) for the nine grahas and the Ascendant, and then — as a second,
independent implementation of the rules above, written in Python rather than imported from
`jyotish-engine.js` — computes nakshatra index, pada, navamsa sign, the Moon's dasha
balance and the nine mahadasha lords with start dates. The pyswisseph version (2.10.03) is
recorded in the fixture file alongside the cases; Swiss Ephemeris itself is a local test
tool only and is not shipped.

**`tests/jyotish.test.cjs`** checks, among the engine's tables and structural rules
(nakshatra/rashi/dasha-year tables, the ayanamsa formula's shape, the nakshatra/pada
lookup, the navamsa starting-sign rule for every sign, whole-sign bhava assignment,
missing/error passthrough):

- **Ayanamsa within 0.005°** against the fixture's `swe.get_ayanamsa_ut` value, across
  every case from 1901 to 2100 (the precession-formula agreement over the full supported
  range — looser than the 0.0005° single-value calibration check on `AYANAMSA_T0`
  described above, because it also has to absorb Swiss Ephemeris's own small drift in
  ayanamsa across a century and a half).
- **Sidereal longitudes within 0.03°** for every graha and the Lagna — the tropical
  engine's own established tolerance against Swiss Ephemeris (see `docs/NATAL-CHART.md`),
  carried through unchanged since sidereal longitude is just tropical longitude minus a
  shared ayanamsa offset.
- **Nakshatra index, pada and navamsa sign exactly equal** to the fixture's independently
  computed values, *except* when the sidereal longitude sits within 0.03° of the relevant
  boundary (13°20′ nakshatra spans, 3°20′ pada spans, or 30°/9 navamsa-part spans) — a
  graha that close to a boundary can legitimately fall on either side once the two
  independent ephemerides disagree by even a hundredth of a degree, so those specific
  comparisons are skipped rather than loosened.
- **Vimshottari mahadasha dates within a tolerance that scales with the disagreement they
  inherit, not a flat one day.** The design spec describes "dasha balance within one day
  and mahadasha dates within one day," but the shipped test computes
  `0.03° / (360°/27) × firstLordYears × 365.25 days + 1 day`: the 0.03° Moon-longitude
  disagreement between the two ephemerides is a fraction of a 360°/27° nakshatra span, and
  the whole Vimshottari timeline is offset by that same fraction of the first mahadasha
  lord's years (every later mahadasha has a fixed, Moon-insensitive duration, so the same
  constant offset carries through the balance and every later mahadasha's end date). Worst
  case — a 20-year lord (Venus) at the full 0.03° — is about 16 days, and the formula adds
  one more day for rounding/date-boundary effects. This is the code's actual behaviour and
  is documented here because it is measurably different from the spec's one-day figure.
  A companion test builds a synthetic chart fed the fixture's own Moon longitude directly
  (bypassing the tropical-vs-Swiss Moon disagreement entirely) and checks the first
  mahadasha's end against the fixture to within **60 seconds**, isolating the dasha *rule*
  itself from ephemeris disagreement.

**`tests/jyotish-text.test.cjs`** checks copy completeness (every Lagna/nakshatra/dasha-lord/
graha/bhava entry present, minimum lengths, prompts ending in "?"), the banned-vocabulary
list, and that the 27 nakshatra readings read as distinct prose rather than a templated
mail-merge (bounded repetition of opening words, first-sentence skeletons and stock
phrasing).

**`tests/jyotish-chart.test.cjs`** checks the renderer structurally: every sign appears
exactly once per format, the Lagna house is uniquely marked in both South and North
Indian layouts, retrograde grahas get the "R" suffix, invalid formats/house counts throw,
and the South Indian layout puts a corner mark on only the Lagna cell while the North
Indian layout always labels bhava 1 "Asc" regardless of which sign lands there.

### Browser checks

Verified by DOM inspection against a local static server (`ishtar-static`,
`python -m http.server`) rather than by screenshot, since Browser-pane screenshots render
blank in this environment:

- Loaded the sample chart ("Try a sample chart"); all four tabs (Rashi, Nakshatras,
  Dashas, Navamsa) rendered their content and the correct panel's `hidden` attribute
  toggled on tab switch.
- Both chart formats produced all twelve `[data-sign]` house groups, in both the Rashi
  chart and the Navamsa chart (48 group checks total across the two charts × two formats).
- Selecting a mahadasha block in the timeline set its `aria-pressed="true"` and repopulated
  the antardasha table with 9 rows.
- No console errors originated from the Jyotish section or its assets (all five
  `jyotish-*` files and `jyotish.css` returned 200). The only console errors present were
  two `/api/account/` 404s, expected because the static file server used for this check has
  no accounts backend running — unrelated to this feature and present on every page load.
- At a 390px viewport, `document.documentElement.scrollWidth` matched the viewport width
  exactly (no horizontal overflow), and neighbouring sections (`#chart-in-time` and the
  rest of the atlas) remained present and were not hidden or altered by the Jyotish
  section's markup or styles.
- The signed-in account state was not exercised: this section reads the saved birth
  profile only and writes nothing back, so there is no signed-in-specific behaviour to
  verify.

## Out of scope

Bhava Chalit and Sripati house cusps, ayanamsas other than Lahiri, other vargas (D10 and
beyond), pratyantardashas, yogas, ashtakavarga, shadbala, transits (gochar), Chandra Lagna
charts, and any compatibility (kuta) matching.
