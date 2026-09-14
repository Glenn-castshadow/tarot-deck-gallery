# C3a Charts: profections, the Part of Fortune, minor aspects and aspect patterns

Date: 2026-09-14. Status: design.
Parent program: `docs/superpowers/specs/2026-09-13-site-expansion-design.md`, sub-project C3.

## Purpose

Four techniques that read more out of the birth chart the site already casts. None of them needs
a new chart, a new instant or a new place: every one is derived from the natal chart in hand.

## C3 is three sub-projects, and this is the first

The program spec's C3 covers two pages and nine features. Split by what each needs:

| Sub-project | Features | Needs |
|---|---|---|
| **C3a, this spec** | Annual profections, Part of Fortune, minor aspects, aspect patterns | The existing natal chart only |
| **C3b** | Composite and Davison charts | A second birth profile; Davison needs a fresh ephemeris call |
| **C3c** | Gochar, the BaZi annual pillar, the Chinese year forecast | The eastern page, and a page-ownership decision |

Each gets its own spec, plan and release. C3a is first because it is the only one that touches
nothing outside the chart already on screen.

## Two findings from the survey that bound this work

**Nothing on the charts page can be saved.** `server/ishtar/readings/kinds.py` registers six chart
kinds and `rooms.js` carries their pages and labels, but **no file calls `Rooms.register` for any
of them**. The natal chart, solar and lunar returns, progressed charts, synastry and horary all
have the server side and the routing in place and no room behind it. `tests/rooms.test.cjs` asserts
only the routing, so the gap is known rather than missed.

That is a gap in the program spec rather than in C3: Part B gave C0 the tarot and divination rooms
and assigned the chart rooms to nobody. **It is recorded here and left alone.** Writing six rooms,
each with a `current()` that snapshots its inputs and a `load()` that replays them, is its own
sub-project with its own risks, and folding it into a feature spec would mix two unrelated changes.

**So C3a adds no journal kind and no payload.** Its four techniques are read off a chart that is
itself unsaveable; making them saveable while the chart is not would be incoherent.

## Decisions

Every decision here is mine, taken under instruction to complete C3 unattended. Each is recorded
with what it costs if wrong.

| Decision | Choice | Cost if wrong |
|---|---|---|
| Profections count whole-sign from the Ascendant, whatever house system the chart displays | The technique's own convention | A reader using Placidus sees a profected house that is not their displayed house |
| The profection year runs birthday to birthday | Standard, and the only boundary that makes "age" meaningful | A reading near a birthday shows the neighbouring year |
| Part of Fortune uses the sect-sensitive formula | Traditional; the day-only formula is a modern simplification | Night charts show the Lot reflected across the Ascendant |
| Minor aspects use a fixed 2° orb, not scaled by the chart's orb setting | The scale is a statement about the major aspects | A reader who widened their orbs sees minors stay tight |
| Minor aspects are always computed; the toggle governs display only | Otherwise yods appear and vanish with the toggle | Slightly more work per chart, imperceptible |
| No journal kind, no payload change | Nothing on this page saves | None until the saving gap is closed |

### Profections

Age in completed years at the target date gives the profected house: `(age mod 12) + 1`, counted
from the first. The sign on that house is the Ascendant's sign advanced by the same count, whole
sign, and the **time lord** is that sign's traditional ruler, taken from `ClassicalEngine.rulers`.

Whole-sign counting is the technique's own, so a chart displayed in Placidus still profects whole
sign. The page says so where it shows the result, because a reader comparing the profected house
against their displayed cusps will otherwise think one of them is wrong.

The target date defaults to today and is selectable by year, so a reader can look at the year they
were twenty as easily as this one.

### The Part of Fortune

```
day chart:    Ascendant + Moon − Sun
night chart:  Ascendant + Sun  − Moon
```

Sect comes from `ClassicalEngine.sect(chart)`, which returns `'day'` or `'night'` by whether the
Sun is above the horizon. Both formulas reduce mod 360.

The sect-sensitive pair is the traditional treatment. A good deal of modern software uses the day
formula for every chart, which places the Lot differently in half of all charts; the page names
which formula it used and why.

### Minor aspects

| Aspect | Angle | Orb |
|---|---|---|
| Semi-sextile | 30° | 2° |
| Semi-square | 45° | 2° |
| Sesquiquadrate | 135° | 2° |
| Quincunx | 150° | 2° |

They extend the existing five rather than replacing them. `aspectsFor(points, orbScale)` keeps its
current signature and behaviour exactly — an options argument adds the minors, and omitting it
deals as before. That matters because the existing aspect tests pin the current output and because
every other caller of the function expects the five.

The 2° orb is fixed. The chart's orb setting multiplies the major orbs by 0.75, 1 or 1.25, and it
exists so a reader can decide how loose a square counts as a square. A minor aspect at a 2° orb is
already the fine-grained layer, and scaling it would make the toggle mean two things at once.

### Aspect patterns

| Pattern | Definition used |
|---|---|
| Stellium | Three or more of the ten planets in one sign |
| Grand trine | Three planets each trine the other two |
| T-square | Two planets in opposition, both square a third |
| Grand cross | Four planets forming two oppositions, each square its two neighbours |
| Yod | Two planets sextile each other, both quincunx a third |

Each is listed with its members and, where it has one, its apex: the third planet of a T-square,
the quincunx-receiving planet of a yod.

Patterns are found from the full aspect set including the minors, **whether or not the minor
toggle is on**. The yod needs quincunxes, and a pattern that appeared and vanished as a reader
flicked a display toggle would be a bug wearing a feature's clothes. The toggle governs what is
listed and drawn, never what is true of the chart.

Stellium is defined by sign rather than by orb because the sign is what the tradition means by it,
and because an orb-based definition needs a second arbitrary number on top of the aspect orbs.

## Architecture

**One new module, `chart-depth-engine.js`**, a pure UMD module with no DOM access, exporting:

```
ChartDepthEngine.profection(chart, targetDate)  -> {age, house, sign, signIndex, lord, from, to}
ChartDepthEngine.partOfFortune(chart)           -> {longitude, sign, signIndex, degrees, house, sect, formula}
ChartDepthEngine.patterns(aspects, points)      -> [{type, members, apex}]
```

Profections and the Lot need the chart; patterns need only the aspect list and the points, which
keeps that function testable against hand-built inputs.

**`natal-engine.js` gains the minor aspect table and an option**, because that is where aspects
live and splitting them across two modules would mean two orb tables:

```
NatalEngine.minorAspectTypes                     // the four above
NatalEngine.aspectsFor(points, orbScale, {minor = false})
```

`chartAtInstant` computes with the minors included and stores them, so patterns are stable and the
UI filters for display. The existing five-aspect behaviour when `minor` is omitted must stay
byte-identical, and a test pins that.

**The UI** adds one section to the charts page under the existing natal output: the profection for
a chosen year with its time lord, the Part of Fortune's placement, and the pattern list. The minor
aspects appear as a toggle on the existing aspect list and the existing wheel rather than as a
separate display.

## Astronomical honesty

Nothing here needs a new ephemeris call. Profections are arithmetic on dates. The Lot is arithmetic
on three longitudes the chart already carries. Minor aspects and patterns are arithmetic on the
aspect separations already computed.

The Part of Fortune is the one place where a wrong answer would look right, because a reflected Lot
still lands in a real sign and a real house. So its fixtures pin both formulas against charts of
known sect, including a chart with the Sun close to the horizon where the day/night call is the
thing under test.

## Testing

`tests/chart-depth.test.cjs`:

- **Profections.** Age 0 profects to the first house; age 12 returns there; age 11 gives the
  twelfth. The sign advances with the house and wraps at Pisces. The time lord matches
  `ClassicalEngine.rulers` for every one of the twelve signs. A target date the day before a
  birthday and the day after give different years.
- **The Part of Fortune.** Both formulas computed by hand for a day chart and a night chart, to
  0.01°. The two differ by exactly twice the Sun-Moon distance, reflected — a property that catches
  a sign error in either formula. A chart with the Sun within a degree of the Ascendant is included
  because that is where the sect call flips.
- **Minor aspects.** Each of the four found at its exact angle and at the 2° edge, and not at 2.1°.
  Omitting the option reproduces the existing five-aspect output exactly, for a fixture chart.
  The orb scale does not widen the minors.
- **Patterns.** One hand-built chart per pattern, with the members asserted by name. A grand cross
  is not also reported as two T-squares. A yod is found only when a quincunx is present. Three
  planets in one sign is a stellium and two is not.
- **The existing suite must not move.** `tests/natal-engine.test.cjs` pins the current aspect
  output and must pass untouched.

**Fixtures are not regenerated, and the reason matters.** The original plan was to add the Lot to
`tools/build_natal_fixtures.py`. That generator needs pyswisseph, which is not installed in this
environment, so regenerating `natal-reference.json` here is not possible. Re-running it elsewhere
and trusting the result would also mean shipping a fixture file nobody in this session verified.

The existing fixtures already carry everything the Lot needs. Each of the ten cases has a
Swiss-derived `asc` and `points.Sun.longitude` and `points.Moon.longitude`. So:

- The **formula** is pinned by hand-computed cases and by the reflection property, neither of
  which depends on the fixture.
- The **wiring** is pinned against the fixtures: for each of the ten charts the engine's Lot must
  equal the Lot recomputed from the fixture's own Swiss positions. That proves the engine reads
  the right three numbers off the right chart, which is the failure a formula test cannot catch.

Stated plainly because it is a real limitation: this validates the Lot's inputs independently and
its arithmetic only against hand-computed values. Adding a Swiss-derived Lot to the generator is
worth doing the next time that toolchain is available.

Browser verification: the section renders for a saved profile and for the sample chart; changing
the profection year changes the house, sign and lord; the minor toggle adds aspects to the list and
lines to the wheel without changing the pattern list; the layout holds at 390px and 1400px.

## Files

| File | Change |
|---|---|
| `chart-depth-engine.js` | Create. Profections, the Lot, patterns. |
| `natal-engine.js` | Modify. The minor aspect table and the option. |
| `natal-room.js` | Modify. Render the new section. |
| `natal-chart.js` | Modify. Draw minor aspect lines when enabled. |
| `charts/index.html` | Modify. The section, the toggle, cache keys. |
| `celestial-room.css` | Modify. Styles for the new section. |
| `tests/chart-depth.test.cjs` | Create. |
| `docs/NATAL-CHART.md` | Modify. The four techniques, their conventions and sources. |

## Out of scope

Chart-page saving, which is recorded above as a program-level gap. Composite and Davison charts
(C3b). Anything on the eastern page (C3c). Other lots besides Fortune. Harmonic charts, midpoints
as a display layer, fixed stars, and the out-of-scope list the program spec already carries for C3.

## Constraints

Part E of the program spec binds unchanged: no new dependencies, pure UMD engines tested under
`node --test`, an About disclosure naming conventions and sources, a copy test for forbidden
phrasing, keyboard operable and reduced-motion respecting, verified at 390px and 1400px, cache keys
bumped on every changed file, docs updated, and commits ending with the co-author line.
