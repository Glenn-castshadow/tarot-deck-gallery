# Sky: the Moon, a month calendar, retrogrades and personal transits

Date: 2026-09-13. Status: design, awaiting Glenn's review.
Sub-project C1 of the site expansion program
([2026-09-13-site-expansion-design.md](2026-09-13-site-expansion-design.md)).

## Purpose

`/sky/` carries one section today, the daily sign horoscope. This sub-project makes it the
page a reader opens to find out what the sky is actually doing: where the Moon is now, what
happens this month, which planets are retrograde, and which of those moments touch their own
birth chart. Everything is calculated in the browser from the vendored Astronomy Engine, as
every other calculated section already is.

## Decisions already made

| Decision | Choice | Source |
|---|---|---|
| Void of course | Show both traditions, labelled | Glenn, 2026-09-13 |
| Personal transits without a birth time | Ten natal planets, angles omitted with a stated reason | Glenn, 2026-09-13 |
| Eclipses | Global circumstances only, no per-reader visibility | Glenn, 2026-09-13 |
| Scope | All four features in one sub-project | Glenn, 2026-09-13 |
| Features in scope | Moon now, month calendar, retrograde tracker, personal transit calendar | Program spec C1 |
| Out of scope | Heliocentric and topocentric positions, occultations, general conjunction search, notifications | Program spec C1 |
| No build step; UMD modules with `?v=` cache keys | Keep | Codebase convention |
| Calculations run in the browser; no birth data leaves it except an explicit Save | Keep | Codebase convention |
| Voice: symbolic reflection, no predictions, no "you will", no luck or fortune | Keep | Codebase convention, tested in `tests/horary-text.test.cjs` |
| Every new astronomical calculation ships independent pyswisseph fixtures | Keep | Codebase convention |
| Open-source libraries only | Keep | Glenn's global preferences |

## Corrections and deferrals, recorded after the build (2026-09-13)

This spec was written before the work and is kept as written, so the rest of it still reads as
the design that was proposed. What follows is what the ten-task build and its reviews actually
established. Where the two disagree, this section is right.

### Delivered after the deferral: month void bands (2026-09-14)

The `monthEvents` list in Part A promises "**Void bands**, both definitions, from
`voidPeriods`". That was **not** shipped by the ten-task build: the implementation plan never
carried the bullet forward into any task, so no task brief could have caught it, and ten tasks
shipped green without it. It was noticed in the whole-branch review after the last task landed,
deferred rather than added late, and then built as a separate change once the branch had merged
and deployed.

It is now delivered. `monthEvents(year, month)` returns `{status, events, voids}`, and the
month view carries a void strip below the grid and the list.

**`voids` is a sibling key, not an entry in `events`.** Every member of `events` is an instant
with a single `date`, and the local-day bucketing, the sort and six tasks' tests all rely on
that. A void band is an interval with two ends and no single date, so folding it into `events`
would have broken a contract the rest of the section depends on. Each entry is
`{start, modernStart, end, sign, lastAspect, modernLastAspect}` — the classical start, the
modern start, the ingress that closes both, and which aspect closed each tradition.

`voids` is a **lazy, memoised getter**, not an eager property: a month's bands cost an aspect
search per sign transit, about a second, and the month view slices three UTC months for its
events, so computing them eagerly charged three seconds to a caller that never read them. The
shape is unchanged — an array on a ready month, absent on an out-of-range one.

The window is padded by four days on each side so a band that opens late in the previous month,
or closes early in the next, still reaches this month's reader; four days exceeds the Moon's
~2.2-day sign transit, so the padded run's own clipped first period always closes before the
month begins and is filtered out. The UI keeps a band when it **overlaps** the local month
rather than when a single instant falls inside it, and dedupes on the shared closing ingress,
since a straddling band is returned by two of the three UTC months it slices.

The strip renders one row per band: the sign the Moon is crossing, both starts, the shared end,
and a proportional bar with the modern stretch marked inside it — the same shape the Moon tab
uses, because the modern void is contained in the classical one rather than competing with it.
The four existing day-cell marks and their legend are unchanged: a fifth mark on roughly half
the days would have diluted the ones that mark a single moment.

### Three claims in this spec that the build proved wrong

- **Part A, transit sampling: "the fastest of these bodies is the Sun at about 1.02° a day" is
  wrong.** The Sun's figure is right (measured maximum over a one-day step, 1901–2100: 1.020°)
  but it is not the fastest of the nine. **Mercury is, at 2.20°/day** (measured over the same
  range; the engine and `docs/SKY.md` carry the slightly conservative 2.21°). Venus at 1.26° is
  also faster than the Sun. Daily sampling is still safe, but for a margin against 2.21° rather
  than 1.02° — `WRAP_GUARD_DEG = 45` is an order of magnitude clear of it either way.
  `docs/SKY.md`'s "Transit sampling, and why it is safe" already states this correctly; ruling
  S7(b) ordered the spec brought into line with it.

- **Part D, "already declared in `server/ishtar/readings/kinds.py` and mapped to `/sky/` in
  `rooms.js`" was wrong on both counts.** The earlier sub-project deliberately deferred the
  `transit-calendar` kind rather than declaring it ahead of use, and `rooms.js` had no entry for
  it either. Task 10 had to add the kind to `kinds.py`, the `PAGES` and `LABELS` entries to
  `rooms.js`, **and migration `readings/0004_alter_reading_kind`**, which widens the model's
  `kind` choices. That migration is part of this release and has to be applied when it ships.

- **Part A, personal transits: "the ten natal planets always" is wrong on the approximate
  path.** With a birth time and birthplace the chart's own planets are used and the natal Moon
  is among them. Without a birth time, `natalTargets` builds its own longitudes at noon UTC and
  covers **nine**, not ten: the natal Moon is excluded, because a birthday is a local calendar
  date and the true instant can be up to 26 hours from noon UTC, over which the Moon's longitude
  moves by as much as **16.67°** — most of a sign. An "exact" contact to a point that uncertain
  is worse than saying nothing. The angles are excluded on the same path for the separate reason
  the spec already gives.

## Part A: `sky-calendar-engine.js`

A pure UMD module, no DOM, testable under Node. It uses the same geocentric apparent longitude
expression every other engine here uses, `Ecliptic(GeoVector(body, time, true)).elon`, so a
moment it reports agrees with the natal, return and horary engines by construction.

Supported range is 1901–2100, matching `NatalEngine`. Out-of-range input returns a status
rather than throwing, the way the natal engine does.

### Moon now

`moonNow(date)` returns the Moon's phase name and angle, illuminated fraction, sign and degree,
the next four quarter moments, the next sign ingress, and the current void-of-course state
under both definitions (below).

Phase angle and illumination come from Astronomy Engine. The four quarters come from
`SearchMoonQuarter` and `NextMoonQuarter`. The eight phase names match the existing
`BirthLore.moonNames`, so the hub's today strip and this section never disagree.

### Void of course, both definitions

A void period runs from the Moon's **last exact Ptolemaic aspect** to a listed planet until the
Moon's **next sign ingress**. If the Moon makes no such aspect while in a sign, the whole sign
transit is void.

`voidPeriods(from, to, planets)` takes the planet list as an argument. Two lists are used:

- **Classical**, Lilly's: Sun, Mercury, Venus, Mars, Jupiter, Saturn. This is the same set
  `ClassicalEngine.moonCondition` uses for horary, so the two sections agree.
- **Modern**: the classical six plus Uranus, Neptune and Pluto.

Adding planets can only move the last aspect later, never earlier, so **the modern void is
always a sub-interval of the classical one, sharing its end**. That is a property of the
definition, not an assumption, and the UI renders it as one band with the modern stretch marked
inside it rather than as two competing bands. A test asserts the containment across a year.

Aspects are the five Ptolemaic angles, 0°, 60°, 90°, 120° and 180°. The search brackets every
six hours and searches both chiralities of each aspect, because Astronomy Engine's `Search`
finds only ascending zero crossings. This mirrors `classical-engine.js` exactly, and
`docs/HORARY.md` already records the reasoning.

### Month calendar

`monthEvents(year, month)` returns every event whose instant falls in that calendar month, in
time order, each carrying a UTC instant the UI renders in the reader's local zone:

- **Quarter moons**, from `SearchMoonQuarter` and `NextMoonQuarter`.
- **Sign ingresses** for the Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune
  and Pluto, found by searching for each crossing of a 30° multiple.
- **Stations**, retrograde and direct, for Mercury through Pluto. The Sun and Moon never
  retrograde and are excluded. Longitudinal speed is a central difference, the same measure
  `natal-engine.js` uses for its `retrograde` flag; a station is a sign change of that speed,
  bracketed daily and refined with `Search`.
- **Eclipses**, lunar from `SearchLunarEclipse` and `NextLunarEclipse`, solar from
  `SearchGlobalSolarEclipse` and `NextGlobalSolarEclipse`. Each carries its kind, peak instant
  and magnitude, and a solar eclipse also carries the latitude and longitude of greatest
  eclipse. Per Glenn's decision these are **global circumstances only**; the section never
  claims an eclipse is or is not visible from where the reader is.
- **Void bands**, both definitions, from `voidPeriods`, returned as a sibling `voids` key
  rather than as entries in `events`. See *Corrections and deferrals* above.

### Retrograde tracker

`retrogradeState(date)` returns, for Mercury through Pluto, whether it is retrograde now, the
current period's bounds if so, and the next period otherwise. Each period carries its shadow
dates: the pre-shadow begins when the planet first reaches the degree of the coming direct
station, and the post-shadow ends when it returns to the degree of the retrograde station.
Shadows are reported as dates only, with no interpretation, as the program spec requires.

### Personal transit calendar

`personalTransits(natalChart, year, month, options)` returns the **exact** moments in the month
when a transiting body perfects one of the five major aspects to a natal point. These are
root-found instants, not an orb window, so a contact appears once with a time rather than as a
multi-day band.

- **Transiting bodies:** the Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune and
  Pluto. **The Moon is excluded by default** and available behind a toggle. This is my
  judgement, not Glenn's instruction: the Moon perfects roughly sixty exact aspects a month and
  would bury every slower contact in the list. The toggle's label says so.
- **Natal points:** the chart's ten natal planets when a birth time and place were given, and
  **nine** on the approximate noon-UTC path, which excludes the natal Moon (corrected; see
  *Corrections and deferrals* above). The Ascendant, Midheaven, Descendant and Imum Coeli are
  added only when the chart resolved to `ready`, meaning a birth time and place were given. A
  birthday-only profile gets the nine planets and a line saying the angles need a birth time. Mean nodes are excluded to keep the list readable, and the disclosure says so.

**Performance is part of the design.** The naive loop is about 1400 root searches a month and
would visibly freeze the page. Instead the engine samples each transiting body's longitude once
per day across the month, roughly 290 ephemeris evaluations, then does all aspect arithmetic on
those cached values and calls `Search` only where consecutive samples actually bracket a
crossing. Daily sampling is safe because the fastest of these bodies moves about 2.21° a day —
**Mercury, not the Sun** (corrected; see *Corrections and deferrals* above) — well inside the
45° wrap guard; the Moon's toggle drops to six-hour sampling for the same reason in reverse.
One month's samples are memoized.

## Part B: `sky-calendar-text.js`

Original copy tables, one reflection and one prompt each, framed as what a moment is
traditionally associated with, never as a forecast:

| Table | Entries |
|---|---|
| Moon phases | 8 |
| Sign ingresses | 12 signs, with the moving body named in the sentence |
| Retrograde planets | 8: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto |
| Eclipse kinds | 6: total, annular and partial solar; total, partial and penumbral lunar. These are exactly the kinds Astronomy Engine reports for each eclipse type |
| Void of course | 1 framing passage naming both traditions |
| Aspects, for personal transits | 5 |

A text test asserts none of the copy contains "you will", "will happen", "is going to", "the
answer is", a bare "yes" or "no", "luck", or "fortune", matching `tests/horary-text.test.cjs`.

## Part C: UI

A new `#sky-calendar` section on `/sky/`, below the daily horoscope, with its own
`sky-calendar.css` and four tabs following the pressed-button and hidden-panel pattern the
Jyotish, horary and chart-in-time sections already use:

1. **Moon now** — phase, illumination, sign and degree, the next four quarters, the next
   ingress, and the current void state with both traditions labelled.
2. **This month** — a seven-column grid of day cells, each listing that day's events, with a
   list-view toggle, previous and next month, and a "this month" reset. Arrow keys move between
   day cells on a roving tabindex; Enter opens a day's detail. At 700px and below the list view
   is the default, because a seven-column grid of event text does not fit a phone.
3. **Retrogrades** — current and next period per planet, with shadow dates.
4. **My transits** — the personal calendar, a sample-chart state when no birth profile exists,
   and the Moon toggle.

Each tab carries an "About these calculations" disclosure naming its convention and sources,
as every calculated section here does. The section takes a `data-fold` attribute for the mobile
disclosure and `data-room="transit-calendar"` for the journal's `?reading=` opener.

## Part D: Saving

Only the personal transit calendar is a reading. It registers as kind `transit-calendar` with
category `sky`. **Neither `server/ishtar/readings/kinds.py` nor `rooms.js` carried it** — this
spec's claim that both already did was wrong, and Task 10 added the kind, the two `rooms.js`
entries and migration `readings/0004_alter_reading_kind`, which is part of this release (see
*Corrections and deferrals* above). The payload is the birth snapshot and the month, matching the program spec's table;
the room recomputes on open. The summary reads like "March 2027 · 14 exact contacts".

This is the first kind in the `sky` category, so the **Sky filter chip is added to the journal**
on `/account/`. C0 deliberately shipped without it and the ledger recorded that this
sub-project would add it.

Moon now, the month calendar and the retrograde tracker are not readings and are not saveable.

## Part E: Validation

`tools/build_sky_fixtures.py`, a development-only script requiring pyswisseph, regenerates
`tests/fixtures/sky-reference.json` independently of Astronomy Engine, covering five years
spread across the supported range:

| Fixture | Method | Tolerance |
|---|---|---|
| Quarter moons | Bisection on the Moon–Sun elongation crossing 0°, 90°, 180°, 270° | 1 minute |
| Sign ingresses | Bisection on longitude crossing each 30° multiple | 1 minute |
| Stations | Sign change of `swe.calc_ut` speed with `SEFLG_SPEED` | 1 hour |
| Eclipses | `swe.lun_eclipse_when` and `swe.sol_eclipse_when_glob` | peak within 3 minutes |

Where a tolerance turns out not to hold, the plan records the measured disagreement and its
cause rather than widening the tolerance silently, the way `docs/EXTENDED-ATLAS.md` documents
the BaZi start-age difference against lunar_python.

Beyond the fixtures, `tests/sky-calendar.test.cjs` covers: the modern void being contained in
the classical void across a year; a sign transit with no aspect at all being wholly void; month
boundaries including an event at the first and last instant of a month; leap days; the 1901 and
2100 bounds; an empty month for a slow planet's ingresses; and personal transits against a
birthday-only chart omitting the angles.

Browser verification covers both widths, keyboard navigation of the grid, month stepping across
a year boundary, the sample state, saving and reopening a transit calendar, and the Sky chip
filtering the journal.

## Out of scope

Everything the program spec excludes for C1: heliocentric and topocentric positions,
occultations, a general planetary conjunction search beyond the natal-hit list, and
notifications. Also excluded here: per-reader eclipse visibility (Glenn's decision), asteroids
and Chiron (no ephemeris in the vendored library), and any claim about what an event means for
the reader's future.
