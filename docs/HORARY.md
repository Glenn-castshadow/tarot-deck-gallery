# Horary astrology (historical practice)

## Framing

Horary reads a chart cast for the exact moment a question was put, the way William Lilly's
*Christian Astrology* (London, 1647) set out the method: an astrologer tested the chart's
fitness to be judged at all, weighed its significators' essential and accidental dignity, and
looked for one of a fixed set of ways the matter was said to "perfect." This section presents
that seventeenth-century method as history, not as a reading of the visitor's actual question.
Every tab carries the banner "Horary astrology as William Lilly practised it in 1647. This
section shows how such a chart was read; it does not read your future," and the significators
tab closes with the same reminder: what is shown is "a record of how Lilly's method read a
particular figure," left for the querent to weigh against the question that is actually
theirs. No output states a yes/no answer, and the copy is checked (`tests/horary-text.test.cjs`)
to contain none of "you will," "will happen," "is going to," "the answer is," a bare "yes" or
"no," "luck," or "fortune."

The question text itself lives in page memory only (`horary.js`'s closure state); nothing new
is stored or sent anywhere.

## Included

- **The question** (tab 1) — an optional question (240-character textarea, page-only), a house
  of the matter (12-entry select), date/time (default now) and place (city search pre-filled
  with the saved birthplace, or a manual-coordinates fallback), and "Cast the chart." Output: a
  single-ring wheel (`horary-chart.js`), Lilly's considerations before judgment, and the
  moment's sect and planetary hour.
- **Significators** (tab 2) — querent, quesited and the Moon, each as a card with sign/degree/
  house, essential dignity in Lilly's words plus his point tally, accidental dignity in words
  plus its tally, receptions between querent and quesited, the aspects between all three pairs
  (pairwise, skipping any pair that shares a single significator) with applying/separating
  state and the perfection instant when one is found, a perfection summary (by aspect, by
  reception, translation, collection, or none), and the Moon's condition.
- **Planetary hours** (tab 3) — the day's 24 hours (12 day, 12 night) for the chart's date and
  place, rulers, local clock start/end times, and the hour containing the cast moment marked.
- **Elect a moment** (tab 4) — the same date/time/place controls (sharing the question tab's
  chosen place), showing sect, planetary hour, the Moon's condition and a seven-row table of
  the classical planets' dignity and condition for the chosen instant, with Lilly's electional
  note. No recommendation is produced; this view exists only because it costs almost nothing
  once the horary core exists and can be dropped without touching horary itself.

A "Method & conventions" `<details>` disclosure repeats on every tab: Regiomontanus houses,
Lilly's tables and orbs, Ptolemaic aspects only, void-of-course by Lilly's definition,
planetary hours from local sunrise, and the historical framing.

The section's own stylesheet is `horary.css`; it re-declares element rules under its own
`.horary`/`.ho-*` classes (e.g. `.horary .cx-table-wrap tr[aria-current]`) rather than editing
the shared rules it borrows — `.cx-table-wrap`, `.cx-missing` and `.cx-error` come from
`celestial-extras.css`, `.acg-eyebrow`/`.acg-small-label` from `astrocartography.css`, and the
place-picker's `.birthplace-field`/`.city-input-wrap`/`.city-suggestions`/
`.city-search-status` from `celestial-room.css` (the same lesson recorded for `chart-in-time.js`
in `docs/CHART-IN-TIME.md`: the section loses styling if any of those shared rules is removed
or renamed elsewhere).

## Lilly's tables

All tables are transcribed from *Christian Astrology*, Book I (1647), with Ptolemy's terms as
Lilly himself printed them; they are public-domain historical data, cited rather than treated
as original copy (original copy is the prose in `horary-text.js` that explains them).

- **The seven classical planets only** — Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn.
  Outer planets and the lunar nodes take no part in dignity, significators or perfection; the
  nodes are drawn on the wheel only, because horary predates their discovery.
- **Rulership** by sign, **detriment** its opposite; **exaltation** (Sun Aries 19°, Moon Taurus
  3°, Mercury Virgo 15°, Venus Pisces 27°, Mars Capricorn 28°, Jupiter Cancer 15°, Saturn Libra
  21°) and **fall** its opposite.
- **Triplicity** (Fire: Sun by day / Jupiter by night; Earth: Venus / Moon; Air: Saturn /
  Mercury; Water: Mars both) — a single ruler for Water because Lilly gives Mars both sect
  rulers there.
- **Terms** (Ptolemy's, per Lilly) — five planets per sign, each ending at a listed degree; a
  structural test (`tests/classical.test.cjs`) checks every sign's five end-degrees are
  increasing and the last is exactly 30.
- **Faces (decans)** — 36 of them, Chaldean order (Mars, Sun, Venus, Mercury, Moon, Saturn,
  Jupiter) starting from Mars at Aries 0°, cycling every seven decans.
- **Orbs and moieties** — Sun 15°, Moon 12°, Saturn 9°, Jupiter 9°, Mars 7°, Venus 7°, Mercury
  7°; a pair's moiety is the average of their two orbs.
- **The twelve house matters** — Lilly's list (1 the querent; 2 money and movables; 3 siblings,
  short journeys, letters; 4 father, home, land, lost things; 5 children, pleasure, messengers;
  6 sickness, servants, small animals; 7 marriage, open enemies, the person asked about; 8
  death, the partner's estate, wills; 9 long journeys, learning, religion; 10 honour,
  profession, the mother; 11 friends and hopes; 12 confinement, secret enemies, large animals).
- **Lilly's point tables**, shown labelled as his historical device rather than a hidden score:
  essential dignity +5/+4/+3/+2/+1 for ruler/exaltation/triplicity/term/face, −5 detriment, −4
  fall, −5 peregrine; accidental dignity by house (1,10 +5; 7,4,11 +4; 2,5 +3; 9 +2; 3 +1; 12
  −5; 8,6 −2), direct +4 / retrograde −5 (not scored for the Sun or Moon), cazimi +5, combust
  −5, under the beams −4, free of the beams +5, Moon increasing +2 / decreasing −2. The via
  combusta is noted in the Moon's condition but is not scored.

## Conventions

**Regiomontanus houses.** `NatalEngine.houseCusps(angles, latitude, 'regiomontanus')` divides
the equator into 30° arcs of right ascension from the RAMC; for each arc D the house pole
satisfies `tan φ_H = tan φ · sin D`, and the cusp longitude is
`λ = atan2(sin(RAMC + D), cos(RAMC + D)·cos ε − tan φ_H·sin ε)` for D = 30°, 60°, 120°, 150°,
giving cusps 11, 12, 2, 3 (5, 6, 8, 9 are their opposites; 1, 4, 7, 10 are the angles). **The
design spec describes this as undefined within the polar circles, falling back to whole-sign
there — the shipped code does not do that.** `natal-engine.js`'s Regiomontanus branch and its
own comment record the corrected ruling (commit `0ab8781`, "regiomontanus is defined inside the
polar circles"): only the true pole itself (`|latitude| >= 90`) is a hard singularity, because
`tan φ` diverges there; every other latitude, including inside the polar circles, yields a
full, 360°-spanning set of cusps. `tests/natal-engine.test.cjs` checks this directly — cusps
are still defined and properly ordered at 88°N, `null` only at exactly 90° — and the
pyswisseph-derived `polar-85` fixture case (85°N, added specifically to exercise this ruling,
alongside the ten ordinary natal reference cases) is asserted never to fall back to whole-sign.
Regiomontanus is now available wherever `NatalEngine.calculate`/`chartAtInstant` accept a house
system, but the **natal chart's own house-system default is unchanged (Placidus)** — Horary is
the only feature that selects Regiomontanus, and it always does, since Lilly used it.

**Sect.** A day chart has the Sun in houses 7–12 by the chart's own cusps; otherwise night.
Sect governs which triplicity ruler applies and which dignities apply to the significators.

**Orbs and moieties in practice.** `HoraryEngine.applyingAspect` finds the nearest of the five
Ptolemaic aspects (0°/60°/90°/120°/180°) to a pair's separation; the aspect is only reported
(non-`null`) when its orb is within the pair's combined moiety, but `applying`/`separating` is
reported regardless of orb, from a one-hour extrapolation of each point's own longitudinal
speed.

**Void of course**, by Lilly's definition: the Moon applies to none of the five Ptolemaic
aspects with any of the other six classical planets before it leaves its present sign. The
engine searches the interval from the chart moment to the sign boundary (or a 3.5-day cap)
using Astronomy Engine's `Search`, bracketed every six hours across both chiralities of each
aspect (leading and trailing, since `Search` only finds ascending zero-crossings), and reports
the earliest hit as `nextAspect`; no hit before the sign boundary means void of course.
`tests/classical.test.cjs` cross-checks this against an independent 10-minute brute-force scan
for three dates.

**Planetary hours run sunrise to sunrise.** Sunrise/sunset come from Astronomy Engine's
`SearchRiseSet('Sun', …)`. Day hours are `(sunset − sunrise)/12` from sunrise; night hours are
`(nextSunrise − sunset)/12` from sunset. The planetary day's ruler is read from the weekday of
sunrise itself (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn for Sunday…Saturday) — so a
moment before that day's sunrise still belongs to the *previous* weekday's ruler, which
`tests/classical.test.cjs` checks explicitly (04:00 the morning after a Wednesday is still
Mercury's day; the corresponding row after 09:00 sunrise is Jupiter's). The 24 hours within a
day cycle the Chaldean order (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon) starting from
the day ruler. Where the Sun does not rise and set (polar day/night, or an unreasonable
20+ hour gap between the bracketing rises), the table reports `status: 'unavailable'` rather
than inventing hours.

**Lilly's tally is a historical device, not a hidden score.** Every essential- and
accidental-dignity display shows the plain-language words (`"in its own sign"`, `"combust"`,
etc.) beside the signed point total, and `horary-text.js`'s copy carries the reading — the
number is there because Lilly kept one, not as a computed verdict.

**Perfection takes the earliest crossing across both aspect directions, within 30 days.**
`HoraryEngine.perfects` searches for the instant an applying aspect becomes exact. Because
Astronomy Engine's `Search` only finds ascending zero-crossings, a non-conjunction/opposition
aspect is searched in both chiralities (the target angle and its negation), which also covers
retrograde pairs where the "wrong-way" crossing can otherwise arrive first. **This is a
correction, not the original plan**: commit `9b1d911` ("perfection takes the earliest crossing
across both aspect directions") replaced an earlier version that returned as soon as either
chirality found a hit — wrong whenever the *other* chirality's crossing lands first, which
happens routinely for fast movers like the Moon. `tests/horary.test.cjs` pins a regression
case (Moon square Mercury cast 2024-01-01T20:00Z, London): the true nearest exact square is
2024-01-02T08:53Z, but returning on the first chirality found instead finds a crossing two
weeks later, on 2024-01-16, and gets `beforeSignChange` wrong too. The same test also checks
every applying, perfecting significator pair from the 2024-03-15 cast against an independent,
much finer-grained (2-hour-step) brute-force scan, to within 20 minutes.

**Significators.** Querent = ruler of the Ascendant sign; co-significator the Moon always.
Quesited = ruler of the chosen house's cusp sign. When querent and quesited would share one
ruler, the section says so and substitutes the exaltation ruler of the quesited cusp's sign as
Lilly allowed — and when that sign has no exaltation ruler either, it falls back to the shared
ruler with `shared: true` recorded, rather than leaving the quesited significator undefined.

**Considerations before judgment** (Lilly Book I ch. 26) are reported present/absent with his
stated meaning, plus the note that he himself judged charts despite them: Ascendant in the
first 3° (too early) or last 3° (past 27°, too late) of its sign; Saturn in the 1st or 7th;
Moon void of course; Moon in the via combusta (15° Libra–15° Scorpio); the planetary hour
ruler agreeing with the Ascendant's own ruler or its triplicity ruler (radicality).

**The output never gives a verdict.** Perfection is reported as found or wanting, with the
supporting evidence (the aspect, the reception, the translating or collecting planet), and the
significators tab always closes with Lilly's-method-not-your-answer language.

## Validation

Independent fixtures come from `tools/build_horary_fixtures.py` (a throwaway pyswisseph
virtual environment; Swiss Ephemeris 2.10.03 in Moshier mode; neither its source nor binaries
ship) into `tests/fixtures/horary-reference.json`, which is shared with `natal-engine.test.cjs`
and `classical.test.cjs`:

- **Regiomontanus cusps** for the ten natal reference cases used across this project, plus an
  eleventh, `polar-85` (85°N), added specifically to exercise the polar-circle ruling above —
  checked against `swe.houses_ex(jd, lat, lon, b'R')` to within **0.01°**, and asserted to
  report `houseSystem: 'regiomontanus'` (never a whole-sign fallback) on every case including
  the polar one.
- **Sunrise/sunset/next-sunrise** (`swe.rise_trans`) for three places (London, New York,
  Adelaide) × three dates (2000-01-01, 2024-06-21, 2024-12-21), checked to within **2
  minutes**. The fixture's `date` field is the UTC seed date the Python tool started its search
  from, not necessarily the local calendar date of the resulting sunrise: for Adelaide (UTC+9:30
  or +10:30), the `date: "2000-01-01"` row's sunrise instant, `2000-01-01T19:35:08Z`, converts
  to the *next* local day. The tests key entirely on the returned instant, never on that `date`
  label, so this is a labelling fact to know when reading the fixture, not a bug.
- **Dignities of every planet in every case**, recomputed in Python directly from the same
  rulership/exaltation/triplicity/term/face tables `classical-engine.js` uses (a transcription
  check against the tables, not an independent ephemeris check, since the tables themselves
  have no external reference implementation to check against) — every boolean field
  (`ruler`, `detriment`, `exaltation`, `fall`, `triplicity`, `term`, `face`, `peregrine`) must
  agree.
- Structural table checks: terms sum to 30 per sign; the 36 faces cycle; every sign has exactly
  one ruler whose detriment is the opposite sign; exaltation/fall stand opposite each other.
- Planetary-hour checks: 24 hours span sunrise to the next sunrise exactly; the Chaldean
  ruler sequence is correct for all 24; the planetary day begins at sunrise, not midnight.
- **Void of course**: checked against a brute-force **10-minute** sampling scan, for three
  dates.
- Combustion-threshold boundaries (cazimi/combust/under-the-beams/free), considerations toggles
  on synthetic charts, and perfection/translation/collection detection on synthetic
  significator pairs (see the Conventions section above for the perfection regression case).
- Copy constraints (`tests/horary-text.test.cjs`): every dignity/consideration/perfection/
  planet entry present and within a sane length band, dignity-text openings not overly
  repetitive, and none of the banned outcome-oriented words anywhere in the module.
- Wheel structure (`tests/horary-chart.test.cjs`): 12 cusp groups and 9 planet groups (the
  seven classical planets plus the two nodes, never the outer three), ASC/MC placement and
  labelling, escaped/ascendant-describing `aria-label`, and the crowded-planet collision
  layout (adjacent, wraparound and three-way stellium cases each land on distinct radii).

Run the whole suite with:

```
node --test tests/*.test.cjs
```

which is **301 tests passing** at the time of writing (0 failing). The Horary-specific and
Horary-touched files break down as: `tests/classical.test.cjs` 26, `tests/horary.test.cjs` 3,
`tests/horary-text.test.cjs` 2, `tests/horary-chart.test.cjs` 8, and `tests/natal-engine.test.cjs`
31 (12 of those are new: one hand-derived Regiomontanus check plus the 11 Swiss-fixture cases
above). As with the rest of this project's Node suite, `node --test tests/` alone fails with
`MODULE_NOT_FOUND` on Node 24 — the glob must be expanded by the shell.

### Browser checks

Verified by DOM inspection against a local static server (`ishtar-static`,
`python -m http.server`) rather than by screenshot, since Browser-pane screenshots render
blank in this environment:

- Cast the chart with its defaults (now, London, house 7) from the question tab; the status
  line confirmed the chart was cast for London and the wheel, hour line, house-matter heading
  and six considerations all rendered.
- All four tabs (The question, Significators, Planetary hours, Elect a moment) switched
  correctly, each showing its own panel and hiding the others (`hidden` toggling as expected),
  with `aria-pressed` following the active tab.
- The question-tab wheel carried exactly 12 `data-cusp` groups and 9 `data-planet` groups
  (the seven classical planets plus the two lunar nodes).
- The Significators tab rendered exactly 3 significator cards (querent, quesited, Moon).
- The Planetary hours tab rendered a 24-row table with exactly one row carrying
  `aria-current="true"`.
- The Elect-a-moment tab, after electing the same default moment, rendered its own wheel and a
  7-row dignity table (the seven classical planets).
- At a 375×812 (mobile/390px-class) viewport, `document.documentElement.scrollWidth` matched
  `clientWidth` exactly — no horizontal overflow — and the neighbouring `#jyotish` and
  `#chart-in-time` sections remained present and unhidden.
- Console and network checks showed only two `/api/account/` 404s (expected: the static file
  server used for this check has no accounts backend running, exactly as recorded for the same
  check in `docs/JYOTISH.md`) and no errors from any horary asset; all six new files
  (`horary.css`, `classical-engine.js`, `horary-engine.js`, `horary-text.js`, `horary-chart.js`,
  `horary.js`) and the three rekeyed files (`natal-engine.js?v=horary-1`, `app.js?v=horary-1`,
  `mobile-sections.js?v=horary-1`) returned 200.

The mobile fold's subtitle text is "Lilly's method · historical practice" (`mobile-sections.js`)
rather than the design spec's literal "Horary · historical practice" — the fold's title is
"Horary" and the subtitle carries the second half of that phrase; the effect on screen is the
same two-part label the spec called for.

See [docs/NATAL-CHART.md](NATAL-CHART.md) for the Placidus/Whole-Sign/Equal house systems and
the tropical calculation Horary's chart is built from, and for the Regiomontanus addition
itself.

## Out of scope

Refranation, prohibition and frustration; antiscia; fixed stars; Arabic parts — the design spec
allowed drawing the Part of Fortune in the wheel "if cheap," but the shipped code does not
compute or draw it at all, so it is fully out of scope rather than shown-but-unanalysed; any
consideration or stricture beyond Lilly's list in Book I ch. 26; any modern horary school's
rules; and any statement about what will actually happen.
