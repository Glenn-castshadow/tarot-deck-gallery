# The sky section (`/sky/`)

`/sky/` carries two sections: the daily horoscope (`docs/DAILY-HOROSCOPE.md`) and, below it,
**the sky calendar** — the Moon right now, this calendar month's exact events, the retrograde
tracker, and the reader's own transits. This file documents the sky calendar.

Everything is calculated in the browser from the vendored Astronomy Engine ephemeris. No
positions are fetched from a chart API and no birth details leave the page except on an
explicit "Save this month to my journal", which posts to the site's own readings API.

Three files:

- `sky-calendar-engine.js` — all the astronomy, no DOM and no prose.
- `sky-calendar-text.js` — all the interpretive copy, no astronomy.
- `sky-calendar.js` — the four tabs, the month grid's keyboard model, the connective labels
  that name what the engine returned, and the `transit-calendar` room registration.

The supported range is **1901–2100** (`MIN_YEAR`/`MAX_YEAR`). `moonNow`, `monthEvents`,
`retrogradeState` and `personalTransits` each refuse an out-of-range date with a status object
rather than throwing; `voidPeriods` refuses with an empty list.

## Included

**Moon now.** Phase name, illuminated fraction, sign and degree, the next sign ingress, the
next four quarter instants, and the void-of-course band measured twice — once per tradition.
The panel refreshes on the minute while the document is visible, so a tab left open does not go
on reporting an hours-old phase; while another tab is showing it is marked stale and re-renders
when reopened.

**This month.** One calendar month in the reader's own zone, as a seven-column grid (with a
roving-tabindex keyboard model: arrows move, Home/End jump, Enter opens a day) or as a list.
At ≤700px the list is the default, because a seven-column grid of event text does not fit a
phone; the reader can still switch. The month carries the Moon's four quarters, every sign
ingress of the Sun, Moon and eight planets — retrograde re-entries included — every retrograde
and direct station, and every lunar and global solar eclipse peaking inside it.

**Retrogrades.** One card per station body with its current direction, the pre-retrograde
shadow date, both station instants with their signs, and the post-retrograde shadow end.
`retrogradeState` costs roughly 100 ms of station searches (the module's own measurement), so
this tab renders on first opening rather than on page load, and the result is held for the life
of the page.

**My transits.** The exact instants in a month when a transiting body perfects a conjunction,
sextile, square, trine or opposition to a point in the reader's birth chart. A birth date alone
is enough to start (see *The approximate path*). Selecting a contact opens the reading for that
aspect. This is the only tab that is a saveable reading.

Each tab carries an "About these calculations" disclosure stating its own conventions, and all
four end with the same sentence naming the reader's resolved IANA zone (or, if the browser
reports none, the sentence without the zone in parentheses).

## Conventions

### Void of course, measured twice

A void-of-course Moon is the gap between the Moon's last exact Ptolemaic aspect to a planet and
the moment it leaves the sign it is in. Two traditions disagree about which planets count:

- **Classical (Lilly's six)** — `CLASSICAL_PLANETS`: Sun, Mercury, Venus, Mars, Jupiter,
  Saturn. The bodies visible to the naked eye.
- **Modern (adds the outer three)** — `MODERN_PLANETS`: the same six plus Uranus, Neptune and
  Pluto.

The section shows both and labels which is which. It renders them as **one band with the modern
stretch marked inside it**, not as two competing bands, because the modern period is always
contained in the classical one. That containment is a property of the definitions, not a
coincidence of any particular month:

- The modern list is the classical list **plus** three planets, so the Moon has strictly more
  chances to make a final aspect. An extra chance can only fall at the same instant as the
  classical last aspect or **later** — never earlier. `lastAspectBefore` keeps the latest hit
  it finds over the planet list it is given, so a longer list can only move the start later.
- **Both periods end at the same ingress.** `voidStateFor` is called twice over the same window
  with the same already-known exit instant, and the period end it reports is a Moon sign
  ingress, which does not depend on the planet list at all.

So the modern void begins at or after the classical one and both end together: it is the shorter
of the two and sits wholly inside the longer. `tests/sky-calendar.test.cjs` asserts exactly this
over a full year of periods — equal counts, identical `end` values, and every modern `start` at
or after its classical counterpart.

One edge the engine records rather than hides: the **first** period in any `voidPeriods` window
is bounded by the window start, not by a real ingress, so a `null` last aspect there does not
mean the transit was genuinely void. That period carries `clipped: true`.

`voidPeriods` is read twice in the product, for two different spans. The Moon tab's band comes
from `moonNow`, which runs the same core over its own window around the present moment. The
month tab's strip comes from `monthEvents`, which returns a `voids` key beside `events`.

**Why `voids` is a sibling key rather than entries in `events`.** Every member of `events` is an
instant with one `date`, and the local-day bucketing, the sort and several tests all rely on
that. A band is an interval with two ends and no single date; folding it in would have broken a
contract the rest of the section depends on. Each entry is
`{start, modernStart, end, sign, lastAspect, modernLastAspect}`.

**The month window is padded four days each side.** A band that opens late in the previous month
or closes early in the next is still this month's reader's concern. Four days exceeds the Moon's
~2.2-day sign transit, so the padded run's own `clipped` first period always closes before the
month begins and is filtered out — which is also why the filter drops `clipped` periods
explicitly rather than relying on the overlap test alone.

**The strip asks `voidBands` once for the local month**, rather than slicing three UTC months
the way the events path does: an interval has no single instant to file, and a month's bands
cost about a second of aspect searching, so the neighbours' work would be paid and then deduped
away. For the same reason `monthEvents`' `voids` is a **lazy, memoised getter** — the month view
reads three UTC months for its events and must not be charged three seconds for bands it never
looks at. The UI caches each month's bands the way it already caches each month's events, so
stepping back to a month already seen is free.

**The month tab carries a short form of the framing.** `voidFraming` has a `brief` alongside its
`body`: 358 characters against 1,078. The full passage still heads the Moon tab, where a reader
went looking for it; above a list of a dozen bands it would have to be read through before
reaching what the reader came for. The brief still stands alone for someone who never opens the
Moon tab — it says what a void is, that the two rules count different planets, and which way the
containment runs — and points at the Moon tab for the reasoning.

**Bars are drawn to length.** The month's longest band fills its row and the rest are scaled
against it, so a stacked list supports the comparison it invites. The scale is the *displayed
month* rather than a fixed number of hours, because within-month comparison is what a reader is
doing here and spans run from minutes to over two days; that means a bar changes meaning when the
reader steps months, so the scale is stated above the list instead of left to be inferred. Two
floors keep the briefest void legible — 2% in the renderer and 12px in the stylesheet — and cost
no information, since the exact duration is always in the row's own sentence.

One row per band shows the sign, both starts, the shared
end and a proportional bar with the modern stretch inside it — the same shape as the Moon tab,
since the modern void is contained in the classical one rather than competing with it. The four
day-cell marks and their legend are deliberately unchanged: a fifth mark on roughly half the
days would dilute the ones that mark a single moment.

### Stations: a sign change of the central-difference speed

Longitude speed is a 24-hour central difference in ecliptic longitude,
`speedAt(body, t) = delta(lon(body, t + 12h), lon(body, t − 12h))` degrees per day — the same
measure `natal-engine.js` uses for its retrograde flag, so the two sections can never disagree
about which way a planet is moving.

A station is the instant that speed passes through zero. `stations()` steps in one-day brackets
and, wherever the sign of `speedAt` differs at the two ends, resolves the root with
`astro.Search` to a 60-second tolerance. `astro.Search` only ever finds an *ascending* zero
crossing, so a direct→retrograde bracket is searched with the speed function negated — the same
sign-flip idiom `ingresses()` uses for backward crossings. The last bracket is clamped to the
caller's own `to`, so a window anchored to "now" can never report a station at or after its own
upper bound.

**The Sun and the Moon are excluded.** `STATION_BODIES` is Mercury, Venus, Mars, Jupiter,
Saturn, Uranus, Neptune and Pluto. Neither luminary ever retrogrades in ecliptic longitude, so
neither can station; the retrograde tracker lists eight cards and the month grid never shows a
Sun or Moon station. A test asserts the engine reports no Sun or Moon station over a six-month
window.

Shadow periods come from the same station pair. The **pre-retrograde shadow** begins when the
body first reaches the longitude it will later station direct at; the **post-retrograde shadow**
ends when it returns to the longitude it stationed retrograde at. Both searches look for a body
crossing a fixed longitude while moving direct, which is already the ascending root
`astro.Search` resolves, so neither needs the sign flip. The bracket and search widths are
per-body tables (`STATION_BRACKET_DAYS`, `SHADOW_WINDOW_DAYS`) sized from the real station
record over the whole 1901–2100 range, with the measured worst cases recorded in the engine's
own comments.

### Eclipses: global circumstances only

Lunar eclipses come from `SearchLunarEclipse`/`NextLunarEclipse`; solar eclipses from
`SearchGlobalSolarEclipse`/`NextGlobalSolarEclipse`. What is kept is the peak instant, the kind
(solar: `total`, `annular`, `partial`; lunar: `total`, `partial`, `penumbral` — the six keys
`sky-calendar-text.js` carries a reading for) and the obscuration, plus — for a solar eclipse —
the latitude and longitude where the shadow axis meets the geoid.

**The section never claims an eclipse is or is not visible from the reader's location.** No
observer-specific circumstance is computed, and the UI renders none: an eclipse appears in the
month as its kind and its peak instant, and the copy for it is about the tradition's reading of
that kind. There is no "visible from you", no local magnitude, no contact times. A reader who
wants to know whether they will see it has to look elsewhere; this is stated in the month tab's
conventions disclosure as "Eclipse circumstances are global: no local visibility is claimed for
your location."

### Transit sampling, and why it is safe

`personalTransits(source, year, month, {includeMoon})` finds every exact perfection inside one
UTC month. Nine bodies transit by default — Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus,
Neptune, Pluto (`TRANSIT_BODIES`) — and the transiting Moon sits behind its own switch, because
it perfects far more contacts than everything slower put together and would bury them. How many
depends on how many natal targets the chart offers; measured for one real timed chart (ten natal
planets plus the four angles) over UTC September 2026: **38** contacts without the Moon, **162**
with it.

The method is sample-then-bracket, not root-search-everything:

1. Each body's longitude is sampled once per step across the month and cached — **one day** per
   step for the nine, and **six hours** (0.25 d) for the Moon when it is included.
2. Every natal target × aspect × chirality pair is then tested against those cached samples.
   `astro.Search` (1-second tolerance) runs only where two *consecutive* samples actually
   bracket a crossing.

The naive alternative is a root search per body/target/aspect/direction — over two thousand of
them for a full chart — and would visibly freeze the page. Sampling once per body per step and
reusing those values across every target is what keeps a month's worth of exact contacts inside
a normal render.

A bracket is read as a crossing only if the aspect function changes sign *and* the jump between
the two samples is under `WRAP_GUARD_DEG = 45°`. That guard is what makes the shortcut safe.
`natal.delta` is a sawtooth: it runs −180…180 and drops 360 at the antipode, so a wrap shows as
a jump of about 360 minus the body's own motion — at least 315° for every body and step used
here — while a genuine crossing shows only that motion, at most **2.21°** for a one-day step
(Mercury, the fastest of the nine) or **3.85°** for the Moon's six-hour step. Forty-five degrees
sits an order of magnitude clear of both edges, so no wrap can be mistaken for a crossing and no
crossing for a wrap.

Two further details the tests pin:

- The bracket tests (`gb >= 0` / `gb <= 0`) put a root landing exactly on a sample boundary in
  the **earlier** bracket, and the next bracket's `ga === 0` satisfies neither test — so a root
  is found once and never twice. A test asserts no hit is reported twice.
- A retrograde loop that passes one natal degree three times reports all three passes, with the
  middle one flagged retrograde.

### The approximate path: a birth date with no birth time

`NatalEngine` refuses to place a chart without both a birth time and a birthplace. Rather than
refusing the reader too, `natalTargets` builds its own natal longitudes for the same nine bodies
at **noon UTC on the birth date**, which needs no location, and flags the result `approximate`.

**How far off noon UTC can be: 26 hours, not 12.** `birthday` is a *local* calendar date, so the
true instant is somewhere in that local day at whatever IANA offset applied. Over 1901–2100 the
offsets the zone database carries run from **UTC−12** (Pacific/Enderbury, 1938) to **UTC+14**
(Asia/Anadyr, 1981; Pacific/Kiritimati today). A UTC instant is the local naive time minus the
offset, so the easternmost zone at local 00:00 lands 12 + 14 = 26 hours *before* noon UTC, and
the westernmost at local 24:00 lands 12 + 12 = 24 hours *after*. The bound is 26 hours.

Worst-case longitude error is therefore the largest displacement over any 26-hour window in the
supported range, measured directly rather than extrapolated from a mean daily speed:

| Body | Worst-case error over 26 h |
|---|---|
| Moon | **16.67°** |
| Mercury | **2.39°** |
| Venus | **1.36°** |
| Sun | **1.11°** |
| Mars | **0.86°** |
| Jupiter | 0.26° |
| Saturn | 0.14° |
| Uranus | 0.07° |
| Neptune | 0.04° |
| Pluto | 0.04° |

Two consequences, and the UI states both:

- **The natal Moon is excluded.** At ±16.67° it is not a point at all — it can be most of a sign
  away, and an "exact" contact to it would be wrong by days for a slow transiting body. That is
  worse than saying nothing.
- **The four angles are excluded.** Ascendant, Midheaven, Descendant and Imum Coeli turn a full
  circle every day, so they need a birth time *and* a birthplace. There is no honest way to
  approximate them from a date alone.

The nine that remain are accurate to a degree or better **except Mercury (2.39°), Venus (1.36°)
and the Sun (1.11°)**. The copy therefore says "accurate to within a couple of degrees rather
than exactly — Mercury, Venus and the Sun are the three that drift furthest". It must never say
"about a degree": that would be wrong for three of the nine bodies it covers, and
`tests/sky-calendar-ui.test.cjs` asserts the phrase never appears.

When a birth time and birthplace *are* present, the chart's own placements are used, the angles
are added as targets of kind `angle`, and the natal Moon is included. The panel then says
"angles included, natal Moon included" and drops the caveat block entirely.

### Local instants over a UTC engine

The engine works entirely in UTC: `monthEvents(year, month)` and `personalTransits(...)` bound
their searches with `Date.UTC` and return every instant as an ISO string. The UI is a calendar
in the reader's own zone. The two are reconciled in `sky-calendar.js`, not in the engine:

- **Instants render locally.** Every engine `date` is a real moment and is formatted in the
  device's zone. Each conventions disclosure ends with "Instants are shown in your device's time
  zone (*Zone*)", naming the resolved IANA zone.
- **Nominal labels stay put.** A month heading, a day heading and a stored birthday are labels
  with no instant behind them. They are built as `Date.UTC(y, m, d)` and formatted with
  `timeZone: 'UTC'`, or they slide a day at a western offset.
- **A local month is assembled from three UTC ones.** Offsets run UTC−12 to UTC+14 — under a day
  either way — so the three UTC months around a local month always cover it. `localSlice`
  fetches all three and keeps only what lands on a local date inside the month on screen. The
  per-month cache means stepping reuses two of the three, so only the first paint of a month
  pays for its neighbours. Both the month grid and the transits list use it, so a contact at
  23:40 on the last local day of the month belongs to that month and not the next one.

`tests/sky-calendar-ui.test.cjs` pins this with the TZ forced to `America/Los_Angeles`: a Moon
ingress at 06:43 UTC on 14 September 2026 has to appear on local day 13 and not on 14, and local
November 2026 has to pull one event in from UTC December and let one go to UTC October.

### Copy

All interpretive text lives in `sky-calendar-text.js`: eight Moon-phase readings, twelve
ingress-sign readings, eight retrograde readings (one per station body), six eclipse readings
(three solar kinds and three lunar), five aspect readings, and the void-of-course framing piece.
Each entry is a `{title, body, prompt}` triple. Traditional names — sign names, phase names,
aspect names — are factual data, not original copy.

Two mappings are index maps rather than title matches, deliberately:

- `QUARTER_TO_PHASE = [0, 2, 4, 6]`. The engine's `QUARTER_NAMES[3]` is "Third quarter" but the
  phase at that point is named "Last quarter", so matching by title would silently mis-file it.
- Aspect readings are resolved by degree (`ASPECT_DEGREES.indexOf(hit.aspect)`), not by name.

`tests/sky-calendar-text.test.cjs` asserts every table is complete, that no entry forecasts or
promises, and that no copy was duplicated between entries.

## Saving a transit calendar

Only the personal transit calendar is a reading; the Moon, the month and the retrograde tracker
are the same sky for everybody and have nothing personal to keep. `sky-calendar.js` registers
kind **`transit-calendar`** (label "Transit calendar", category `sky`) in its self-attach block,
beside the state it reads. The kind is declared in `server/ishtar/readings/kinds.py` and mapped
to `/sky/` in `rooms.js`'s `PAGES`/`LABELS`; `#sky-calendar` carries
`data-room="transit-calendar"` so the journal's `?reading=` opener can scroll to it.

The save control sits at the foot of the "My transits" tab and is the ordinary site-wide
`[data-save-reading]` button, so `account.js`'s document-level delegation does the rest. A
signed-out reader sees "Sign in to save this month" and pressing it opens the sign-in dialog —
**nothing is posted and nothing is stored** for a guest. Signing in or out re-renders the tab so
the label follows the account state.

**The payload is the birth snapshot and the month.** The hits themselves are not stored; the
room recomputes them on open.

| Field | Meaning |
|---|---|
| `birth.birthday` | `YYYY-MM-DD` |
| `birth.time` | 24-hour `HH:MM`, or `''` for a date-only birth |
| `birth.location` | `{latitude, longitude, timeZone}`, or `null` |
| `birth.houseSystem` | one of `placidus`, `whole-sign`, `equal`, `regiomontanus` |
| `birth.fold` | `''`, `earlier` or `later` — which occurrence of an ambiguous DST clock time |
| `year`, `month` | the calendar month on screen (month 1–12) |
| `includeMoon` | whether the transiting Moon was included |
| `sample` | `true` if the illustrative sample chart was showing, not the reader's own |

Only the three location fields `NatalEngine` actually reads are copied: the stored profile's
`placeLocation` can carry a whole geocoder record and the API caps a payload at 8 KB. The place
name is not among them — nothing on replay displays it.

**Sample calendars stay labelled as samples.** The snapshot is of whatever chart the tab is
showing, so a calendar saved while "Try a sample chart" is on carries the sample's birth details
(15 July 1990, 14:30, New York) rather than the reader's own. Saving one is allowed, but the
framing has to survive the round trip, because by the time the reader opens it again the sample
bar is long out of sight. So `sample: true` travels in the payload and does two things: the
journal row's summary ends `· sample chart`, and on replay the profile bar reads "Opened from
your journal · sample chart · 15 July 1990, 14:30, New York. Illustrative birth details, not
your own." rather than naming a birth date as though it were the reader's.

The summary is `<Month> <Year> · <n> exact contact(s)`, truncated to the API's 120-character
limit — for example **`September 2026 · 38 exact contacts`**. The month name comes from the same
`Intl` formatter the stepper uses, so the row in the journal names the month the reader saw.

**On open**, `load(reading)` rebuilds the natal chart from the snapshot with
`NatalEngine.calculate` and recomputes the month. A snapshot with no usable time or place gives
a chart `NatalEngine` refuses to place, which is exactly the `null` the live path stores for the
same case — the engine then falls back to the noon-UTC natal points, so a date-only reader's
saved calendar replays down the same approximate path it was saved on. The restored snapshot
outranks both the sample chart and the reader's current profile until they press "Use my chart",
because a saved reading has to replay from what it was saved with. The profile bar says
"Opened from your journal · saved birth details · *date*".

**Every field is validated before any state is touched**, the way `TarotRoom.loadDraw` does:
`year` and `month` are integers in range, `includeMoon` is a boolean, `birthday` matches
`YYYY-MM-DD`, `time` is `''` or a real 24-hour `HH:MM` (a one-digit hour is accepted),
`sample` is absent or a boolean, `location` is absent/null or a complete in-range place,
`houseSystem` and `fold` are members of their known sets — and then, as a last gate the field
checks cannot make, `personalTransits` itself has to return `ready` for that source and month
(which rejects a well-formed date that is not a real day, such as `2026-02-31`). Only after all
of that does anything mutate. A malformed payload returns `false` and leaves the tab, the month,
the Moon switch, the chart and the rendered panel exactly as they were.

A successful load ends by revealing the section's mobile fold before scrolling to it
(`MobileSections.reveal`), the same line both sibling rooms end on. Without it a replay on a
phone switches to the transits tab inside a **collapsed** row and the reader sees nothing; the
page's generic `?reading=` `scrollTo` cannot fix that, because it scrolls to an element that is
still `hidden`.

A malformed `location` is **rejected**, not quietly degraded to "no place": silently dropping a
broken birthplace would replay a different chart from the one that was saved. A malformed `time`
is rejected for the same reason, which is why the pattern is a real 24-hour clock
(`([01]?\d|2[0-3]):[0-5]\d`) and not a loose `\d{1,2}:\d{2}` — `07:60` and `99:99` match the
loose one, `NatalEngine` then refuses to place them, and a refused chart is indistinguishable
from an honest date-only birth, so the load would replay down the approximate path instead of
rejecting a payload that cannot be right.

What is **not** rejected is a well-formed time that `NatalEngine` still cannot place: a clock
time inside a daylight-saving gap (`status: 'error'`) or an ambiguous autumn time saved with no
`fold` (`status: 'ambiguous'`). Those are facts about that date and place, not payload damage,
and the **live** path degrades on them identically — `BirthProfile` hands `setBirthChart` a
non-ready chart, `chart` becomes `null`, and the reader gets the approximate noon-UTC path. A
reader born at such a moment can therefore save a calendar and reopen it to exactly what they
saved. Rejecting on a failed placement would make their saved reading permanently unopenable,
which is why the guard is the pattern and not the chart result.

The search run for that last validation is kept in the transit cache rather than thrown away,
since `renderTransits` asks for exactly that year, month and Moon setting a moment later.

## Validation

Run the whole suite:

```
node --test tests/*.test.cjs
```

which is **420 tests passing** at the time of writing. Note the glob: `node --test tests/` fails
on Node 24 with `MODULE_NOT_FOUND`, so the path must be expanded by the shell.

The three sky-specific files:

```
node --test tests/sky-calendar.test.cjs        # 36 tests (engine, incl. the fixture comparison)
node --test tests/sky-calendar-text.test.cjs   # 4 tests  (copy tables)
node --test tests/sky-calendar-ui.test.cjs     # 25 tests (section logic, in `vm` with a stub DOM)
```

`tests/sky-calendar-ui.test.cjs` has no DOM library and no new dependency: it loads
`sky-calendar.js` into `vm` with a stubbed document and a frozen clock and reads the HTML each
render assigns to its panel, the same way `tests/daily-horoscope.test.cjs` does. It pins TZ to
`America/Los_Angeles` before any `Date` or `Intl` work, because the local-day bucketing it guards
is invisible at UTC.

Five of those twenty-one tests drive the saveable room directly, because `current()` and
`loadCalendar()` are both on the object `attach()` returns: a saved calendar replays its own
month, Moon switch and birth details and round-trips as a fixed point; a sample calendar is
named as one in both the summary and the replayed profile bar; **26 malformed payloads each
return `false` while leaving the panel's HTML byte-identical** — the mutation *order*, which a
return-value check alone cannot see; and two tests cover the snapshots that legitimately have no
placeable chart, one per branch. Those last two are deliberately separate: a snapshot with
`time: ''` takes `NatalEngine`'s `missing` branch, while a snapshot whose time *is* set and still
will not place takes `error` (a clock time inside a spring-forward gap) or `ambiguous` (a
repeated autumn hour with no `fold`). Only the second pins the rule in *A malformed `time`*
above, and it asserts the `NatalEngine` status it depends on rather than assuming it, so a change
in the zone database fails the test loudly instead of quietly testing nothing.

### Independent fixtures

**`tools/build_sky_fixtures.py`** (development only, never shipped) derives every fixture row
from **pyswisseph 2.10.3.2** in Moshier mode (`FLG_MOSEPH`), sharing no code with the vendored
Astronomy Engine or with the test file, and writes `tests/fixtures/sky-reference.json`:
42 quarter rows, 62 ingress rows, 40 station rows and 20 eclipse rows, sampled around 1902,
1950, 2000, 2026 and 2099 (station rows spill into the adjacent year, since a station is found
near, not on, the sampled date). Uranus, Neptune and Pluto sit far outside that sampling grid
for ingresses — they change sign once every 7, 14 and 12–30 years — so their ingress row is the
first one at or after 1 January of the sampled year, however far ahead it falls, kept only if
it lands inside 1901–2100.

**Two different derivations, and the distinction matters.** Quarter moons, sign ingresses and
stations are re-found by a plain from-scratch bisection written in Python
(`tools/build_sky_fixtures.py`), so for those rows both the positions *and* the root search are
independent of the vendored engine. Eclipse rows come from Swiss Ephemeris's **own** searches,
`swe.lun_eclipse_when` and `swe.sol_eclipse_when_glob`, so there it is the ephemeris and the
eclipse model that are independent, not a hand-written search. Either way the positions come
from a different library, so a systematic error in either implementation shows up as a real
disagreement rather than as an internal self-consistency check. Swiss Ephemeris is a local test
tool only and is not shipped.

Baseline tolerances: **one minute** for quarters and ingresses, **one hour** for stations,
**three minutes** for eclipse peaks, with the eclipse `kind` asserted exactly. Sign ingresses
cover the Sun's four cardinal cusps (the equinoxes and solstices) directly, plus Moon and Mars
rows spread across all four seasons of each sampled year, plus one Uranus, Neptune and Pluto row
per sampled year. Station rows cover all eight station bodies, Mercury through Pluto.

Four groups of rows disagree past those tolerances. Each was isolated, measured and explained;
each carries its own per-row bound (the worst measured value, rounded up, plus a small margin)
rather than a shared loose one, so no row is left with tens of seconds of unmeasured slack.

**1. Delta-T divergence near 2099.** All eight sampled 2099 quarter rows disagree by
**63.0–74.3 s**, and ten 2099 ingress rows by **98.7–232.4 s**. Every quarter row outside 2099
stays under 46 s, and every newly covered non-2099 cardinal and mid-year ingress row agrees to
within 39 s — the only non-2099 ingress rows past a minute are the two Mars rows in group 2
below. Isolated with a fixed-instant comparison — both
engines asked for the Moon–Sun elongation at the *same* UT instant, bypassing either engine's own
root search — the two elongations already differ by 0.0176° at 2099-01-07T01:51Z. That is
accounted for almost exactly by the two libraries' **delta-T (TT−UT) models** disagreeing by
about **107.7 s** at that date: Astronomy Engine's `DeltaT_EspenakMeeus(2099-01-21)` = 200.4 s,
pyswisseph's `swe.deltat` for the same date = 92.7 s; 107.7 s times the Moon's ~13.8°/day
relative synodic speed there is 0.0172°, matching the observed 0.0176°. Delta-T past roughly
2050 is a *forecast* of Earth's future rotation, not a measurement, and the two libraries
extrapolate it differently — which is why this grows sharply at the far edge of the supported
range. It is distinct from the ~35–45 s baseline offset between the two engines' independently
truncated lunar and solar series, which is present at every sampled year (including 1902, where
the delta-T difference is negligible) and stays comfortably inside a minute on its own.

**2. The Mars model, amplified near a station.** Two ingress rows away from the range edge also
exceed a minute: the **1950-03-28 Mars ingress into Virgo** (a retrograde re-entry, 132.6 s) and
the **2000-01-04 Mars ingress into Pisces** (68.6 s). Neither is a delta-T effect — 1950's
delta-T disagreement is under a second. Measured directly at a fixed instant near each crossing,
the two engines' Mars longitudes differ by only **~0.0006°** (about 2 arcseconds) in both cases:
an entirely ordinary gap between two independent Mars ephemerides. What turns it into a large
*timing* gap is that Mars's apparent speed is reduced at both points (−0.385°/day, mid retrograde,
in 1950; 0.776°/day in 2000), so the same tiny longitude gap takes much longer to close than it
would at full speed. The same amplification is what makes the 2099 Mars rows the worst in the
set: 152.2 s at 0.689°/day, and 232.4 s at just 0.252°/day on 2099-08-26, confirmed directly
against the engine's own `speedAt`.

**3. The outer three, the same amplification taken to its limit.** All twelve Uranus, Neptune
and Pluto ingress rows exceed a minute, from **67 s to 13 563 s**. None is a delta-T effect: ten
of the twelve are nowhere near the range edge and the worst is 2011. Measured at each row's own
UT instant, so neither engine's root search is involved, the two libraries' longitude for that
body differs by between **0.09″ and 16.5″** — the same order as the ~2″ Mars gap in group 2, and
entirely ordinary between a Moshier ephemeris and Astronomy Engine's own series. Each gap
divided by the engine's own `speedAt` at that instant reproduces its timing bound to within a
couple of seconds. So for these bodies the tight agreement is the arcsecond figure; a bound in
seconds is necessarily loose for a planet that takes a fortnight to cross an arcminute, and the
per-row bounds still catch the regression the fixture exists for (a row moving by a day). The
fifteen new outer-planet **station** rows needed no exception at all — the worst is 1792.6 s
(Neptune direct, 2099-05-23), inside the one-hour station tolerance.

**4. One eclipse kind: 1950-03-18.** Nineteen of the twenty eclipse rows agree on `kind`
exactly. The exception is the solar eclipse of **1950-03-18T15:31:35Z**, which pyswisseph
classifies `ECL_ANNULAR | ECL_NONCENTRAL` (retflag 10, confirmed directly against
`swe.sol_eclipse_when_glob`) — it already knows the shadow axis is non-central, but names the
event by the umbra's shape. Astronomy Engine's `GeoidIntersect` instead requires the shadow axis
to actually intersect Earth's oblate geoid before calling an eclipse total or annular at all.
Here the axis's closest approach to Earth's centre is **6370.499 km** (measured directly from
`SearchGlobalSolarEclipse`) — between Earth's polar radius (6356.75 km) and its equatorial
radius (6378.14 km) — so whether it "touches" depends on which Earth model and threshold you
use. Astronomy Engine's geoid test finds no intersection and reports `partial`. Two defensible
conventions for a genuinely borderline non-central event, not a bug in either engine. The
engine's answer, `partial`, is what the section shows.

### Engine self-checks

Beyond the fixtures, `tests/sky-calendar.test.cjs` asserts, among others: the modern void is
contained in the classical one over a full year; a sign the Moon crosses with no aspect at all is
wholly void; `moonNow` still reports a genuine void state within a week of either edge of the
supported range; the Sun makes exactly one ingress a month and twelve a year; a retrograde body
reports the backward ingress into the sign it just left; Mercury's stations alternate retrograde
and direct; the Sun and Moon never station; `stations()` reports nothing at or after its own `to`
bound; every reported transit hit is exact to within a few arcseconds; no hit is reported twice;
a retrograde loop over one natal degree reports all three passes; and `personalTransits` refuses
an unusable source or an out-of-range month with a status instead of throwing.

### Browser checks

Against the local dev stack (static site on `:8099`, API proxied to a local Django on `:8000`),
signed in with a real one-time code:

- Signed out on `/sky/`, the save control reads "Sign in to save this month"; pressing it opens
  the sign-in dialog, issues **no** `/api/readings/` request and adds no storage key.
- Signed in, the control re-renders as "Save this month to my journal" without a reload, and
  saving returns **"Saved to your journal."** — the API answers 201 with `category: "sky"`.
- The journal row reads `September 2026 · 38 exact contacts`, and the **Sky** chip filters to the
  `sky` rows — with **no change to `account.js`**.
- "Open" navigates to `/sky/?reading=<id>`, which restores the transits tab, the saved month, the
  saved Moon switch and the same contact count, with a `current()` payload identical to the one
  saved. Loading a payload for a different month with `includeMoon: true` restores that month and
  switch too, so the restoration is real and not a coincidence of the defaults.
- Saving while the sample chart is showing produced the row
  `September 2026 · 39 exact contacts · sample chart`, and reopening it showed "Opened from your
  journal · sample chart · 15 July 1990, 14:30, New York. Illustrative birth details, not your
  own." — the sample framing survives the round trip in both places.
- **At 375×812**, with the section's fold collapsed by pressing its own toggle (`is-open`
  removed, body `hidden`, section height 0), replaying a saved calendar reopened it: `is-open`
  restored, body no longer hidden, section height 4113px. Without the `MobileSections.reveal`
  call the replay lands inside a closed row and the reader sees nothing. *(The scroll half of
  that line could not be measured here: in this browser pane even `window.scrollTo(0, 400)`
  leaves `scrollY` at 0 and no element reports a scrollable overflow, so scroll position is not
  observable from page script — for any room, including the two siblings. The fold state is.)*
- `load()` rejected `07:60`, `99:99`, `24:00`, `8:5` and a non-boolean `sample` without touching
  the panel, while `8:05` (a one-digit hour) loaded — matching the unit tests above.
- The only console errors are the signed-out `/api/account/` 401s.

## Out of scope

From the design spec (`docs/superpowers/specs/2026-09-13-sky-design.md`), which carries these
forward from the program spec's C1 exclusions: heliocentric and topocentric positions,
occultations, a general planetary conjunction search beyond the natal-hit list, and
notifications. Excluded by the spec on top of that: per-reader eclipse visibility, asteroids and
Chiron, and any claim about what an event means for the reader's future.

Two further limits are facts of the code rather than spec entries: only the five Ptolemaic
aspects are searched (`ASPECTS = [0, 60, 90, 120, 180]`), and no orbs are used at all — the
transit list is exact perfections only, so nothing is ever described as approaching or
separating. The mean lunar nodes are computed by `NatalEngine` but deliberately skipped as natal
targets (`natalTargets` filters to `kind === 'planet'`).
