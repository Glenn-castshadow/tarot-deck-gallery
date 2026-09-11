# Jyotish: a sidereal reading of the birth chart

Date: 2026-09-12. Branch: jyotish. Author: Claude, working unattended on Glenn's instruction
"do the vedic one, run it unattended" (2026-09-12). This is astrology sub-project B from the
2026-09-09 decomposition (A chart in time, done; C horary and electional, pending a framing
decision). Every convention below is attributed.

## Goal

Add a Jyotish section to the celestial atlas that reads the already-calculated birth chart in
the sidereal zodiac: the Rashi chart with whole-sign bhavas from the Lagna, nakshatras and
padas for every graha, the Vimshottari dasha timeline with antardashas, and the Navamsa (D9)
chart, drawn in the North Indian and South Indian formats. Same shape as the chart-in-time
section: its own engine, text, UI and stylesheet, attached from `app.js` and fed the natal
chart through `setBirthChart`.

| Constraint | Source |
|---|---|
| Symbolic reflection, not prediction; dashas are "periods traditionally associated with" a lord's themes; no verdicts | Codebase voice |
| Original interpretive copy; sources cited for tables and methods only; traditional names (nakshatras, deities, grahas) are public and kept | Codebase convention |
| Ephemeris and civil-time handling come from `NatalEngine` unchanged; the sidereal chart is the tropical chart minus the ayanamsa | Codebase structure; my judgement |
| Independent fixtures from pyswisseph (Moshier, `SIDM_LAHIRI`) in a throwaway venv, never shipped | Codebase (tools/build_natal_fixtures.py) |
| No new storage keys; the section reads the saved birth profile through `setBirthChart` only | Codebase convention |
| Cache-bust `?v=` keys bumped for every changed file; new files start at `?v=1` | Codebase convention |
| Open-source only; Astronomy Engine already vendored; no new runtime dependency | Glenn's global rule |
| Section markup may reuse the `cx-*`/`acg-*` classes the way chart-in-time does, but must re-declare element rules under its own class (celestial-extras.css scopes them) | Codebase lesson (docs/CHART-IN-TIME.md) |

## Conventions (mine unless noted)

### Ayanamsa

Lahiri (Chitrapaksha), as defined by the Swiss Ephemeris `SIDM_LAHIRI` mode: 23°15′00.658″
(23.250182778°) at t₀ = JD 2435553.5 (1956-03-21), carried to the birth instant by the
accumulated general precession in longitude. The engine uses the IAU 2006 polynomial for
precession in longitude,
`p(T) = 5028.796195 T + 1.1054348 T² + 0.00007964 T³ − 0.000023857 T⁴` arcseconds with T in
Julian centuries from J2000, so `ayanamsa(t) = 23.250182778° + (p(T) − p(T₀))/3600`. The
fixture tool records `swe.get_ayanamsa_ut` for every case and the test requires agreement
within 0.005° (18″) across 1901–2100; the docs state the model and that nutation is not
applied to the ayanamsa. Other ayanamsas (Raman, Krishnamurti, Fagan-Bradley) are out of
scope and the UI says the zodiac is Lahiri sidereal.

### Sidereal positions and grahas

Sidereal longitude = tropical apparent longitude (from the natal chart's `points` and `axes`)
minus the ayanamsa, mod 360. The nine grahas are Sun, Moon, Mars, Mercury, Jupiter, Venus,
Saturn, Rahu (the natal mean north node) and Ketu (mean south node). Uranus, Neptune and
Pluto are not grahas and are omitted; the docs say so. Retrograde flags come from the natal
points; Rahu and Ketu are always shown as retrograde by convention.

### Rashi chart and bhavas

Lagna = sidereal Ascendant. Bhavas are whole signs counted from the Lagna's sign (bhava 1 =
the Lagna's sign). No Bhava Chalit or Sripati cusps in this release. Sign names use the
Sanskrit rashi names with the Western equivalent in parentheses (Mesha (Aries) …).

### Nakshatras

Twenty-seven nakshatras of 13°20′ from 0° Ashwini, four padas of 3°20′ each. Each carries
its traditional name, symbol and presiding deity (data), its Vimshottari lord, and original
reflective copy. Every graha and the Lagna get nakshatra and pada; the Moon's is the
reading's anchor.

### Vimshottari dasha

Lord sequence Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19,
Mercury 17 (120 years). The first mahadasha is the Moon's nakshatra lord, with balance
`(1 − elapsed fraction of the nakshatra) × lord years`. Year length 365.25 days (mine; the
common software default; some traditions use 360-day years, and the docs say so). Nine
mahadashas are listed from birth with start and end dates. Antardashas within a mahadasha
run in the lord sequence starting from the mahadasha lord, each lasting
`maha years × sub-lord years / 120`. The UI shows the mahadasha timeline, the current
mahadasha and antardasha for today, and the antardasha table for any selected mahadasha.
Pratyantardashas are out of scope.

### Navamsa (D9)

Each sign is divided into nine parts of 3°20′; the navamsa sign of a longitude is
`(9 × signIndex + partIndex) mod 12`, which is the standard rule that movable signs start
from themselves, fixed signs from their ninth and dual signs from their fifth. The Navamsa
chart is drawn from the navamsa Lagna with the nine grahas placed by their navamsa signs.
Vargottama (same sign in D1 and D9) is flagged.

### Chart formats

Two SVG renderers with a pressed-state toggle, default South Indian (mine: fixed sign grid,
easiest to read against the placements table): the South Indian 4×4 square with signs in
fixed cells (Pisces top-left, clockwise) and the Lagna cell marked; the North Indian diamond
with bhava 1 at the top centre and the sign number written in each house. Grahas are drawn
as short labels (Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke) with an "R" suffix when retrograde. The
Rashi and Navamsa charts share the renderer.

### Copy

Original reflective text: Lagna sign (12), graha themes (9), nakshatra readings (27, each a
keyword, two-sentence reflection and a prompt), dasha-lord period readings (9, framed as
"a period traditionally associated with …" plus a prompt), and bhava one-liners (12). Voice
as elsewhere: no "you will", no prediction, no luck or fortune language, no verdicts on
marriage, wealth or health, which Jyotish texts are prone to. Sources cited for the tables
only: the nakshatra list and deities, the Vimshottari years, the navamsa rule.

## Engine API (`jyotish-engine.js`, UMD, Node-testable)

- `ayanamsa(date)` → degrees.
- `sidereal(chart)` → `{status:'ready', ayanamsa, lagna:{longitude, sign, degrees, nakshatra, pada}, grahas:[{name, abbreviation, longitude, sign, signIndex, degrees, house, nakshatra:{index,name,lord,pada}, retrograde, navamsaSign, vargottama}], navamsaLagna:{sign, signIndex}, houses:[{index 1..12, signIndex, grahas:[names]}], navamsaHouses:[…]}` or `{status:'missing'|'error', message}` passthrough from the chart.
- `nakshatraOf(longitude)` → `{index, name, lord, pada, fraction}`.
- `navamsaSign(longitude)` → signIndex.
- `vimshottari(chart, todayISO)` → `{status, moonNakshatra, balanceYears, mahadashas:[{lord, start, end, years, antardashas:[{lord, start, end, years}]}], current:{maha:index, antar:index}|null}`.
- Tables exported: `nakshatras` (27 with name, deity, symbol, lord), `dashaYears`, `rashis` (12 with Sanskrit and Western names).

## UI (`jyotish.js`, `jyotish.css`)

Section `#jyotish` after `#chart-in-time`, nav link "Jyotish", mobile fold subtitle
"Sidereal chart · nakshatras · dashas". Header, profile bar with "Try a sample chart", and
four tabs:

1. **Rashi chart** — chart drawing (format toggle) beside a placements table (graha, rashi,
   degrees, nakshatra · pada, bhava, motion); Lagna reading; a bhava strip listing each
   house's grahas with the one-liner.
2. **Nakshatras** — the Moon's nakshatra reading (symbol, deity, lord, keyword, reflection,
   prompt) and a selectable list of the other grahas' nakshatras with their readings.
3. **Dashas** — the current mahadasha and antardasha with the lord readings; a horizontal
   timeline of the nine mahadashas from birth (scrolling in its own container on phones);
   selecting a mahadasha shows its antardasha table with dates.
4. **Navamsa** — the D9 chart drawing (same format toggle) with a table of graha → navamsa
   sign and vargottama flags, and a short methods note.

A conventions disclosure on every tab states: Lahiri ayanamsa and the model; whole-sign
bhavas; mean nodes; 365.25-day dasha years; the navamsa rule; and that readings are for
reflection. Without a birth time and place the section shows the same "add birth details"
prompt as chart-in-time.

## Tests

- `tools/build_jyotish_fixtures.py` (pyswisseph, Moshier, `SIDM_LAHIRI`) writes
  `tests/fixtures/jyotish-reference.json` for the ten natal reference births plus two more
  (a birth near a nakshatra boundary and one in 1901): ayanamsa, sidereal longitudes of the
  nine grahas and the ascendant (`FLG_SIDEREAL`), and, computed in Python from those sidereal
  longitudes by the rules above (an independent second implementation), nakshatra index,
  pada, navamsa sign, Moon dasha balance and the nine mahadasha lords with start dates.
- `tests/jyotish.test.cjs`: ayanamsa within 0.005°; sidereal longitudes within 0.03° (the
  tropical engine's own tolerance); nakshatra/pada/navamsa exact; dasha balance within one
  day and mahadasha dates within one day; structural checks (27 × 13°20′ = 360, lord years
  sum to 120, antardasha lengths sum to the mahadasha, navamsa rule equals the traditional
  starting-sign rule for all 12 signs, vargottama detection); missing/error passthrough.
- Browser checks by DOM (pane screenshots render blank here): all four tabs with the sample
  chart, format toggle, dasha selection, 390px containment.

## Documentation

`docs/JYOTISH.md` with conventions, validation and browser checks; cross-links from
`docs/NATAL-CHART.md` and `docs/CHART-IN-TIME.md`; deployment note for the new files.

## Out of scope

Bhava Chalit, other ayanamsas, other vargas (D10 etc.), pratyantardashas, yogas, ashtakavarga,
shadbala, transits (gochar), Chandra Lagna charts, and any compatibility (kuta) matching.
