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
and principal phases of the four branches (eight visible characters), and a
second view counts hidden stems too (below). Hidden stems, Ten Gods and luck
pillars are now included; seasonal weighting, elemental strength and annual
(流年) pillars are not, and no cycle claims to measure fortune or luck.

### Hidden stems (藏干)

Each earthly branch carries one to three hidden heavenly stems, in the
traditional order principal, middle, residual. This is a fixed table, not a
calculation:

| Branch | Hidden stems |
|---|---|
| 子 Zi | 癸 |
| 丑 Chou | 己 癸 辛 |
| 寅 Yin | 甲 丙 戊 |
| 卯 Mao | 乙 |
| 辰 Chen | 戊 乙 癸 |
| 巳 Si | 丙 庚 戊 |
| 午 Wu | 丁 己 |
| 未 Wei | 己 丁 乙 |
| 申 Shen | 庚 壬 戊 |
| 酉 You | 辛 |
| 戌 Xu | 戊 辛 丁 |
| 亥 Hai | 壬 甲 |

Stems are indexed 甲0 乙1 丙2 丁3 戊4 己5 庚6 辛7 壬8 癸9; even index is yang, odd
is yin; phases run Wood (0,1), Fire (2,3), Earth (4,5), Metal (6,7), Water
(8,9). `celestial-extras-engine.js` holds this table as `hiddenStems`, indexed
by branch, alongside the existing `stems` and `branches` tables.

### Ten Gods (十神)

Every stem other than the Day Master itself is named by its relation to the
Day Master, using the generating cycle Wood→Fire→Earth→Metal→Water→Wood and
the controlling cycle Wood→Earth→Water→Fire→Metal→Wood:

| Relation to Day Master | Same polarity | Opposite polarity |
|---|---|---|
| Same phase | 比肩 Bǐ Jiān · Friend | 劫財 Jié Cái · Rob Wealth |
| Day Master produces it | 食神 Shí Shén · Eating God | 傷官 Shāng Guān · Hurting Officer |
| Day Master controls it | 偏財 Piān Cái · Indirect Wealth | 正財 Zhèng Cái · Direct Wealth |
| It controls the Day Master | 七殺 Qī Shā · Seven Killings | 正官 Zhèng Guān · Direct Officer |
| It produces the Day Master | 偏印 Piān Yìn · Indirect Resource | 正印 Zhèng Yìn · Direct Resource |

`tenGod(dayStemIdx, stemIdx)` returns the god key for any stem pair and is
exported and pure. The engine reports the god of the three visible non-day
stems and of every hidden stem of all four branches, including the day branch.
The Day Master's own pillar position carries no god (it is labelled "Day
Master", not a relation to itself). Each god's UI copy is an original
two-sentence reflection plus a prompt, framed as what the relationship is
traditionally associated with, never as a verdict on wealth, career or health.

### Phase counts, two views

The default phase chart ("visible eight") counts the four stems and the
principal phase of each of the four branches, unchanged from before. A
pressed-state toggle adds a second view, "with hidden stems", which counts the
four visible stems plus every hidden stem of the four branches (4 + 4 to 12
characters; the denominator is shown and varies by chart). Both views remain
counts, not a strength or balance score.

### Luck pillars (大運)

Ten-year 大運 chapters, stepping the month pillar through the sexagenary cycle:

- **Direction.** Forward when the year stem is yang and the reader counts as
  male, or the year stem is yin and the reader counts as female; backward
  otherwise. The site stores no sex at birth, so the Four Pillars tab adds a
  page-only "Count luck pillars as" select (*Show both directions* default,
  *Male, traditional counting*, *Female, traditional counting*); the choice
  lives in the component's page state only, never persisted.
- **Start.** The interval from the birth instant to the next Jie boundary when
  forward, or from the previous Jie boundary to the birth instant when
  backward. Jie boundaries are the twelve solar-term instants at 30° steps
  from 315° (Li Chun); `jieBoundary(date, direction)` finds the nearest one
  with Astronomy Engine's `SearchSunLongitude` over the same longitude
  expression the month pillar already uses. Three days count as one year, one
  day as four months; the total is floored to whole months (matching
  lunar_python) and reported as "age Y years M months".
- **Sequence.** Ten pillars of ten years each, stepping the month pillar
  forward or backward through the sexagenary cycle (stem and branch advance
  together). Each pillar shows its characters, pinyin, phases, its start age,
  the calendar year it begins (birth year + start age, months ignored for the
  year label), and the Ten God of its stem. The pillar containing the reader's
  current age (from the page's local-today calculation) is marked "now".
- Sample charts get luck pillars too, and the block scrolls horizontally
  inside its own container on narrow screens rather than widening the page.

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

`tools/build_bazi_fixtures.py` regenerates `tests/fixtures/bazi-reference.json`
from lunar_python in the same kind of throwaway venv, never shipped, covering
the twelve existing BaZi births plus four chosen for luck-pillar coverage (both
directions, and a birth within an hour of a Jie boundary). `tests/bazi.test.cjs`
(53 tests) checks the hidden-stem table against every branch, `tenGod`
exhaustively for all 10×10 stem pairs, the hidden-stem phase totals, and, from
the fixture, the hidden stems and Ten Gods of every case and the luck-pillar
direction and first five pillars for both sexes. The start age is checked to
within one month of lunar_python's: lunar_python quantises the birth-to-Jie
interval to whole days plus double-hour buckets (`dayDiff*4 + floor(hourDiff*10/30)`
months), while this engine uses exact fractional days (`floor(days × 4)`), so
five of the 32 birth/sex comparisons round to a different month even a full
month away from a Jie boundary. The test documents this tolerance, with the
five differing cases listed, rather than papering over it.

Manual browser checks cover a 1400px desktop and 390px phone, shared birth inputs,
all four chart views, destinations and keyboard city search, globe/world controls,
planet/angle filters, expanded view, sample/personal state, partner city selection
and daylight-saving ambiguity, aspect selection and the mobile pillar layout.
