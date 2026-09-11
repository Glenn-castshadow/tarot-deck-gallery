# Calculated natal charts

The celestial atlas calculates a tropical natal chart from a Gregorian date, recorded local clock time, geographical coordinates and an IANA time zone. Calculations and city searches run in the browser; no birth details are sent to a chart API.

## Included

- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune and Pluto, with sign, degrees/minutes, house and apparent direction of motion.
- Mean north/south lunar nodes; Ascendant, Descendant, Midheaven and Imum Coeli.
- Placidus (default), Whole Sign and Equal houses. If Placidus is undefined at a polar latitude/time, the calculated result explicitly switches to Whole Sign and displays a notice.
- Five major ecliptic aspects: conjunction, sextile, square, trine and opposition. Standard maximum orbs are 8°, 4°, 6°, 6° and 8° respectively. Tighter/wider settings multiply these by 0.75/1.25. Contacts to ASC/MC are included; redundant axis-to-axis and north-to-south-node contacts are excluded.
- Zoomable vector chart (100–300%), selectable planets and houses, an accessible detail selector, aspect filtering/highlighting, placement and cusp tables, element/quality counts, SVG download and print styling for the report.
- Original reflection text for planet/sign/house combinations, houses and aspects. Interpretations describe astrological symbolism; they are not predictions or diagnostic personality claims.

## Astronomical conventions

[Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy/tree/v2.1.19) is vendored under its MIT license. `GeoVector(body, date, true)` and `Ecliptic(vector)` give geocentric apparent planetary longitudes referred to the true ecliptic of date. The observer location affects the angles and houses, not these geocentric longitudes. The apparent motion flag uses a centred one-day finite difference; “near station” means absolute motion below 0.005°/day.

The mean lunar node uses the secular longitude polynomial around J2000. These are mean nodes, not osculating/true nodes or physical planets. Asteroids such as Chiron are not part of this release's calculations.

Apparent local sidereal time and true obliquity determine the Ascendant and meridian. Placidus cusps are solved by bisection of the ecliptic point's semi-diurnal/semi-nocturnal arc fractions; this implementation does not copy Swiss Ephemeris source. [Astrodienst's technical documentation](https://www.astro.com/swisseph/swisseph.htm) describes the house definitions. In Whole Sign and Equal systems, MC is still calculated independently and need not begin house 10.

Aspect separation uses the shorter arc of ecliptic longitude. Applying/separating compares the current orb with an extrapolation one hour ahead using local angular speeds; it is an estimate near the birth moment. It is not assigned to contacts with chart angles. Balance gives each of the ten planets one count, excluding nodes and angles. No weighted strength or fortune score is claimed.

Calculations support 1901–2100. The display rounds down to arcminutes. Uncertain birth records, historical civil-time rules and approximate city coordinates can matter more than the numerical precision of the engine. The model makes its time zone, resolved UTC and actual house system visible in the report.

## Civil time and location

`Intl.DateTimeFormat` supplies the browser's historical IANA rules. The resolver considers offsets around the entered date and validates each candidate by converting it back to the exact entered local date/time. A skipped spring-forward time produces an explicit error; a repeated fall-back time requires the earlier/later occurrence. This choice is saved. A date alone still opens the symbolic birthday, Chinese zodiac and number views; houses and a rising sign are not invented without a usable birth time/location.

[GeoNames city data](../assets/cities/README.md) supplies coordinates and a time-zone ID. The city picker supports keyboard and touch selection, aliases and accent-insensitive search. Unlisted locations can use custom latitude, longitude and an IANA zone. Editing a selected city discards its old coordinates. Legacy stored entries with a city plus region/country are resolved automatically only if there is one exact city-name match; ambiguous names require selection.

The existing `arcana-birthday-profile-v1` localStorage record gains optional `placeLocation`, `houseSystem`, `orbScale` and `fold` fields. Old profiles remain readable.

## Independent validation

Run:

```
node --test tests/birthday-insights.test.cjs tests/birthplace-search.test.cjs tests/natal-engine.test.cjs
```

Ten synthetic reference charts cover 1901–2099, both hemispheres, summer/winter civil time and polar/high-latitude sites. Their reference positions and cusps were generated with Swiss Ephemeris 2.10.03 in Moshier mode, using `tools/build_natal_fixtures.py`. Swiss Ephemeris is used only as an independent local test tool, and its binaries/source are not shipped. The version is also recorded in `tests/fixtures/natal-reference.json`.

Each fixture checks resolved UTC, house system, all ten planetary longitudes and motion, Ascendant/MC, and twelve cusps. Tolerances are 0.03° for planets and 0.01° for angles/cusps. Additional tests cover impossible and repeated civil times, missing/invalid inputs, whole-sign/equal cusp conventions, wraparound house assignment and aspect orbs. City and existing Chinese-calendar/Lo Shu regression checks run alongside these tests.

Manual browser QA covers desktop and 390px layouts, keyboard/touch city selection, custom locations, changing house systems, DST occurrence selection, chart zoom/fit, planet/house/aspect inspection, table overflow, and preservation of the tarot reading controls.

The printed report contains all four detail sections. SVG exports include their own styling and can be enlarged without raster pixelation. The display uses user-agent fonts for zodiac/planet symbols.

See [docs/JYOTISH.md](JYOTISH.md) for a sidereal (Vedic) reading of this same calculated chart: the Lahiri-shifted Lagna and grahas, nakshatras, Vimshottari dashas and the navamsa chart.
