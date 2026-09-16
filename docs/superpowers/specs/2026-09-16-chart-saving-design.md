# C5: saving on the charts and eastern pages

**Date:** 2026-09-16. **Program:** `2026-09-13-site-expansion-design.md`, Part B (universal
saving). **Status:** approved design, awaiting the plan.

## Purpose

Part B built the saving infrastructure in C0 and said each room would register in the
sub-project that built it. The C3 sub-projects built the charts and eastern pages but each
excluded saving, so today the server accepts eight kinds that no page can produce: `natal`,
`solar-return`, `lunar-return`, `progressed`, `synastry`, `horary` on `/charts/`, and
`jyotish`, `bazi` (which lives on `/charts/` inside CelestialExtras). C5 closes that gap, and
adds the two kinds C3b created without a kind: `composite` and `davison`.

After C5 a signed-in reader can save any chart the site casts and reopen it from the journal
as the chart it was, whatever their birth profile says by then.

## Decisions taken with Glenn

1. **A saved chart embeds the inputs it was cast from**, with a disclosure beside the save
   button. The reader's explicit save is their consent, as with the partner date in
   numerology. The "Save my birth details" preference governs profile sync only.
2. **A saved horary chart keeps its question** in the reading's `question` field. The page
   copy "stays on this page only, never saved" becomes "saved only if you save the chart".
3. **`composite` and `davison` become kinds** of their own (category `charts`), with a
   migration and a two-stage deploy as in C4b. They are not folded under `synastry`.
4. **The Chinese-year portrait is not saved.** It is the profile's fixed animal plus a chosen
   year, not a cast, and it has no kind.

## Architecture

### `chart-rooms.js` (new, shared)

A pure UMD module, loaded on `/charts/` and `/eastern/` after `natal-engine.js` and before the
chart modules. It owns what every saved chart has in common, so the six chart modules do not
each reinvent it:

- `birthInputs(profile)` → the `birth` object below, from a `BirthProfile` profile.
- `validate(kind, payload)` → a sanitised payload or `null`. It checks `v === 1`, the date
  and time formats, latitude −90..90, longitude −180..180, a non-empty time-zone string, the
  house system, and each kind's extras (below). Anything else is refused, and `load()` returns
  `false`.
- `natalFrom(birth)` → `NatalEngine.calculate({birthday, time, location, houseSystem, fold,
  orbScale})` for a saved birth, so a restored chart is computed from the payload, never from
  the live profile.
- `reading(kind, {payload, summary, layout, question})` → the object `current()` returns,
  with `deck` and `focus` empty and every string clipped to the server caps (summary 120,
  layout 40, question 240).
- `describe(birth)` → "12 March 1980 at 06:30, London" for the restored banner.
- `restoredGate()` → `{set(model), clear(), current(), active()}`: the sky-calendar rule in
  one place. While a restored chart is set, `setBirthChart` pushes from the profile are
  ignored by that module; "Use my chart" clears it and re-renders from the live profile.

Each chart module keeps its own `current()` and `load()`, because only the module can read and
apply its state. They call `Rooms.register` themselves, as numerology and the sky calendar do.

### The payload

`payload.v` is `1`. `payload.birth` is `{date: 'YYYY-MM-DD', time: 'HH:MM', place: {name,
lat, lon, tz}, houseSystem, fold, orbScale}`, taken from the profile's `birthday`, `time`,
`place`, `placeLocation.{latitude, longitude, timeZone}`, `houseSystem`, `fold` and
`orbScale`. Per kind:

| Kind | Extras | `layout` | `question` |
|---|---|---|---|
| `natal` | none | house system | — |
| `solar-return`, `lunar-return` | `target: 'YYYY-MM-DD'` (the date the reading was saved, the engine's reference), `offset` (the return index), `place` override (same shape as `birth.place`) or `null` | house system | — |
| `progressed` | `target`, `method: 'secondary' \| 'tertiary' \| 'solar-arc'` | method | — |
| `synastry`, `composite`, `davison` | `partner`: a second `birth` object built from the partner form (`#cx-partner-*`) | house system | — |
| `horary` | `birth` is omitted; `moment: {date, time, place}` from `#ho-date`, `#ho-time` and the chosen place; `house: 1..12` from `#ho-house-matter` | the horary engine's house system | the question text, clipped to 240 |
| `jyotish` | `tab: 'rashi' \| 'nakshatras' \| 'dashas' \| 'navamsa' \| 'gochar'`, `gochar: 'YYYY-MM-DD'` | `'sidereal'` | — |
| `bazi` | `pillar: 0..3` (the pillar shown in detail) | `'four-pillars'` | — |

Every payload is a few hundred bytes, far under the 8 KB cap.

### Summaries

`summary` is computed from the result so the journal line says what the chart showed:

- natal: "Sun Leo · Moon Aries · Ascendant Virgo" (`points[0].sign`, `points[1].sign`,
  `axes[0].sign`).
- solar return: "Solar return 2026 · Ascendant Scorpio"; lunar return: "Lunar return 12 Mar
  2026 · Ascendant Scorpio" (the return moment's date).
- progressed: "Progressed to 2026 · secondary".
- synastry, composite, Davison: "Synastry · 12 Mar 1980 · 4 Jul 1982" (the two birth dates;
  the partner has no name).
- horary: "House 7 · Ascendant Gemini · 16 Sep 2026".
- jyotish: "Lagna Simha · Moon in Rohini".
- bazi: the day pillar, "Day pillar 甲子", or the engine's nearest equivalent; the plan binds
  the property path.

### Saving

Each chart's output gets the site's standard control, matching numerology's markup:
`<p class="save-reading"><button type="button" data-save-reading="KIND">…</button><span
role="status" aria-live="polite"></span><span class="save-note">…</span></p>`. The button
label is "Save this chart to my journal" or "Sign in to save this chart". `account.js`'s
document-level handler does the rest; it is unchanged.

The note is always visible for these kinds:

- one-person charts: "Saving stores the birth details this chart was cast from."
- two-person charts: "Saving stores both people's birth details."
- horary: "Saving stores the moment, the place and your question."

Synastry, composite and Davison share one output; the button's kind follows the chosen method,
as the divination save button follows the current draw's kind.

### Reopening

`?reading=ID` reaches the page through the existing opener, which calls `room.load(reading)`
after sign-in resolves and scrolls to `[data-room~="KIND"]`. Both pages gain `data-room`
markup: `#birthday-output`'s section for `natal`; the chart-in-time section for
`solar-return lunar-return progressed`; the celestial-extras section for `synastry composite
davison bazi`; the horary section for `horary`; the Jyotish section for `jyotish`.

`load(reading)` in each module:

1. `ChartRooms.validate(kind, reading.payload)`; on `null`, return `false` (the opener reports
   "failed" and the page stays as it was).
2. Compute the chart from the payload: `natalFrom(birth)` (and `natalFrom(partner)`), then the
   kind's engine call with the extras. Horary casts `HoraryEngine.cast` from `moment` and
   `house`.
3. Set the module's restored gate, apply the extras to the module's state and inputs (target
   date, method, tab, Gochar date, pillar, partner fields, horary fields and question), reveal
   the section (`MobileSections.reveal`) and select the right internal tab, then render.
4. Show a restored banner at the top of that output: "Saved chart · cast for 12 March 1980 at
   06:30, London" (horary: "Saved question · 16 September 2026 at 14:02, London"; two-person:
   both descriptions) with a button "Use my chart" that clears the gate and re-renders from
   the live profile. The banner is a `<p class="restored-chart" role="status">`.
5. Return `true`.

While a module's gate is active, `setBirthChart` pushes are ignored by that module only; the
rest of the page follows the live profile. The natal room, which renders from
`BirthProfile.subscribe` rather than `setBirthChart`, applies the same rule inside its
subscriber: a restored natal chart is rendered in `#birthday-output` in place of the live
one until "Use my chart".

### Backend

`readings/kinds.py` adds `'composite': ('Composite chart', 'charts')` and `'davison':
('Davison chart', 'charts')`. A migration alters the `kind` choices, as `0005_reading_kind_c4`
did. `rooms.js` adds both to `PAGES` (→ `/charts/`) and `LABELS`, and its cache key is bumped
on every page that loads it. Django tests post one reading of each new kind and expect 201.

### Sub-projects

- **C5a** — the backend kinds, `chart-rooms.js`, and the one-person charts: `natal`,
  `solar-return`, `lunar-return`, `progressed`, and `horary`. Deployed in two stages: backend
  first (kinds and migration), then the static release.
- **C5b** — the two-person charts and BaZi in `celestial-extras.js`, and Jyotish on
  `/eastern/`. Static only.

Each has its own spec-derived plan, review cycle and deployment record.

## Testing

- `tests/chart-rooms.test.cjs`: `validate` accepts each kind's example payload and refuses bad
  dates, out-of-range coordinates, unknown house systems, unknown methods, houses outside
  1–12, missing partner and a wrong `v`; `reading()` clips to the caps; `describe()` and
  `birthInputs()` round-trip a profile.
- Per module, a round-trip test in the module's existing test file or a new stand-in-DOM test
  (the numerology pattern): register, cast, `current()` matches the payload table, `load()`
  of that reading reproduces the same inputs and returns `true`, `load()` of a bad payload
  returns `false` and leaves the state alone, and a `setBirthChart` push during a restored
  chart does not change the rendered chart until "Use my chart".
- `tests/rooms.test.cjs`: the two new kinds are in `PAGES` and `LABELS`.
- `tests/pages.test.cjs`: `chart-rooms.js` on both pages; dependency entries per its header
  rule.
- Django: 201 for `composite` and `davison`; the existing unknown-kind rejection still holds.
- Browser: on each page, save one chart of each kind while signed in and reopen it from the
  journal; change the birth profile and confirm the reopened chart does not change; "Use my
  chart" returns to the live chart; 390px and 1400px. Glenn performs the signed-in steps.

## Documentation

`docs/ACCOUNTS.md` gains a "Saved charts" section (the payload table, the disclosure, the
restored gate). `docs/SITE-STRUCTURE.md` updates the script chains, `data-room` markup and the
`PAGES` map. The C3 spec claims "Nothing on these pages saves" are superseded by this spec;
`docs/JYOTISH.md` and the charts docs note the save control. `docs/deployment.md` records each
deploy.

## Constraints

Tags: **[Glenn]** his instruction; **[codebase]** already enforced; **[program]** Part E;
**[spec]** a C5 decision above; **[judgement]** mine.

- No new dependencies. [Glenn]
- Every payload embeds its inputs and reopens without the live profile. [spec]
- Saving is explicit and disclosed beside the button; nothing is stored on the reader's
  behalf. [spec]
- `chart-rooms.js` is a pure UMD module tested with `node --test`; UI modules register with
  `Rooms` on attach. [program, codebase]
- Bare `typeof` guards, never `window.X`; the site's forbidden-phrase text test covers new
  copy; British spelling and curly apostrophes. [codebase]
- Keyboard operable, `role="status"` banners, 390px and 1400px verified. [program]
- Cache keys bumped on every changed file, including `rooms.js` on all its pages. [codebase]
- Backend changes deploy first, with the DB backup and health checks of the C4b wrapper.
  [codebase]
- Commits end with the session's co-author line. [session attribution instruction]

## Out of scope

The Chinese-year portrait; electional (the horary page's "elect" tab); the "Transits"
view of CelestialExtras, which has no kind (the sky page's transit calendar is the saved form
of transits); sharing a saved
chart; renaming or editing a saved chart's inputs; any change to the journal UI beyond the two
new labels.
