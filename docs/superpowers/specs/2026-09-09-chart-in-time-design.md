# Chart in time: design

Date: 2026-09-09. Status: approved in conversation, awaiting written review.

This is the first of three astrology sub-projects. Jyotish (sidereal zodiac,
nakshatras, bhavas, Vimshottari dasha, Navamsa) and traditional practice (horary
and electional on a shared classical-dignities core) get their own specs after
this one ships.

## Goal

Give a visitor who has entered birth details three further ways to look at their
chart over time: the solar return that frames a year, the lunar return that
frames a month, and progressed charts that move slowly across a life. Each is
calculated in the browser from the existing natal chart, shown against it in a
two-ring wheel, and explained in the site's existing reflective voice.

## Decisions already made

| Decision | Choice | Source |
|---|---|---|
| Sub-project order | A chart in time, then B Jyotish, then C horary/electional | Glenn, 2026-09-09 |
| Return location | Where the reader will be, birthplace pre-filled | Glenn, 2026-09-09 |
| Progression techniques | Secondary, solar arc and tertiary | Glenn, 2026-09-09 |
| Module structure | New module set plus a shared bi-wheel extraction | Glenn approved approach 2 |
| Progressed angles | Real sidereal time at the progressed instant | My judgement, offered for override and not overridden |
| Branch | `chart-in-time` off `main`, in a separate worktree | My judgement; `accounts` has unrelated work in progress |

## Global constraints

- **All calculation happens in the browser; no birth detail reaches the
  network.** Source: existing codebase rule, stated in docs/NATAL-CHART.md and
  enforced by every current astrology module.
- **Swiss Ephemeris is a validation tool only and is never shipped.** Source:
  existing convention in tools/build_natal_fixtures.py and docs/NATAL-CHART.md.
- **Supported range stays 1901-2100.** Source: existing limit in
  natal-engine.js; a derived chart outside it must error rather than extrapolate.
- **Interpretations describe traditional symbolism for reflection. No
  predictions, no event forecasts, no scores.** Source: existing editorial rule
  visible throughout natal-chart.js, celestial-extras.js and their docs.
- **Vanilla JS, no build step; one module per feature area.** Source: existing
  codebase convention, see docs/deployment.md.
- **Optional persistence goes through storage-preferences.js.** Source: existing
  consent gate added 2026-09-09.
- **New sections register with mobile-sections.js as a main fold.** Source:
  existing convention in docs/MOBILE-SECTIONS.md.
- **Open source, maintained libraries.** Source: Glenn's global CLAUDE.md.
  Astronomy Engine 2.1.19 is already vendored under MIT and covers everything
  this sub-project needs; no new runtime dependency is proposed.
- **Version bump before any build.** Source: Glenn's global CLAUDE.md.

## Architecture

Five new files, one of which is an extraction from existing code, following how
numerology and divination are already structured.

| File | Role |
|---|---|
| `bi-wheel.js` | Shared two-ring chart renderer, extracted from celestial-extras.js |
| `chart-in-time-engine.js` | Pure calculation. No DOM, no network |
| `chart-in-time-text.js` | Interpretive copy, kept out of the UI module |
| `chart-in-time.js` | Section UI, tabs, controls, rendering |
| `chart-in-time.css` | Section styles |

Edited: `index.html` (section, nav entry, script tags), `celestial-extras.js`
(call the shared renderer), `mobile-sections.js` (register the fold), `app.js`
(attach the section, carry the return location in the saved profile).

The engine depends on `natal-engine.js` and Astronomy Engine, matching how
`celestial-extras-engine.js` already composes. A derived chart is produced by
running the existing natal machinery at a derived instant and location, so
houses, angles, aspects and the polar Placidus fallback all come along for free
and stay consistent with the birth chart beside them.

## Engine API

```
returnChart({chart, kind, location, index, reference})
progressedChart({chart, targetDate, method})
```

Both follow the established status contract: `{status: 'ready' | 'missing' |
'error', message?, ...}`. `missing` when the natal chart is not ready, `error`
for out-of-range or unresolvable input. Neither invents angles when the birth
time is absent.

### Return instants

`kind` is `'solar'` or `'lunar'`. The return instant is the moment the body's
apparent geocentric ecliptic longitude equals its natal longitude.

Longitude comes from the same expression natal-engine.js uses,
`Ecliptic(GeoVector(body, date, true)).elon`, rather than from Astronomy
Engine's `SearchSunLongitude`. This matters: it makes the return chart's Sun
equal the natal Sun by construction instead of by two ephemeris paths happening
to agree, and it leaves `SearchSunLongitude` free to serve as an independent
cross-check in the tests.

Solving, per return:

1. Seed `t = birth + k * period`, where `period` is 365.2422 days for solar and
   27.321582 for lunar, and `k` is the integer return number.
2. Newton correction: evaluate `f(t) = LongitudeOffset(lon(body, t) - natalLon)`
   once and step `t` by `-f / meanSpeed`. Without this the solar seed can be off
   by up to about two days, because the equation of centre moves the true Sun as
   much as two degrees from the mean.
3. Bracket the corrected seed by plus or minus 2 days and hand it to `Search`
   with `dt_tolerance_seconds: 0.01`. Both bodies move prograde, so the crossing
   is ascending, which is what `Search` requires.
4. Verify: recompute the body's longitude at the solved instant and assert the
   difference from natal is under 1e-6 degrees. A failure returns `error` rather
   than a wrong chart.

`index` selects which return, as an integer offset from the return governing
`reference` (today by default): 0 is the current period, -1 the previous, +1 the
next. This drives the panel's previous/next navigation.

The instant itself is location independent, since geocentric ecliptic longitude
does not depend on the observer. `location` affects only the return chart's
houses and angles. That distinction gets stated plainly in the method notes,
because it is the thing that makes relocated returns intelligible.

If a solved instant falls outside 1901-2100, the result is `error`.

### Progressions

`method` is `'secondary'`, `'tertiary'` or `'solar-arc'`.

Let `elapsed` be the days from the birth instant to the target instant.

| Method | Ephemeris offset | Angles |
|---|---|---|
| Secondary | `elapsed / 365.2422` days | Cast at the progressed instant for the birthplace |
| Tertiary | `elapsed / 27.321582` days | Cast at the progressed instant for the birthplace |
| Solar arc | none; every natal point advances by the arc | Natal angles plus the same arc |

Secondary and tertiary are produced by running natal-engine.js at
`birth + offset` for the **birth** location. Progressed Ascendant and MC
therefore come from real sidereal time at that instant rather than from an arc
formula. The two common alternatives, Naibod arc and solar-arc MC, are
documented in the method notes as roads not taken, since a reader comparing
against other software needs to know which convention produced the number.

Solar arc uses the arc of the *secondary* progressed Sun, `delta(secondary
progressed Sun, natal Sun)`, added to every natal point and angle. The Naibod
variant, which substitutes mean solar motion, is out of scope.

Progressed instants stay close to the birth date by construction: a hundred
years of life is a hundred days of secondary offset, or about 1337 days of
tertiary offset. No additional range guard beyond the natal chart's own is
needed, though the target date is still validated against 1901-2100.

Tertiary is keyed to the sidereal lunar month of 27.321582 days. The synodic
variant of 29.530589 days also circulates under the same name; the method notes
say which one produced the chart. This is my judgement, not an instruction, and
it is the definition most commonly cited.

### Contacts and the progressed lunation

Progressed-to-natal contacts reuse the aspect logic already in the codebase,
with tighter orbs than transits: 2 degrees for secondary and tertiary, 1 degree
for solar arc. A technique whose points move about a degree a year needs a tight
orb, or every point aspects every other point and the list stops meaning
anything. These figures are my judgement.

The progressed lunation phase is the angle from progressed Sun to progressed
Moon, placed in the eight 45-degree phases of the roughly 29.5-year progressed
cycle: New, Crescent, First Quarter, Gibbous, Full, Disseminating, Last Quarter,
Balsamic.

## Shared bi-wheel

The renderer currently at celestial-extras.js:23 moves to `bi-wheel.js` as:

```
BiWheel.render({inner, outer, contact, labels, centerSymbol, centerLabel})
```

`centerSymbol` and `centerLabel` are parameterised so this section can label the
hub for its own chart types; celestial-extras.js passes the values it hardcodes
today. The extraction must be behaviour preserving, and a test asserts the
extracted renderer emits byte-identical SVG for the current inputs before the
existing call site is switched over.

## UI

A new section after `#celestial-extras`, following the shape the atlas sections
already use: tabs, profile bar, sample-chart toggle, wheel, contact picker,
reading text, placements table, method `<details>`.

| Tab | Label | Controls |
|---|---|---|
| Solar return | `Your year ahead` / *Solar return* | Return location picker, previous/next year, "this year" |
| Lunar return | `Your month` / *Lunar return* | Return location picker, previous/next return, "now" |
| Progressions | `The slow chart` / *Progressions & directions* | Method selector, target date, "today" |

The return location picker is a second `BirthplaceSearch` instance pre-filled
with the birthplace, with the same custom-coordinates escape hatch the birth
form has. Both return tabs share one picker and one value.

Beyond the wheel, a return chart shows its own houses and angles in the
placements table, because a return chart's own angles are the substance of the
technique rather than a detail of it. The progressions tab shows the progressed
lunation phase alongside the contact list.

The section registers with mobile-sections.js as a main fold and gains a nav
entry. A sample-chart toggle makes the section explorable without entering
personal details.

The existing sample birth record is a private const inside the
celestial-extras.js closure and is not reachable from another module. This
section declares its own with the same values, so both show the same
illustrative person. That is a deliberate duplication of one object literal in
preference to either a new shared module or a cross-section export, and it is my
judgement rather than an instruction. If a third section ever needs it, that is
the point to extract it properly.

## Storage

`arcana-birthday-profile-v1` gains one optional field, `returnLocation`, in the
same shape as the existing `placeLocation`. Old profiles stay readable and a
missing field falls back to the birthplace. The write goes through
storage-preferences.js like every other optional write, so a reader who declined
saving gets an in-memory value for the session only.

## Testing

New: `tests/chart-in-time.test.cjs`, `tests/bi-wheel.test.cjs`,
`tools/build_chart_in_time_fixtures.py`,
`tests/fixtures/chart-in-time-reference.json`.

Fixtures are generated with pyswisseph in Moshier mode in a throwaway venv,
matching how tools/build_natal_fixtures.py already works. `solcross_ut` and
`mooncross_ut` give independently solved return instants. Progressed positions
validate as ordinary chart positions at the derived instant; the day-for-year
ratio is a definition rather than a calculation, so it is tested against
hand-worked values and documented, not validated against Swiss.

Tolerances: 15 seconds on return instants (Astronomy Engine and Swiss Moshier mode disagree by up to ~7 seconds on the same crossing; a wrong crossing is off by a month or a year), and the existing 0.03 degrees on
planets and 0.01 on angles and cusps for the derived charts.

Behavioural tests beyond the fixtures:

- A secondary progressed chart at the birth instant reproduces the natal chart.
- The solar arc equals progressed Sun minus natal Sun exactly.
- Lunar returns are monotonic, spaced about 27.32 days, thirteen or fourteen per
  calendar year (365.2422 / 27.321582 = 13.37), and each one's Moon matches the
  natal Moon to under 1e-6 degrees.
- A solar return's Sun matches the natal Sun to under 1e-6 degrees.
- The same return instant with two different locations gives identical planetary
  longitudes and different angles.
- A 29 February birth resolves returns in common years.
- Returns that would land outside 1901-2100 return `error`.
- A chart with no birth time returns `missing` rather than inventing angles.
- The independent cross-check: solar return instants agree with Astronomy
  Engine's own `SearchSunLongitude`.

Manual QA follows the existing checklist: desktop and 390px, keyboard and touch
location selection, custom coordinates, tab and fold state preservation, print
layout, and no regression in the transits, synastry and BaZi section that now
shares the renderer.

## Out of scope

Deliberately not in this sub-project, and not silently dropped:

- **Precessed solar returns.** A real disagreement in the tradition, worth its
  own decision rather than a default chosen here.
- **Demi and quotidian returns**, converse directions, primary directions, and
  the Naibod solar-arc variant.
- **Vedic material** of any kind. That is sub-project B.
- **Horary and electional.** Sub-project C.
- **Account sync of the return location.** It stays a local optional field until
  the accounts work lands and profile sync is a settled surface.
