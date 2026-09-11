# Extended Celestial Atlas

## User experience

The chart collection now includes an astrocartography globe, transits, synastry,
and BaZi Four Pillars. Jump links beside the shared birth form lead directly to
each experience. Existing tarot, natal, Chinese-zodiac and Lo Shu views remain.

The shared validated natal model supplies the resolved UTC birth instant. An
incomplete, invalid or ambiguous profile does not produce a personal chart.
Astrocartography displays a prominently labeled sample instant (2000-01-01
12:00 UTC) until the user supplies complete birth details. The companion views
have an explicit sample button, with synthetic New York and London births.
Sample mode does not overwrite the saved birth profile. The second person's
synastry data is held only in the page, not localStorage.

## Astrocartography

- Orthographic globe with drag, keyboard rotation, zoom, reset, and expanded view;
  Escape closes the expanded view. Equal Earth world projection is also available.
- Ten planets and four angular lines each. Individual planet toggles, angle filter,
  accessible line selector, direct line selection, city search, and point selection.
- Defaults to Sun, Venus and Jupiter for a readable view. The nearest-line panel
  explicitly uses only the displayed planets and angles.
- Planet color and angle line pattern are both explained in the visible key.
- SVG geometry clips at the globe's horizon and splits correctly at the dateline.
- Libraries, map geometry and city searches are hosted locally. There are no map
  tile accounts, external geocoders, or chart API calls.

Calculations use apparent geocentric equatorial coordinates of date, retaining
true planetary latitude. Astronomy Engine's `GeoVector`, `Rotation_EQJ_EQD`,
`EquatorFromVector`, and apparent sidereal time determine right ascension alpha,
declination delta and Greenwich sidereal angle GAST.

With east-positive longitude, MC longitude is `alpha - GAST` and IC is 180° away.
At latitude phi, the geometric horizon hour angle is
`H0 = acos(-tan(phi) * tan(delta))`. ASC longitude is `MC - H0` and DSC is
`MC + H0`. Horizon lines end at the circumpolar limit. No refraction, topocentric
parallax, parans or ecliptic-projected alternative is included. MC/IC here denote
upper/lower meridian passages, not necessarily the observer's literal zenith/nadir.

Distances use shortest great-circle distances to sampled spherical line arcs,
including endpoints. Rising and setting halves are distinguished. These are not
same-latitude distances or strength scores. Generalized geography and rounded
kilometers are suitable for exploratory world maps. Birth time uncertainty can
move lines materially; the method panel explains this.

See https://www.astro.com/faq/fq_fh_owspez_e.htm and the local vendored Astronomy
Engine API documentation/source. Map provenance is in `assets/maps/README.md`.

## Transits and relationship charts

Transit positions use 12:00 UTC on a selectable Gregorian date. The default is
today in the browser's local calendar. The comparison is between ten transiting
planets and ten birth planets, using conjunction, sextile, square, trine and
opposition with a 2° maximum orb. This is a daily snapshot, not a search for exact
events or all contacts occurring throughout the day.

Synastry compares ten planets in each person's chart. Maximum orbs are 6° for
conjunctions, trines and oppositions, 4° for sextiles, and 6° for squares. Contacts
retain first/second-person identities. House overlays locate the other person's
planets in the first person's natal houses. No compatibility score is assigned.
Second-person time zones, invalid civil times, and repeated times use the existing
natal resolver, with a required earlier/later choice for ambiguous times.

Both views offer two-ring SVGs, selectable and filterable aspects, interpretation
prompts, and exact placement tables. Leaders connect spaced planet labels to
their actual angular positions. The same bi-wheel renderer draws the solar
return, lunar return and progressed charts; see [chart in time](CHART-IN-TIME.md).

## BaZi conventions

The solar year begins at Li Chun (315° apparent solar longitude), and the twelve
months at the Jie boundaries spaced 30° apart. These are evaluated at the actual
resolved birth instant, not by Lunar New Year or a fixed February date.

The day cycle uses Gregorian Julian day number +49 modulo 60. This release uses
the school in which the day rolls at 23:00. Double-hours use recorded local civil
time, with Zi spanning 23:00–00:59. It does not adjust to true solar time. Day
Master is the heavenly stem of the day. The phase display counts the four stems
and principal phases of the four branches (eight visible characters). It does
not include hidden stems, seasonal weighting, Ten Gods or luck cycles and does
not claim to measure elemental strength.

Sources: Hong Kong Observatory's stems/branches and solar-term explanations:
https://www.hko.gov.hk/en/gts/time/stemsandbranches.htm
https://www.hko.gov.hk/en/gts/time/24solarterms.htm
Day boundary variants: https://6tail.cn/calendar/lunar.ganzhi.html.
All interpretation copy is original and framed as symbolic reflection.

## Validation

Run `node --test tests/*.test.cjs` and syntax-check the application modules.
`tests/atlas.test.cjs` adds 24 cases to the 27 existing tests:

- Five dates from 1902–2099, comparing all ten planets' right ascension and
  declination with independent Swiss Ephemeris Moshier results (0.03° tolerance),
  plus sidereal time (0.01°).
- Geometric horizon/meridian identities, polar limits, dateline wrapping,
  spherical distances and empty/invalid inputs.
- Twelve independent Four Pillars cases from lunar_python (sect 1), including
  both sides of Li Chun and a month boundary, 23:00 rollover and midnight.
- Cross-chart aspect wraparound, separate orbs, date changes, house overlays,
  and immutability of the birth chart.

`tools/build_atlas_fixtures.py` regenerates the independent fixtures using
pyswisseph and lunar_python, which are development-only dependencies. Versions
are recorded in the JSON fixture. Neither package is included in browser code.

Manual browser checks cover a 1400px desktop and 390px phone, shared birth inputs,
all four chart views, destinations and keyboard city search, globe/world controls,
planet/angle filters, expanded view, sample/personal state, partner city selection
and daylight-saving ambiguity, aspect selection and the mobile pillar layout.
