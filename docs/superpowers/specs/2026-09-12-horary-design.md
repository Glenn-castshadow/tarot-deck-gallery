# Horary astrology as historical practice

Date: 2026-09-12. Branch: horary. Author: Claude, working unattended on Glenn's instruction
"do the horary one as historical practice, run it unattended" (2026-09-12). This is astrology
sub-project C from the 2026-09-09 decomposition. Glenn's framing decision: horary is presented
as the historical method of William Lilly's *Christian Astrology* (1647), shown as how such a
chart was judged, never as a judgment of the reader's question. Every convention below is
attributed.

## Goal

A Horary section that casts a chart for the moment a question is asked, at the querent's
place, with Regiomontanus houses, and walks through Lilly's method: the considerations before
judgment, the significators and their essential and accidental dignities, the Moon's
condition, and the ways a matter was said to perfect (aspect, reception, translation,
collection). A planetary-hours table and a lightweight "Elect a moment" view share the same
classical core (mine: electional is included only as this thin view because it costs almost
nothing once the core exists; it can be dropped without touching horary).

| Constraint | Source |
|---|---|
| Historical framing: every reading is "how Lilly's method read this", the section header says so, no statement about the reader's actual outcome | Glenn, 2026-09-12 |
| Original prose; Lilly's tables (dignities, terms, faces, house matters, considerations, orbs) are public-domain data and are cited to *Christian Astrology* | Codebase convention |
| Ephemeris, angles and civil time from `NatalEngine`; new house system added there additively | Codebase structure |
| Independent fixtures from pyswisseph (Regiomontanus cusps `b'R'`, sunrise/sunset via `rise_trans`) in a throwaway venv | Codebase convention |
| The question text stays in page memory only; nothing new is stored or sent | Codebase convention |
| Cache keys: new files `?v=1`; `natal-engine.js?v=horary-1`, `app.js?v=horary-1`, `mobile-sections.js?v=horary-1` | Codebase convention |
| Section CSS re-declares element rules under `.horary` | docs/CHART-IN-TIME.md lesson |
| Open-source only; no new runtime dependency | Glenn's global rule |

## Part A: `NatalEngine` gains Regiomontanus houses

Lilly used Regiomontanus. `houseCusps(angles, latitude, 'regiomontanus')`: for equatorial arcs
D = 30°, 60°, 120°, 150° from the RAMC, the house pole is `tan φ_H = tan φ · sin D` and the cusp
is `λ = atan2(sin(RAMC + D), cos(RAMC + D)·cos ε − tan φ_H·sin ε)`, giving cusps 11, 12, 2, 3;
cusps 5, 6, 8, 9 are their opposites; 1, 4, 7, 10 are the angles. Undefined within the polar
circles (`|φ| ≥ 90° − ε`) → `null`, and `chartAtInstant` falls back to whole-sign with the
existing notice. `calculate`/`chartAtInstant` accept `'regiomontanus'`; the birth form's house
select is not changed (natal charts stay Placidus by default). Validation: pyswisseph
`houses_ex(jd, lat, lon, b'R')` on the ten natal reference cases within 0.01°.

## Part B: the classical core (`classical-engine.js`)

All tables per Lilly, *Christian Astrology* Book I (1647), with Ptolemy's terms as Lilly prints
them.

- **Planets:** the seven classical: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn. Outer
  planets and nodes are not used (nodes shown in the wheel only).
- **Rulership** by sign; **detriment** opposite. **Exaltation**: Sun Aries 19°, Moon Taurus 3°,
  Mercury Virgo 15°, Venus Pisces 27°, Mars Capricorn 28°, Jupiter Cancer 15°, Saturn Libra 21°;
  **fall** opposite. **Triplicity** (Lilly's table): Fire Sun by day, Jupiter by night; Earth
  Venus / Moon; Air Saturn / Mercury; Water Mars both. **Terms** (Ptolemy per Lilly), five per
  sign ending at the listed degrees; the plan carries the table and a test checks every sign
  sums to 30. **Faces**: 36 decans in Chaldean order from Mars at Aries 0°.
- **Essential dignity** of a planet at a longitude by sect: ruler, exaltation, triplicity,
  term, face; debilities detriment, fall; **peregrine** when it has none. **Lilly's tally**
  (+5 +4 +3 +2 +1, −5 −4, peregrine −5) is shown labelled as his point table, a historical
  device, with the words carrying the reading.
- **Accidental conditions:** house placement class (angular 1/10, 7/4; succedent; cadent) with
  Lilly's points (1,10 +5; 7,4,11 +4; 2,5 +3; 9 +2; 3 +1; 12 −5; 8,6 −2); direct +4 / retrograde
  −5 (not Sun, Moon); **combust** within 8°30′ of the Sun −5; **under the beams** within 17° −4;
  **cazimi** within 0°17′ +5; free of the Sun's beams +5; Moon increasing in light +2 /
  decreasing −2; **via combusta** (15° Libra to 15° Scorpio) for the Moon, noted not scored.
- **Sect:** a day chart when the Sun is above the horizon (Sun in houses 7–12 by the chart's
  cusps).
- **Planetary hours:** sunrise and sunset from Astronomy Engine `SearchRiseSet('Sun', …)`;
  day hours = (sunset − sunrise)/12 from sunrise; night hours = (next sunrise − sunset)/12; the
  planetary day begins at sunrise and takes the weekday ruler (Sun, Moon, Mars, Mercury,
  Jupiter, Venus, Saturn for Sunday…Saturday); hours follow the Chaldean order Saturn,
  Jupiter, Mars, Sun, Venus, Mercury, Moon from the day ruler. Where the Sun does not rise or
  set (polar day/night) the table reports unavailable.
- **Moon's condition:** **void of course** by Lilly's definition — the Moon applies to no
  Ptolemaic aspect (0°, 60°, 90°, 120°, 180°) with any of the six other classical planets
  before leaving its sign, found by searching the interval to the sign boundary with Astronomy
  Engine `Search` (bracketing every 6 hours); the **next aspect** (planet, aspect, instant) when
  one exists; via combusta; increasing or decreasing light.
- **Reception:** planet A receives B when B sits in a sign A rules or where A is exalted;
  mutual reception when both.

## Part C: horary (`horary-engine.js`)

- `cast({date, location, houseMatter})` → `NatalEngine.chartAtInstant(date, location,
  {houseSystem:'regiomontanus'})` plus the classical analysis.
- **Considerations before judgment** (Lilly Book I ch. 26, as data with historical wording):
  Ascendant in the first 3° (too early) or last 3° (too late) of its sign; Saturn in the 1st or
  7th; Moon void of course; Moon in the via combusta; the planetary hour ruler agreeing with
  the Ascendant's ruler or triplicity ruler (radicality). Each is reported present/absent with
  Lilly's stated meaning and the note that he himself judged charts despite them.
- **Significators:** querent = ruler of the Ascendant sign, co-significator the Moon; quesited
  = ruler of the cusp sign of the chosen house. The twelve house matters follow Lilly's list
  (1 the querent; 2 money and movables; 3 siblings, short journeys, letters; 4 father, home,
  land, lost things; 5 children, pleasure, messengers; 6 sickness, servants, small animals;
  7 marriage and partners, open enemies, the person asked about; 8 death, the partner's
  estate, wills; 9 long journeys, learning, religion; 10 honour, profession, the mother;
  11 friends and hopes; 12 confinement, secret enemies, large animals). When querent and
  quesited share a ruler the section says so and uses the exaltation ruler of the quesited
  cusp as Lilly allowed.
- **Perfection**, in Lilly's terms, each reported as found or not with the evidence: an
  applying Ptolemaic aspect between the significators within the combined moieties of their
  orbs (Sun 15°, Moon 12°, Saturn 9°, Jupiter 9°, Mars 7°, Venus 7°, Mercury 7°; moiety =
  half), and whether it perfects before either changes sign (searched); mutual reception;
  translation of light (a third planet separating from one significator and applying to the
  other within orb); collection of light (both significators applying to a slower third
  planet). Refranation and prohibition are named in the glossary as out of scope.
- The output never says the answer is yes or no. It says: "In Lilly's method this chart shows
  … / lacks …" and closes with the reflection that the reader's question is theirs to weigh.

## Part D: UI (`horary.js`, `horary.css`, `horary-chart.js`)

Section `#horary` after `#jyotish`; nav link "Horary"; mobile fold "Horary · historical
practice". Header banner: "Horary astrology as William Lilly practised it in 1647. This section
shows how such a chart was read; it does not read your future." Tabs:

1. **The question** — controls: optional question text (page-only, 240 chars), date and time
   (default now, local to the chosen place), place (city search pre-filled with the saved
   birthplace when available, coordinates fallback, like chart-in-time), house matter select
   (12 entries), "Cast the chart". Output: a single-ring wheel (`horary-chart.js`: sign ring,
   Regiomontanus cusps, the seven planets plus nodes as glyphs, ASC/MC marked), the
   considerations list, and the sect and planetary hour of the moment.
2. **Significators** — querent, Moon, quesited: each with sign, degree, house, essential
   dignities in words, accidental conditions in words, Lilly's tally; receptions; the aspects
   between them with applying/separating and the perfection instant when found; translation
   and collection findings; the Moon's next aspect or void statement.
3. **Planetary hours** — the day's 24 hours for the chart's date and place with rulers and
   local clock times, the chart's hour marked; sunrise/sunset shown.
4. **Elect a moment** — the same date/time/place controls; shows sect, planetary hour, Moon
   condition and the seven planets' dignities for the chosen instant, with the historical note
   on what electional astrologers looked for. No recommendation is produced.

A conventions disclosure on every tab: Regiomontanus houses; Lilly's tables and orbs;
Ptolemaic aspects only; void-of-course by Lilly's definition; planetary hours from local
sunrise; historical presentation.

## Engine APIs

- `NatalEngine.houseCusps(angles, latitude, 'regiomontanus')`.
- `ClassicalEngine`: `tables` (rulers, exaltations, triplicities, terms, faces, orbs, houseMatters),
  `dignities(planet, longitude, sect)` → `{ruler, exaltation, triplicity, term, face, detriment,
  fall, peregrine, score, words:[…]}`, `accidental(point, chart, sect)` → `{house, houseClass,
  motion, solar:'combust'|'underBeams'|'cazimi'|'free'|null, viaCombusta, score, words}`,
  `sect(chart)` → `'day'|'night'`, `planetaryHours(date, location)` → `{status, sunrise, sunset,
  nextSunrise, dayRuler, hours:[{index, start, end, ruler, isDay}], current}`,
  `moonCondition(chart)` → `{voidOfCourse, nextAspect:{planet, aspect, date}|null, signExit,
  viaCombusta, increasing}`, `reception(a, b, chart)`.
- `HoraryEngine`: `cast({date, location, houseMatter})` → `{status, chart, sect, hour,
  considerations:[{key, present, text}], significators:{querent, moon, quesited}, receptions,
  aspects, perfection:{byAspect, byReception, translation, collection}, moon}`.

## Tests

- pyswisseph fixtures (`tools/build_horary_fixtures.py` → `tests/fixtures/horary-reference.json`):
  Regiomontanus cusps for the ten natal cases (0.01°); sunrise/sunset (`swe.rise_trans`) for
  three places × three dates within 2 minutes; dignities of every planet in each case computed
  in Python from the same tables (transcription check).
- Structural: terms sum to 30 per sign; 36 faces cycle; every sign has exactly one ruler and
  its detriment is the opposite; exaltation/fall opposition; planetary hours cover sunrise to
  next sunrise exactly; hour ruler sequence; VOC checked against a brute-force 10-minute
  sampling in the test for two dates; combustion thresholds at the boundaries; considerations
  toggles on synthetic charts; perfection detection on synthetic significator pairs.
- Copy constraints on the text module (voice: historical, no "you will", no outcome words
  aimed at the reader).
- Browser checks by DOM (pane screenshots blank).

## Documentation

`docs/HORARY.md`; cross-links from `docs/NATAL-CHART.md`; `docs/deployment.md` pending note.

## Out of scope

Refranation, prohibition, frustration, antiscia, fixed stars, Arabic parts (Fortuna is drawn
in the wheel only if cheap; not analysed), strictures beyond Lilly's list, any modern horary
school's rules, and any statement about what will happen.
