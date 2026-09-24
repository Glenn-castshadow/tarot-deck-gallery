# Crystals section — design

Date: 2026-09-24. Approved in conversation with Glenn, section by section.

A new topic page, `/crystals/`, plus one generated static page per crystal. About 100
crystals, each with its believed properties and its correspondences to signs, chakras,
element, planet and tarot cards.

Every constraint below is tagged with where it came from:
**[Glenn]** his instruction, **[codebase]** something the repo already enforces or does,
**[judgement]** Claude's own call, open to override.

## Scope

- About 100 crystals in the first release. **[Glenn]**
- An interactive page in the nav, plus static per-crystal pages for search. **[Glenn]**
- Interactive features: crystal of the day, and your stones. **[Glenn]** Search by
  intention was offered and not chosen.
- Text first, with a colour swatch per stone. Illustrated art is a later, separate
  release. **[Glenn]**
- No saving to the journal. There is no reading to save, so there is no
  `Rooms.register` call and no change to `server/ishtar/readings/kinds.py`.
  **[judgement]**

## 1. Data: `crystal-data.js`

A UMD module in the pattern of `divination-data.js` **[codebase]**: it sets
`window.CrystalData` in the browser and uses `module.exports` under Node, so both the
page and `tools/build_reference_pages.cjs` read the same source. It exports
`{crystals, chakras}`.

`chakras` is a fixed ordered list of seven: `root, sacral, solar-plexus, heart, throat,
third-eye, crown`, each with a display name.

Each entry in `crystals` has:

| Field | Type | Notes |
|---|---|---|
| `slug` | string | lower-case, hyphenated, unique; this is the URL segment |
| `name` | string | display name |
| `aka` | string[] | other names; used by the grid search; may be empty |
| `colours` | string[] | 1–3 hex values, for the swatch |
| `signs` | string[] | each must match a `BirthLore.zodiacSigns[].name` |
| `chakras` | string[] | each must be a key in `chakras` |
| `element` | string | Fire, Earth, Air or Water |
| `planet` | string | a traditional or modern planet name, or Sun / Moon |
| `cards` | string[] | 1–2 existing `/tarot/cards/<slug>/` slugs |
| `keyword` | string | a few words |
| `meaning` | string | one or two sentences |
| `properties` | `{emotional, spiritual, physical}` | one short paragraph each |
| `care` | string | cleansing and handling |
| `prompt` | string | one reflection question |

### Coverage

Every stone named in `birth-lore.js` (`birthstones` and `zodiacSigns[].stones`) must be
present, so every existing birthstone row has a page to link to. **[codebase]** Today
that is 26 stones: agate, amethyst, aquamarine, bloodstone, citrine, diamond, emerald,
garnet, lapis lazuli, moonstone, moss agate, obsidian, onyx, opal, pearl, peridot, rose
quartz, ruby, sapphire, smoky quartz, tanzanite, tiger's eye, topaz, tourmaline,
turquoise and zircon. The remaining ~74 are the most commonly sought stones in crystal
practice (clear quartz, labradorite, selenite, black tourmaline, carnelian, fluorite,
malachite, and so on). The writer proposes the full list in batch 0, and Glenn can edit it.

The `birth-lore.js` names are matched to crystal names case-insensitively. Pearl is
organic, not a mineral, and is still included because the site already lists it as a
birthstone. **[codebase]**

### Copy rules

- The properties are written in a straight metaphysical voice, stated directly, and
  include physical associations. **[Glenn]**
- No stone is said to cure or treat a named disease or condition, and nothing suggests a
  stone in place of medical care. "Soothes the nerves" is fine; "treats anxiety
  disorder" is not. **[judgement, approved by Glenn]**
- Stones that are unsafe in water, or unsafe to handle or use in elixirs, say so in
  `care`. This covers at least malachite, cinnabar, selenite, pyrite, azurite and
  galena if included. **[judgement, approved by Glenn]**
- The file header says the names and correspondences are traditional and the
  descriptions are original. **[codebase]**, mirroring `divination-data.js`.
- The copy must be original. It must not follow any crystal-shop or reference-book text
  clause by clause. **[judgement]**, from the same risk seen on the I Ching copy.

## 2. The `/crystals/` page

- **Nav:** add `crystals` to `SiteShell.NAV` (href `/crystals/`, hash `#crystal-room`,
  label "Crystals"). The nav, the compact header title and the hub's category cards all
  read `NAV` **[codebase]**, so the hub gains a Crystals card with no other change.
  `tests/site-shell.test.cjs` hard-codes 8 links and moves to 9.
- **Page:** `crystals/index.html` uses the standard shell mount points and script order
  from `docs/SITE-STRUCTURE.md` **[codebase]**: `site-shell.js` → `rooms.js` →
  `storage-preferences.js` → `account-core.js` → `account.js` → `birth-lore.js` →
  `birth-profile.js` → `crystal-data.js` → `crystals.js` → `mobile-sections.js`. It also
  carries the shared `?reading=` opener block that every topic page has. **[codebase]**
  Add it to `sitemap.xml` through the generator's page list.
- **Stylesheet:** `crystals.css`, loaded after `styles.css` and `site-shell.css`.
- **Sections**, each carrying `data-fold` / `data-fold-key` so they collapse on phones
  **[codebase]**:
  1. **Crystal of the day** (`key=crystal-day`). The index is
     `hashString(localDateKey()) % crystals.length`. It is the same FNV-1a hash
     `tarot.js` uses and the same for every visitor, and it changes at local midnight.
     **[codebase]** Copy the four-line hash rather than exporting it from `tarot.js`,
     which is not a module. The hub's `#hub-today` strip gains a fourth item, "Today's
     crystal", linking to `/crystals/#crystal-day`. Like the existing "Today's card"
     item, it does not name the stone, so the hub does not load `crystal-data.js`. That
     file carries ~100 entries of prose, and the hub would otherwise download all of it
     for one name. **[codebase]** pattern, **[judgement]** reason.
  2. **Your stones** (`key=your-stones`). It subscribes to `BirthProfile`. With birth
     details saved, it shows the month birthstone, the sign's stones, and the crystals
     whose `signs` include the Sun sign. With no details saved, it shows a month select
     and a sign select, and gives the same result from those. It has no birth form.
  3. **All crystals** (`key=crystals`). A grid of swatch cards with a text search over
     `name` and `aka`, and select filters for chakra, sign and element. Each card links
     to `/crystals/<slug>/`. Filtering is client-side over the in-page data, with no fetch.
- **Links in from elsewhere:** the "Birthstone" row in `natal-room.js` links each named
  stone to its crystal page. The sign pages' stones line links the same way, through the
  generator.
- Guard every global with a bare `typeof X !== 'undefined'` check, not `window.X`,
  because classic-script `const` is not on `window`. **[codebase]**, from a known
  pitfall in this repo.

## 3. Static pages, build, tests

- **Generator:** `tools/build_reference_pages.cjs` gains a fourth kind, `/crystals/<slug>/`,
  one page per crystal. `/crystals/index.html` is hand-written, not generated, and the
  generator must not overwrite it. Sitemap entries are added, and `LASTMOD` is bumped.
  **[codebase]**
- **Page content:** a swatch, name and aka; the keyword and meaning; the three property
  paragraphs; care; the prompt; and a correspondences block. That block has sign links
  to `/sky/signs/<sign>/`, card links to `/tarot/cards/<slug>/`, the chakra, the element
  and the planet. The page ends with links to other crystals that share a chakra.
- **Fixed provenance sentence**, written once in the generator: "Crystal correspondences
  are traditional; the descriptions are original to this site." **[codebase]**, the same
  pattern as the card and hexagram pages. Record it in `docs/REFERENCE-PAGES.md`.
- **Chrome:** reuse `reference-pages.css`, `accountChrome()` and `stylesheetLinks()`
  exactly as the existing kinds do. **[codebase]**
- **Inputs that trigger a rebuild:** add `crystal-data.js` to the list in
  `docs/REFERENCE-PAGES.md`.

### Writing the copy

Batch 0 is the proposed list of ~100 crystals, with slugs and correspondences only, for
Glenn to glance at. Then about ten batches of ten stones get their prose. For each batch:

1. A writer subagent drafts the entries into `crystal-data.js`.
2. A separate reviewer subagent checks four things: originality (no clause-by-clause
   tracking of a known source), the no-disease-claims line, that `care` carries the
   safety notes, and that the voice varies across entries so they do not all use the
   same sentence shapes.
3. Fixes are made, then all checks run again, before the batch is committed.

The writer brief must not quote any banned phrasing, and it varies its example
sentence. **[judgement]**, from known prompt-priming behaviour in this repo.

### Tests

- `tests/crystal-data.test.cjs` (node:test) **[codebase]**:
  - slugs are unique and URL-safe;
  - every sign, chakra and card reference resolves against `BirthLore`, `chakras` and
    the tarot card slugs;
  - every `birth-lore.js` stone is present;
  - every field is non-empty, and no `undefined` or `NaN` values appear;
  - the stones that need water or handling warnings have them in `care`.

  The test must fail against a deliberately broken fixture. It must not compute its
  expected values with the helper under test.
- `tests/reference-pages.test.cjs` already runs the drift check, so the new pages are
  covered by it. Sweep the generated HTML for `undefined` in text, `href` and `src`.
  **[codebase]**, from a known pitfall.
- `tests/site-shell.test.cjs`: the nav count moves from 8 to 9.
- A small room test for the daily pick, in the pattern of the existing `*-room.test.cjs`
  files: the same date gives the same stone, and a different date usually gives a
  different one.
- Check it in the browser at desktop width and at 390px: the three sections, the
  filters, the hub strip item, the natal-room links, and dark mode.

### Docs

- `docs/SITE-STRUCTURE.md`: the new page row, the NAV row, the script order and the fold
  keys.
- `docs/REFERENCE-PAGES.md`: the new kind, its count, its inputs and the provenance
  sentence.

### Release

The usual ishtarinsights delta release, built with `git -c core.autocrlf=false archive`.
The page directories already exist, so remove the replaced files by hand before
extracting. **[codebase]**, from a known deploy pitfall.

## Out of scope

- Art: one generated still life per crystal, replacing the swatch. This is the next
  release.
- Search by intention.
- Journal saving or a crystal draw.
