# Site expansion: organization, universal saving, and five depth tracks

Date: 2026-09-13. Status: design, awaiting Glenn's review.

## Purpose

Ishtar Insights has grown to fourteen topics on one `index.html`. This design (1) reorganizes
the site into topic pages with a hub, (2) makes every reading and chart saveable to the account
journal through one registry instead of per-room special cases, and (3) sequences four depth
tracks: Moon and sky calendar, tarot, astrology, numerology and divination. It is a program of
five sub-projects. Each sub-project gets its own detailed implementation plan when it starts;
this document fixes the shape they all build on.

## Decisions already made

| Decision | Choice | Source |
|---|---|---|
| Tracks in scope | Moon/sky calendar, tarot depth, astrology depth, numerology and divination depth | Glenn, 2026-09-13 |
| Saving | Every reading and chart kind saveable to the account journal; guests see a sign-in prompt; one generic schema | Glenn, 2026-09-13 |
| Organization | Multi-page site with a hub; real URLs, per-page meta, sitemap | Glenn, 2026-09-13 |
| Share/print and newsletter delivery | Not in this program | Glenn, 2026-09-13 |
| No build step; plain `<script>` globals with `?v=` cache keys | Keep | Codebase convention (deployment copies git files verbatim) |
| Birth data stays in the browser or behind the existing account consent; nothing new sent anywhere except an explicit Save | Keep | Codebase convention (every section doc states it) |
| Voice: symbolic reflection, no predictions, no "you will", no luck/fortune, no verdicts | Keep | Codebase convention (tested in `tests/horary-text.test.cjs` and others) |
| Open-source libraries only | Keep | Glenn's global preferences |

## Part A: Information architecture

### Pages

Seven topic pages plus the hub, each a directory with its own `index.html`, served by nginx
with `try_files $uri $uri/index.html`. Existing hash links keep working through a redirect map
in the hub (`#horary` → `/charts/#horary`, and so on) so old bookmarks and the newsletter
footer do not break.

| URL | Page | Contents (moved from today's sections) | New in this program |
|---|---|---|---|
| `/` | Hub | Celestial hero, "today" strip (Moon phase and sign, daily card, Sun sign), eight category cards, account button | Today strip |
| `/tarot/` | Tarot | Daily card, full readings, deck chooser, deck archive and gallery | Card reference, yes/no and clarifier draws, reversal and Major-only options, two spreads |
| `/sky/` | Sky | Daily horoscope | Moon now, month calendar (phases, ingresses, stations, void-of-course, eclipses), retrograde tracker, personal transit calendar |
| `/charts/` | Charts | Birth form, natal chart, chart in time, astrocartography, transits and synastry, horary | Profections, Part of Fortune, minor aspects and patterns, composite and Davison |
| `/eastern/` | Eastern | Jyotish, BaZi, Chinese zodiac portrait | Gochar, annual pillar, animal year forecast |
| `/numerology/` | Numerology | The six-view studio | Karmic debt, karmic lessons, hidden passion |
| `/divination/` | Divination | Lenormand, oracle, runes, geomancy, I Ching | Grand Tableau, geomantic house chart, playing cards, I Ching line texts |
| `/account/` | Account | Sign-in, journal, birth-detail and browser-saving preferences, newsletter toggle, delete | Journal filters and per-kind open |

`cookie-policy.html`, `newsletter-privacy.html` and `unsubscribe.html` stay where they are.

### Shell

`site-shell.js` and `site-shell.css` render the parts every page shares at load: masthead with
the lotus logo, the top navigation (eight links, current page marked with `aria-current`), the
account button, the storage notice, and the footer. Pages contain only their own sections
between two shell mount points. This follows the codebase pattern of components writing their
own markup and keeps the no-build rule; the alternative, a static-site generator such as
Eleventy for shared templates, is deferred until the page count or per-page metadata makes
runtime injection awkward. Each page's `<head>` carries its own title, description and Open
Graph tags as static HTML so crawlers and link previews see them without JavaScript.

### Birth profile

The birth form, its storage, validation and account sync move out of `app.js` into
`birth-profile.js` (shared) and `birth-form.js` (the form UI). Pages that need birth data
(`/charts/`, `/eastern/`, `/numerology/`, `/sky/` for personal transits) include both. Pages
that only need the resolved profile (`/` for the Sun sign) include `birth-profile.js` alone.
The existing `setBirthChart` contract is unchanged: `birth-profile.js` resolves the profile
and each room receives the chart exactly as today. Storage keys, consent behavior and the
account profile API do not change. Whichever page the visitor is on, the same profile is used.

### Module loading

Each page lists only the scripts it needs, in today's order. `app.js` splits into
`birth-profile.js`, `birth-form.js`, `tarot.js` (the reading room and deck chooser) and
`hub.js` (hero and today strip). `mobile-sections.js` keeps its fold behavior but reads its
area list from the page instead of a hardcoded list, so each page declares its own folds.

### Navigation and discoverability

Static `sitemap.xml` and `robots.txt` at the root. Per-page `<title>`, `<meta name="description">`,
`og:title`, `og:description`, `og:image` (the celestial hero) and `og:url`. The hub's category
cards carry one-sentence descriptions so the home page reads as a directory, not a splash.

## Part B: Universal saving

### Rooms registry

`rooms.js` (shared) exposes `Rooms.register(kind, {label, category, current(), load(payload)})`.
Every room registers on attach. `account.js`'s two hardcoded branches (`tarot` versus
`divination`) are replaced by lookups in the registry. A generic `<button data-save-reading="KIND">`
in each room's output calls `Rooms.get(kind).current()` and posts the result.

### What a saved reading contains

Charts are deterministic functions of their inputs, so the payload stores inputs and settings,
never rendered output. On open, the room recomputes. This keeps every payload under the
existing 8 KB cap and means an improved engine re-reads an old saved chart correctly.

| Kind | Payload |
|---|---|
| `tarot-daily`, `tarot-spread`, `lenormand`, `oracle`, `runes`, `geomancy`, `iching` | Unchanged |
| `tarot-yesno` | Card, orientation, clarifier card if drawn |
| `natal` | Birth profile snapshot (date, time, place name, coordinates, zone), house system, orb scale |
| `solar-return`, `lunar-return`, `progressed` | Birth snapshot, target date or year, return place, method |
| `synastry`, `composite` | Both birth snapshots, method |
| `horary` | Question, instant, place, house matter |
| `jyotish` | Birth snapshot, selected mahadasha |
| `bazi` | Birth snapshot, luck-pillar counting choice |
| `chinese-year` | Birth date, chosen year |
| `numerology` | Birth date, name and Y choices, system, partner date if entered |
| `transit-calendar` | Birth snapshot, month |
| `cartomancy`, `grand-tableau`, `geomancy-houses` | Cards or figures drawn, layout |

Each save also sends a `summary` string (one line, ≤120 characters, built by the room) so the
journal list can show "Solar return 2027, cast for Lisbon" without fetching the payload.

Saving a numerology reading stores a name on the server. The Save button's note says so
("Saving stores the name you entered with your account"), matching the birth-detail wording.

### Server

`Reading.KINDS` becomes a module-level list in `readings/kinds.py` shared by model choices and
view validation; the migration widens `kind` to 32 characters and adds `summary`
(`CharField(max_length=120, blank=True)`) and `category` (`tarot`, `sky`, `charts`, `eastern`,
`numerology`, `divination`, derived from kind on save, indexed with `user`). `GET /api/readings/`
accepts `?category=` and `?kind=`. Payload cap stays 8 KB; per-user cap stays 500. Existing
rows are untouched.

### Journal

On `/account/`, the journal lists readings newest first with category filter chips and a text
filter over question and summary. "Open" navigates to the owning page with `?reading=ID`; the
page's `rooms.js` reads the parameter after rooms attach, fetches the reading, calls `load`, and
scrolls to the room. Rooms that cannot load an old payload (kind unknown to that page version)
show the existing "cannot be replayed" message. Notes and delete work as today.

Guests see the Save button with a "Sign in to save" state that opens the account panel. No
guest local journal in this program (Glenn's choice).

## Part C: Sub-projects

Each gets its own spec and plan at start. Scope and out-of-scope are fixed here.

### C0. Foundation: pages, shell, birth profile, rooms registry, saving

Everything in Parts A and B. Ships first because every later track lands on the new pages.
Behavior-preserving for existing features: every current section works identically on its
new page, verified by the existing 200-plus node tests plus browser checks per page at 1400px
and 390px.

Out of scope: visual redesign of any section, a build step, service worker or caching changes.

### C1. Sky

Engine `sky-calendar-engine.js` on the vendored Astronomy Engine 2.1.19:

- **Moon now.** Phase, illumination, sign and degree, next four quarters (`SearchMoonQuarter`),
  void-of-course state and end using `ClassicalEngine.moonCondition` from the horary work.
- **Month calendar.** For any month 1901–2100: quarter moons, sign ingresses for Sun through
  Pluto (longitude search over the same `Ecliptic(GeoVector(...)).elon` expression the natal
  and return engines use), retrograde and direct stations (sign change of daily longitude
  speed), lunar and solar eclipses (`SearchLunarEclipse`, `SearchGlobalSolarEclipse`), and the
  Moon's void periods. Rendered as a grid with a list view, keyboard navigable.
- **Retrograde tracker.** Current and next retrograde period for each planet, with shadow
  periods shown as dates only.
- **Personal transit calendar.** When a birth profile exists: exact hits of transiting Sun
  through Pluto to natal planets and angles within the month (root-finding on the aspect
  separation, five major aspects), listed by day. This replaces the transit section's 12:00 UTC
  snapshot limitation; the snapshot bi-wheel stays on `/charts/`.
- Copy: original reflections per phase, per ingress sign, per retrograde planet, per eclipse
  type. No forecasts.

Validation: fixtures from pyswisseph for quarter moons, ingresses, stations and eclipses across
five years (`tools/build_sky_fixtures.py`, dev-only), tolerance one minute for phases and
ingresses, one hour for stations.

Out of scope: heliocentric or topocentric positions, occultations, planetary conjunction
search beyond the natal-hit list, a notifications feature.

### C2. Tarot depth

- **Card reference.** Browsable index of all 78 cards using the existing upright, reversed and
  prompt copy from `app.js`/`tarot-readings.js` (moved into `tarot-data.js`), filtered by arcana
  and suit, with each card in the currently chosen deck's art and a link to the same card in
  every archive deck that has it.
- **Yes/no and clarifier.** One-card draw with an upright/reversed lean stated as "leans toward"
  never as an answer; optional one-card clarifier. Journal kind `tarot-yesno`.
- **Options.** Reversals on/off (default on, one in five as today), Major Arcana only. Page-only
  state, no storage.
- **Spreads.** Relationship (7: you, them, the connection, what helps, what strains, advice,
  where it tends) and Year ahead (13: one per month plus the year's theme), with sources cited
  for position orders as the existing spreads do.

Out of scope: custom user-defined spreads, deck creation, card of the day notifications.

### C3. Astrology depth

- **Charts page.** Annual profections (twelve-year cycle from the Ascendant, time lord, current
  profected house and sign, with the solar return year's lord noted in Chart in Time); Part of
  Fortune (day/night formula using the sect already computed in `classical-engine.js`); minor
  aspects (quincunx, semi-sextile, semi-square, sesquiquadrate) behind a toggle with 2° orbs;
  aspect patterns (stellium, T-square, grand trine, grand cross, yod) listed with their members;
  composite (midpoint) and Davison (chart at the midpoint of the two instants and places)
  charts drawn with the existing bi-wheel and single-wheel renderers.
- **Eastern page.** Gochar: today's sidereal transits against the Rashi chart, Moon-sign
  based, using the Lahiri ayanamsa and the existing transit engine. BaZi annual pillar (流年)
  for a chosen year with its Ten God relative to the Day Master. Chinese year forecast: the
  relation of the chosen year's branch to the birth-year branch (same, trine, six-harmony, clash,
  harm, punishment, destruction) with original reflective copy per relation, framed as
  traditional association.

Out of scope: Chiron and asteroids (Astronomy Engine has no ephemeris for them; adding a
Swiss Ephemeris WebAssembly build is its own decision), fixed stars, primary directions,
precessed returns, Jyotish yogas, ashtakavarga and kuta, BaZi strength or favourable element.

### C4. Numerology and divination depth

- **Numerology.** Karmic debt (13, 14, 16, 19 surfaced when they occur in the Life Path, Birth
  Day, Expression, Soul Urge or Personality reductions), karmic lessons (digits absent from the
  name), hidden passion (most frequent digit), each with original copy. Numerology becomes
  saveable.
- **Lenormand Grand Tableau.** 36 cards in the 8×4+4 layout, house meanings for all 36
  positions, the reader's chosen significator (Man, Woman, or none), nearness to the
  significator, knighting, and the four corners, with the existing card meanings.
- **Geomantic house chart.** The twelve astrological houses filled from the shield (mothers
  1–4, daughters 5–8, nieces 9–12), house meanings, and the traditional judgement steps
  (figure in the quesited house, passage, conjunction, aspects) presented as historical method
  in the horary voice.
- **Playing cards.** 52-card cartomancy with vector pips in the runes' style, original copy per
  card, one-card and three-card draws.
- **I Ching line texts.** 384 original one-paragraph line reflections, written and shipped in
  eight batches of eight hexagrams so the feature can land incrementally; the six position
  reflections remain until a hexagram's lines are written.

Out of scope: pendulum, dream, tea-leaf or other practices without a fixed symbol set; a second
person's name reading; Chaldean birth-date readings.

## Part D: Sequencing

```
C0 Foundation ──► C1 Sky ──► C2 Tarot ──► C3 Astrology ──► C4 Numerology & divination
```

C0 must ship first. C1 through C4 are independent of one another and could be reordered; the
order above front-loads the two widest-audience features (Moon and tarot reference). I Ching
line texts run as a background copy task across the later phases.

## Part E: Constraints for every sub-project

- No new dependencies unless an open-source library replaces non-trivial hand-rolled code, and
  the plan says which. (Glenn's global preference.)
- Every engine is a pure UMD module tested with `node --test tests/*.test.cjs`; every UI module
  follows the `attach(root)` pattern and registers with `Rooms`. (Codebase convention.)
- Every new astronomical calculation ships with independent pyswisseph fixtures generated by a
  dev-only script under `tools/`. (Codebase convention.)
- Every section has an "About this ..." disclosure naming its convention and sources, and
  copy is checked by a text test for the forbidden phrases. (Codebase convention.)
- Keyboard operable, `aria-expanded`/`aria-controls` folds, reduced-motion respected, layouts
  verified at 390px and 1400px. (Codebase convention.)
- Cache keys bumped on every changed file; docs under `docs/` updated; `docs/deployment.md`
  records each deploy. (Codebase convention.)
- Commits end with the Claude Fable co-author line. (Session attribution instruction.)

## Out of scope for the whole program

Sharing, print stylesheets, newsletter delivery, guest local journal, a build step, i18n,
Chiron and asteroids, a paywall.
