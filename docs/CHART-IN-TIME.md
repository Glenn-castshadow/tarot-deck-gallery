# Chart in time

The celestial atlas extends the calculated natal chart into time: a solar return for the year, a lunar return for the month, and progressed or directed charts for the slow movement underneath both. Every instant is solved in the browser from the saved birth chart; no birth details are sent to a chart API.

## Included

- **Solar return** — the moment the transiting Sun regains its natal longitude, cast as a full chart for a chosen place, with the return Sun's house and the return Ascendant read against the birth sky.
- **Lunar return** — the same for the Moon, roughly thirteen or fourteen times a calendar year.
- **Progressions and directions** — secondary progressions, tertiary progressions and solar arc directions for any date between 1901 and 2100.
- A two-ring bi-wheel for each view: the birth sky on the inner ring, the return or progressed chart on the outer. The renderer is shared with the transits, synastry and BaZi section, so both sections draw the same wheel.
- Backwards and forwards navigation through returns, a "this year"/"now" reset, a method selector and a date picker for the slow chart, and a sample chart for anyone who has not entered birth details.
- Return placements, houses and angles, progressed placements, and progressed contacts to the birth chart, each in a collapsible table or list.
- Original reflection text for the return Sun's house, the return Moon's house, the return Ascendant sign, the progressed Sun's sign, the progressed lunation phase and each contact type. Interpretations describe traditional astrological symbolism offered for reflection; they are not forecasts, predictions or scores.
- Each view carries an "About this solar return"/"About secondary progressions" disclosure stating the convention used, so the method is visible beside the reading.

The section's own stylesheet is `chart-in-time.css`, but `chart-in-time.js` writes markup that deliberately reuses classes owned by neighbouring sections, and the section loses styling if any of them is removed or renamed. `.cx-profile-bar`, `.cx-missing`, `.cx-error`, `.cx-chart-art`, `.cx-ring-key`, `.cx-wheel` and `.cx-method` are defined **only** in `celestial-extras.css` (`.cx-comparison`, `.cx-placements` and `.cx-table-wrap` are defined there and adjusted here). `.acg-eyebrow` comes from `astrocartography.css`, where `.acg-small-label` also originates before being restyled here. The return-location picker's `.birthplace-field`, `.city-input-wrap`, `.city-suggestions` and `.city-search-status` come from `celestial-room.css`, alongside the birth form they were written for.

## Astronomical conventions

Return moments are solved with Astronomy Engine's `Search` over exactly the longitude expression the natal engine uses — `Ecliptic(GeoVector(body, time, true)).elon`, the geocentric apparent longitude referred to the true ecliptic of date. A mean-motion estimate seeds the search, a single Newton step corrects it (the equation of centre can put the true Sun about 2° — roughly two days — away from a mean estimate), and the bracket is then ±2 days around the corrected seed. Both bodies are prograde at a return, so the crossing is ascending, which is what `Search` requires.

The search converges on **time**, to a tolerance of `dt_tolerance_seconds: 0.01`. After it returns, the solution is re-checked against the natal longitude and rejected if the residual exceeds `MAX_RESIDUAL_DEGREES = 1e-5`. That gate is deliberately not tighter: 0.01 s at the Moon's maximum speed of about 15.4°/day is already ~1.8e-6°, so a 1e-6° gate rejects perfectly good convergence (measured at about 0.8% of lunar returns). The gate exists to catch a search that settled on the *wrong* crossing, which is wrong by whole degrees — 1e-5° admits every legitimate solution with margin while staying five orders of magnitude tighter than any real failure.

**A return moment is the same everywhere on Earth.** The Sun or Moon regains its natal longitude at one instant; only the houses, the Ascendant and the Midheaven follow the place the chart is cast for. Relocating a return therefore moves the angles and leaves the planetary longitudes untouched.

Returns in this release are **not precessed**. The natal longitude is used as recorded in the tropical chart, with no precession correction applied to the target degree.

The return chart itself comes from `NatalEngine.chartAtInstant`, so houses, angles, the mean lunar nodes, the aspect set and the Placidus-to-Whole-Sign polar fallback are identical to the birth chart, and the return inherits the birth chart's house system and orb scale. Contacts between the return planets and the birth planets use a 2° orb across the five major aspects.

Return navigation is anchored to a reference moment — by default, now. Index 0 is the last return at or before that moment, so the solar return on screen is the one governing the current year rather than the next birthday. The navigation arrows step whole returns from there. Requests that would fall before the birth date, or outside 1901–2100, are refused rather than extrapolated.

Returns are cast for **where you expect to be**, not necessarily where you were born. The picker is the same accent-insensitive, keyboard-and-touch city search used for the birthplace, pre-filled with your birthplace, with "Use my birthplace" as a one-click reset. Unlisted places can be entered as latitude, longitude and an IANA time zone; blank coordinate fields are refused rather than read as 0°. The chosen place is stored inside the existing `arcana-birthday-profile-v1` localStorage record as an optional `returnLocation` field, written through `IshtarStorage`, so it is saved only when storage consent has been given. Profiles saved before this release remain readable.

The write happens **whenever the return location changes** — on a successful "Update return charts" and on "Use my birthplace" — not only when the birth form is re-submitted. `ChartInTime.attach` takes an `onLocationChange` callback for exactly this; the section itself touches no storage. The callback updates the stored profile in place, and does nothing at all when there is no stored profile, so declining optional storage or having no saved birth date still writes nothing. On the way back, a profile with no `returnLocation` resets the picker to the birthplace fallback rather than leaving a previous session's city on screen — the birth-profile restore can run a second time mid-session when an account signs in and syncs.

## Progression conventions

**Secondary progressions** advance the ephemeris one day for each mean tropical year of 365.2422 days. **Tertiary progressions** advance one day for each sidereal lunar month of 27.321582 days; the synodic month of 29.530589 days is a different convention and is deliberately not used here. In both cases the progressed instant is a real moment of ephemeris time, and the chart is calculated at that instant by the same `chartAtInstant` path as the birth chart.

**Progressed angles come from real sidereal time at the progressed instant, cast for the birthplace.** The Naibod arc is not used, and the Midheaven is not directed by the solar arc in the secondary or tertiary methods.

**Solar arc directions** take the arc from the secondary progressed Sun: the arc is the secondary progressed Sun's longitude minus the natal Sun's, and every natal planet, node and angle is advanced by that same arc. The Naibod variant of the arc is not used. Because a directed point carries no meaningful daily motion of its own, its speed is reported as zero and **applying/separating is not reported for directed points**. The arc accumulates past 180° for long spans and is not wrapped to a signed value. The house cusps are left as the natal cusps, so a directed point is reported in the natal house its new longitude falls into.

This makes the solar-arc result deliberately mixed, and it is worth stating plainly: `angles` are directed (natal angle plus the arc) while `cusps` are the untouched natal cusps, so for this method alone `cusps[0]` does **not** equal `angles.asc` — the two differ by exactly the arc. For secondary and tertiary, which cast a whole chart at the progressed instant, `cusps[0]` and `angles.asc` are the same number. A test asserts both halves of that, so the mismatch stays a convention rather than drifting into a defect.

Contacts from the moving chart to the birth chart use the five major aspects with a **2° orb for secondary and tertiary progressions and a 1° orb for solar arc**, the tighter orb reflecting the slower, more exact character of a directed contact. The twelve tightest contacts are shown.

The progressed lunation phase is read from the angular separation of the progressed Moon and progressed Sun, divided into the eight traditional phases (New, Crescent, First Quarter, Gibbous, Full, Disseminating, Last Quarter, Balsamic). Under solar arc this figure is necessarily the *natal* lunation: the Sun and the Moon both advance by the same arc, so their separation is invariant. The phase is still shown, because the natal lunation is meaningful beside a directed chart, and the method note for solar arc says outright that it is unchanged from birth.

**Converse directions are out of scope.** A target date earlier than the birth date is refused — `{status:'error'}` with "Choose a date on or after the birth date." — before any chart is cast, on every method. The comparison is against the birth *calendar* date rather than the elapsed interval: a target date resolves to noon UTC, so an afternoon birth makes its own birth date elapsed-negative by a few hours, and that chart, which is the natal chart to within about a minute of ephemeris offset, stays reachable. The date picker's `min` attribute follows the loaded chart's birth date, so the refusal is not the first thing that says so.

All of this requires a birth time and a confirmed birthplace. Without them the section says so and offers a sample chart rather than inventing angles. Calculations support 1901–2100; uncertain birth records and approximate coordinates can matter far more than the numerical precision of the engine.

## Independent validation

Run:

```
node --test tests/chart-in-time.test.cjs
```

Twenty-seven tests cover the engine. Five of them check the solved return instants against Swiss Ephemeris: `tests/fixtures/chart-in-time-reference.json` holds a solar return for a New York birth, a solar return for a southern-hemisphere birth, a solar return for a 29 February birth resolved in a common year, a lunar return for the same New York birth, and a lunar return at the early end of the supported range (a 1905 birth read against a 1950 reference date). The fixtures were generated with Swiss Ephemeris 2.10.03 in Moshier mode by `tools/build_chart_in_time_fixtures.py`, run in a throwaway pyswisseph virtual environment; Swiss Ephemeris is an independent local test tool only, and neither its source nor its binaries are shipped. The version used is recorded in `tests/fixtures/chart-in-time-reference.json` alongside the cases.

Each fixture checks the return instant to within **15 seconds** and all ten planetary longitudes in the return chart to within **0.03°**. The 15-second bound reflects inter-ephemeris disagreement between Astronomy Engine and Swiss Ephemeris in Moshier mode — up to about 7 seconds observed — and not solver precision; a search that settled on the wrong crossing would be out by a month or a year, not by seconds. A second independent check compares the solar return against Astronomy Engine's own `SearchSunLongitude`, which reaches the Sun through a different light-time path, and pins the residual gap to that path rather than to the bracket or Newton logic.

The remaining tests cover: the Sun and Moon actually returning to their natal longitude; the governing return being the last one at or before the reference date; lunar returns being monotonic, 27.3 days apart and 13 or 14 per calendar year; relocation moving the angles while leaving the planets alone; the convergence gate accepting a real lunar return that a 1e-6° gate rejected; out-of-range, pre-birth, absurd-index, missing-birth-time and unknown-method inputs erroring rather than throwing or inventing a chart; secondary progressions reproducing the natal chart at the birth date and advancing one day per tropical year; tertiary progressions using the sidereal rather than the synodic month; the solar arc matching the secondary progressed Sun and accumulating past 180° without wrapping; the lunation phase reading from the progressed lights; the 2°/1° contact orbs; a target date before the birth date being refused on all three methods while the birth date itself stays reachable; and the progressed first cusp equalling the progressed Ascendant for secondary and tertiary while solar arc keeps the natal cusps beside a directed Ascendant.

The whole suite runs with:

```
node --test tests/*.test.cjs
```

which is 134 tests at the time of writing: the rest of the suite plus five `chartAtInstant` tests added to `natal-engine`, four for the shared bi-wheel, and the twenty-seven above. Note the glob — `node --test tests/` fails on Node 24 with `MODULE_NOT_FOUND`, so the path must be expanded by the shell.

Manual browser QA covers desktop and 390px layouts, keyboard and touch selection in the return-location picker, manual coordinates, tab and date state surviving a birth-details change, the mobile fold opening and closing one section at a time, the shared bi-wheel still rendering in the transits/synastry/BaZi section, print layout, and a console free of warnings and errors.

Printing hides the tabs, the place form and the navigation controls, opens every collapsed disclosure inside the section, and prints the currently selected view — the year, the month or the slow chart — on its own page. Placement tables scroll inside their own container on screen and are not allowed to widen the page at any width.

See [docs/JYOTISH.md](JYOTISH.md) for a sidereal (Vedic) reading of the same birth chart: nakshatras, Vimshottari dashas and the navamsa chart, using its own Rashi/Navamsa renderer rather than the shared bi-wheel.
