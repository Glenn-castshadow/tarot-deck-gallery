# Calculated natal charts

The celestial atlas calculates a tropical natal chart from a Gregorian date, recorded local clock time, geographical coordinates and an IANA time zone. Calculations and city searches run in the browser; no birth details are sent to a chart API.

## Included

- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune and Pluto, with sign, degrees/minutes, house and apparent direction of motion.
- Mean north/south lunar nodes; Ascendant, Descendant, Midheaven and Imum Coeli.
- Placidus (default), Whole Sign and Equal houses. If Placidus is undefined at a polar latitude/time, the calculated result explicitly switches to Whole Sign and displays a notice.
- A fourth house system, Regiomontanus, is also available to `calculate`/`chartAtInstant` for the Horary section (see [docs/HORARY.md](HORARY.md)); the natal chart's own house-system default remains Placidus, and the birth form's house select is unchanged.
- Five major ecliptic aspects: conjunction, sextile, square, trine and opposition. Standard maximum orbs are 8°, 4°, 6°, 6° and 8° respectively. Tighter/wider settings multiply these by 0.75/1.25. Contacts to ASC/MC are included; redundant axis-to-axis and north-to-south-node contacts are excluded.
- Zoomable vector chart (100–300%), selectable planets and houses, an accessible detail selector, aspect filtering/highlighting, placement and cusp tables, element/quality counts, SVG download and print styling for the report.
- Original reflection text for planet/sign/house combinations, houses and aspects. Interpretations describe astrological symbolism; they are not predictions or diagnostic personality claims.
- Annual profections, the sect-sensitive Part of Fortune, four minor aspects and five aspect patterns, read off the same chart under "Traditional techniques" (see below).

## Astronomical conventions

[Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy/tree/v2.1.19) is vendored under its MIT license. `GeoVector(body, date, true)` and `Ecliptic(vector)` give geocentric apparent planetary longitudes referred to the true ecliptic of date. The observer location affects the angles and houses, not these geocentric longitudes. The apparent motion flag uses a centred one-day finite difference; “near station” means absolute motion below 0.005°/day.

The mean lunar node uses the secular longitude polynomial around J2000. These are mean nodes, not osculating/true nodes or physical planets. Asteroids such as Chiron are not part of this release's calculations.

Apparent local sidereal time and true obliquity determine the Ascendant and meridian. Placidus cusps are solved by bisection of the ecliptic point's semi-diurnal/semi-nocturnal arc fractions; this implementation does not copy Swiss Ephemeris source. [Astrodienst's technical documentation](https://www.astro.com/swisseph/swisseph.htm) describes the house definitions. In Whole Sign and Equal systems, MC is still calculated independently and need not begin house 10.

Aspect separation uses the shorter arc of ecliptic longitude. Applying/separating compares the current orb with an extrapolation one hour ahead using local angular speeds; it is an estimate near the birth moment. It is not assigned to contacts with chart angles. Balance gives each of the ten planets one count, excluding nodes and angles. No weighted strength or fortune score is claimed.

Calculations support 1901–2100. The display rounds down to arcminutes. Uncertain birth records, historical civil-time rules and approximate city coordinates can matter more than the numerical precision of the engine. The model makes its time zone, resolved UTC and actual house system visible in the report.

## Traditional techniques: profections, the Part of Fortune, minor aspects and patterns

The natal report's "Traditional techniques" section reads four further techniques off the chart already calculated above. None needs a new ephemeris call; each is arithmetic on dates, longitudes or aspect separations already in hand. Profections and the day/night reversal of the Lot of Fortune follow the Hellenistic tradition as Vettius Valens set it out in his *Anthology* (2nd century CE); the names of the aspect patterns (T-square, grand cross, yod and the rest) are modern.

**Annual profections** count whole sign from the Ascendant, one sign per year of age, whatever house system the chart itself displays: `(age mod 12) + 1` gives the profected house, and the Ascendant's sign advanced by `age mod 12` signs gives the profected sign. This is the technique's own convention, so a chart displayed in Placidus still profects whole sign; the section names this explicitly next to the result, because a reader comparing the profected house against the chart's own cusps would otherwise take the difference for an error. The profection year runs birthday to birthday: age is completed years at the chosen date, so a date the day before a birthday and the day after fall in different years. The time lord is the profected sign's traditional ruler, taken from `ClassicalEngine.rulers`. A year selector lets a reader pick any year from birth to a decade past the current year.

**The Part of Fortune** uses the sect-sensitive pair rather than the day-only formula some modern software applies to every chart:

```
day chart:    Ascendant + Moon − Sun
night chart:  Ascendant + Sun − Moon
```

Sect comes from `ClassicalEngine.sect(chart)`: a day chart is one where the Sun is above the horizon, a night chart otherwise. Above the horizon is the half of the ecliptic from the Descendant round to the Ascendant, tested directly against the Ascendant rather than by house number: that matches houses 7 to 12 whenever house 1 begins at the Ascendant, and stays right in Whole Sign, where house 1 begins at the start of the rising sign and a Sun that has just risen can still fall in house 1. The day-only alternative is a modern simplification; using it on a night chart reflects the Lot across the Ascendant, so the section names which formula it used. The Lot's house is counted in the chart's own house system, unlike profections, which always count whole sign.

**Four minor aspects** extend the five majors, each at a fixed 2° orb: semi-sextile (30°), semi-square (45°), sesquiquadrate (135°) and quincunx (150°). The chart's orb-scale setting (0.75/1/1.25) multiplies only the major orbs; it is a statement about how loose a square or trine counts, and applying it to an already-fine 2° minor orb would make the same control mean two different things. Minor aspects are always computed and stored on the chart as `chart.minorAspects`, separate from the unchanged `chart.aspects`; a display toggle governs what is shown, not what is computed, so a pattern that depends on a minor aspect cannot appear and vanish as a reader flicks a checkbox. The Aspects panel in the report carries an "include minor aspects" checkbox that extends its list only; the chart explorer dialog carries a second, independent checkbox that adds the minor lines to the wheel (drawn lighter and dashed), the placement picker and the exported SVG. The small portrait wheel on the report itself always shows majors only.

**Five aspect patterns** are found from the major and minor aspects together, regardless of either minor-aspect toggle, because a pattern is a fact about the chart and not about what is currently on screen:

| Pattern | Definition |
|---|---|
| Stellium | Three or more of the ten planets share one sign |
| Grand trine | Three planets, each trine the other two |
| T-square | Two planets in opposition, both square a third (the apex) |
| Grand cross | Four planets forming two oppositions, each square its two neighbours; not also listed as its constituent T-squares |
| Yod | Two planets sextile each other, both quincunx a third (the apex) |

Stellium is defined by shared sign rather than by orb, because that is what the tradition means by it and an orb-based definition would need a second arbitrary number on top of the aspect orbs already in use. Patterns are found among the ten planets only; the lunar nodes and the chart angles are excluded.

**Validation limitation.** The Lot's formula is pinned by hand-computed day and night cases and by a reflection property (the two formulas differ by exactly twice the Sun-Moon distance, reflected, which catches a sign error in either one). Its wiring into a chart is checked against the existing Swiss-derived fixtures in `tests/fixtures/natal-reference.json`, to 0.1°: the engine's Lot is recomputed from each fixture's own Ascendant, Sun and Moon and compared against the value taken from the running chart. It is not validated against an independently computed Lot, because pyswisseph was not available when this was built; adding a Swiss-derived Lot to `tools/build_natal_fixtures.py` is worth doing the next time that toolchain is available.

## Civil time and location

`Intl.DateTimeFormat` supplies the browser's historical IANA rules. The resolver considers offsets around the entered date and validates each candidate by converting it back to the exact entered local date/time. A skipped spring-forward time produces an explicit error; a repeated fall-back time requires the earlier/later occurrence. This choice is saved. A date alone still opens the symbolic birthday, Chinese zodiac and number views; houses and a rising sign are not invented without a usable birth time/location.

[GeoNames city data](../assets/cities/README.md) supplies coordinates and a time-zone ID. The city picker supports keyboard and touch selection, aliases and accent-insensitive search. Unlisted locations can use custom latitude, longitude and an IANA zone. Editing a selected city discards its old coordinates. Legacy stored entries with a city plus region/country are resolved automatically only if there is one exact city-name match; ambiguous names require selection.

The existing `arcana-birthday-profile-v1` localStorage record gains optional `placeLocation`, `houseSystem`, `orbScale` and `fold` fields. Old profiles remain readable.

## Saving

The natal report carries the site's standard save control, "Save this chart to my
journal" (or "Sign in to save this chart" signed out), with the note "Saving stores the
birth details this chart was cast from." beside it. The saved payload (`chart-rooms.js`)
holds the birth date, time, place and the chart's own house system, fold and orb-scale
settings — the whole `birth` object a chart is computed from, nothing else.

Reopening a saved reading (`?reading=ID`) computes the chart from that payload with
`ChartRooms.natalFrom`, never from the live birth profile, and shows a "Saved chart ·
cast for …" banner above the sky portrait with a "Use my chart" button. While that
banner is showing, `natal-room.js`'s `BirthProfile.subscribe` callback renders the saved
chart in place of the live one and ignores further profile pushes; "Use my chart" clears
the saved state and re-renders from the live profile. The privacy line under the report
also changes, from "Your birthday details are saved in this browser." to "Showing a
saved chart. Your birth profile is unchanged."

## Independent validation

Run:

```
node --test tests/birthday-insights.test.cjs tests/birthplace-search.test.cjs tests/natal-engine.test.cjs tests/chart-depth.test.cjs
```

Ten synthetic reference charts cover 1901–2099, both hemispheres, summer/winter civil time and polar/high-latitude sites. Their reference positions and cusps were generated with Swiss Ephemeris 2.10.03 in Moshier mode, using `tools/build_natal_fixtures.py`. Swiss Ephemeris is used only as an independent local test tool, and its binaries/source are not shipped. The version is also recorded in `tests/fixtures/natal-reference.json`.

Each fixture checks resolved UTC, house system, all ten planetary longitudes and motion, Ascendant/MC, and twelve cusps. Tolerances are 0.03° for planets and 0.01° for angles/cusps. Additional tests cover impossible and repeated civil times, missing/invalid inputs, whole-sign/equal cusp conventions, wraparound house assignment and aspect orbs. City and existing Chinese-calendar/Lo Shu regression checks run alongside these tests.

`tests/chart-depth.test.cjs` covers profections (house and sign at each age, wraparound at Pisces, the time lord for all twelve signs, a target date either side of a birthday), the Part of Fortune (both formulas checked exactly against hand-computed values, the day/night reflection property, and the wiring check against the fixtures above), sect (a Whole Sign chart — London, 24 July 1990, 05:30 — whose Sun has just risen but lies in house 1, checked as a day chart and against the same chart in Placidus), the four minor aspects (found at their exact angle and at the 2° edge, not beyond it, and unaffected by the orb scale) and all five patterns against hand-built charts. It also checks, against every one of the ten fixture charts, that minor aspects never leak into `chart.aspects`, and on one fixture chart that the minors are carried separately in `chart.minorAspects`. That the five-aspect output itself is unchanged was checked once during development, against a baseline of the ten fixture charts at all three orb scales captured before the change. `tests/natal-engine.test.cjs` is unchanged and still passes. The full suite, `node --test tests/*.test.cjs`, is 480 tests passing at the time of writing.

Manual browser QA covers desktop and 390px layouts, keyboard/touch city selection, custom locations, changing house systems, DST occurrence selection, chart zoom/fit, planet/house/aspect inspection, table overflow, and preservation of the tarot reading controls.

The "Print or save as PDF" buttons print a keepsake edition instead of the page: `NatalChart.keepsake()` renders five print-only pages (cover with wheel and big three, placements, houses with the method notes, aspect grid with balance and aspect list, reflection prompts with writing lines), appended to `<body>` only while the print dialog is open (`html.nk-printing` hides everything else; `afterprint` removes it and restores the document title, which is set to the chart date so it becomes the default PDF file name). The keepsake panel below the report offers an ink-light Ivory wheel or the Midnight wheel for print and SVG download; the Ivory rules sit in every wheel's own `<style>`, scoped to `.natal-wheel.ivory` because an inline SVG's styles apply to the whole page. It is laid out to fit five pages on both Letter and A4 including minor aspects on the densest reference chart; `tests/natal-keepsake.test.cjs` covers the page count, escaping and aspect counts. A browser Ctrl+P still prints the page itself, with all four detail sections. SVG exports include their own styling and can be enlarged without raster pixelation. The display uses user-agent fonts for zodiac/planet symbols.

See [docs/JYOTISH.md](JYOTISH.md) for a sidereal (Vedic) reading of this same calculated chart: the Lahiri-shifted Lagna and grahas, nakshatras, Vimshottari dashas and the navamsa chart.
