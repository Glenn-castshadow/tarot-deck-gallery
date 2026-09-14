# Site structure

The site-foundation project (2026-09-13) split a single `index.html` into a hub plus
seven topic pages, each its own static directory served through `<dir>/index.html`.
There is no build step: every fact below was read directly out of the checked-in HTML
and JS, not assumed from a plan. Where a fact surprised the reader who wrote this doc,
that is called out explicitly rather than smoothed over.

## Pages

| URL | Directory | Page | Canonical |
|---|---|---|---|
| `/` | `index.html` (repo root) | Hub — celestial hero, today strip, seven category cards | `https://ishtarinsights.com/` |
| `/tarot/` | `tarot/` | Daily card, full readings, deck chooser, deck archive, gallery | `https://ishtarinsights.com/tarot/` |
| `/sky/` | `sky/` | Daily horoscope, sky calendar (Moon now, this month, retrogrades, my transits) | `https://ishtarinsights.com/sky/` |
| `/charts/` | `charts/` | Birth form, natal chart, astrocartography, transits, synastry, composite and Davison charts, Four Pillars (BaZi), chart in time, horary | `https://ishtarinsights.com/charts/` |
| `/eastern/` | `eastern/` | Chinese zodiac portrait, Jyotish | `https://ishtarinsights.com/eastern/` |
| `/numerology/` | `numerology/` | The six-view numerology studio | `https://ishtarinsights.com/numerology/` |
| `/divination/` | `divination/` | Lenormand, oracle, runes, geomancy, I Ching | `https://ishtarinsights.com/divination/` |
| `/account/` | `account/` | Sign-in, journal, birth-detail and browser-saving preferences, newsletter toggle, delete | `https://ishtarinsights.com/account/` |

`/account/` is deliberately excluded from `sitemap.xml` and disallowed in `robots.txt`
alongside `/api/` — it is sign-in gated and has nothing for a crawler to index.

Every other root-level `.html` file (`cookie-policy.html`, `newsletter-privacy.html`,
`unsubscribe.html`) is a standalone legal/operational page, not part of this table.

**BaZi lives on `/charts/`, not `/eastern/`.** `#cx-bazi` is one tab of the
`CelestialExtras` component (`celestial-extras.js`), and every tab of that component —
sky today, transits, Two skies (synastry, composite and Davison), BaZi — ships together in `#celestial-extras` on
`/charts/`. `rooms.js`'s `PAGES` table confirms this in code: `jyotish: '/eastern/',
bazi: '/charts/'`. The hub's hash-redirect map sends `#cx-bazi` to `/charts/#cx-bazi`,
not `/eastern/`.

## Shell mount points

`site-shell.js` (`SiteShell`) renders page chrome as HTML strings and mounts them into
four `[data-shell]` targets that every page declares in the same order inside
`<main class="shell">`:

```html
<div data-shell="header"></div>
<div data-shell="nav"></div>
<!-- page content -->
<div data-shell="footer"></div>
```

`[data-shell="notice"]` (the storage-consent banner) is mounted outside `<main>`, right
before the closing `</body>` scripts. Every page calls `SiteShell.mount('<page-key>')`
immediately after loading `site-shell.js`, e.g. `SiteShell.mount('tarot')`. The hub uses
`variant: 'hero'` (the full masthead with the lotus wordmark and hero copy); every topic
page gets `variant: 'compact'` (a slim header with just the account button, logo and page
title) — `mount()` picks the variant from `page === 'hub'` automatically, callers never
pass it.

`SiteShell.NAV` is the single source of the nav bar, the compact header's title lookup,
and (via each entry's `href`) the hub's category cards. Its eight entries:

| key | href | hash | label |
|---|---|---|---|
| hub | `/` | `#` | Hub |
| tarot | `/tarot/` | `#tarot-readings` | Tarot |
| sky | `/sky/` | `#daily-horoscope` | Sky |
| charts | `/charts/` | `#birthday-room` | Charts |
| eastern | `/eastern/` | `#jyotish` | Eastern |
| numerology | `/numerology/` | `#birthday-numbers` | Numerology |
| divination | `/divination/` | `#divination-room` | Divination |
| account | `/account/` | `#account-room` | Account |

`renderNav(page, links)` chooses `href` (cross-page, the normal case) or `hash`
(same-page anchors, `links: 'hash'` — not used by any page today since every section
now has its own page; the option is still read out of the module, not dead code, so it
stays documented).

## Script order per page

Every page after `SiteShell.mount(...)` loads `rooms.js`, then the shared
storage/account stack (`storage-preferences.js`, `account-core.js`, `account.js`) before
any page-specific module. Every one of the seven topic pages ends with
`mobile-sections.js`; the hub does not load it at all (see its script list below — it
has no `[data-fold]` markup for that module to act on). The table below is the exact
`<script src>` order read from each page's `index.html`; anything not in the brief's
page table but present in the file is called out.

**`/` (hub):** `site-shell.js` → `rooms.js` → `storage-preferences.js` →
`account-core.js` → `account.js` → `birthday-insights.js` →
`vendor/astronomy-engine/astronomy.browser.min.js` → `natal-engine.js` →
`birth-lore.js` → `birth-profile.js` → `hub.js`.

**`/tarot/`:** `site-shell.js` → `rooms.js` → `storage-preferences.js` →
`account-core.js` → `account.js` → `archive-decks.js` → `tarot-readings.js` →
`tarot-reference.js` → `birth-lore.js` → `deck-archive.js` → `tarot.js` →
`mobile-sections.js`.

**`/sky/`:** `site-shell.js` → `rooms.js` → `storage-preferences.js` →
`account-core.js` → `account.js` → `birthday-insights.js` →
`vendor/astronomy-engine/astronomy.browser.min.js` → `natal-engine.js` →
`daily-horoscope-engine.js` → `daily-horoscope.js` → `birth-lore.js` →
`birth-profile.js` → `natal-room.js` → `sky-calendar-engine.js` →
`sky-calendar-text.js` → `sky-calendar.js` → `mobile-sections.js`.
The three `sky-calendar-*` files sit after the `?reading=` opener's inline block, which is
harmless: that block only adds a listener, and `sky-calendar.js` registers its room before the
first `ishtar-account-change` fires.

**`/charts/`:** `site-shell.js` → `rooms.js` → `storage-preferences.js` →
`account-core.js` → `account.js` → `newsletter.js` → `birthday-insights.js` →
`birthplace-search.js` → `vendor/astronomy-engine/astronomy.browser.min.js` →
`natal-engine.js` → `natal-chart.js` → `relationship-charts-engine.js` →
`relationship-charts.js` → `sky-chart.js` → `astrocartography-engine.js` →
`astrocartography.js` → `bi-wheel.js` → `celestial-extras-engine.js` →
`celestial-extras.js` → `chart-in-time-engine.js` → `chart-in-time-text.js` →
`chart-in-time.js` → `classical-engine.js` → `chart-depth-engine.js` →
`horary-engine.js` → `horary-text.js` → `horary-chart.js` → `horary.js` →
`birth-lore.js` → `birth-profile.js` → `birth-form.js` → `chart-depth.js` →
`natal-room.js` → `mobile-sections.js`.

**`/eastern/`:** `site-shell.js` → `rooms.js` → `storage-preferences.js` →
`account-core.js` → `account.js` → `newsletter.js` → `birthday-insights.js` →
`birthplace-search.js` → `vendor/astronomy-engine/astronomy.browser.min.js` →
`natal-engine.js` → `jyotish-engine.js` → `jyotish-text.js` → `jyotish-chart.js` →
`jyotish.js` → `birth-lore.js` → `birth-profile.js` → `birth-form.js` →
`natal-room.js` → `chinese-year.js` → `chinese-room.js` → `mobile-sections.js`.

**`/numerology/`:** `site-shell.js` → `rooms.js` → `storage-preferences.js` →
`account-core.js` → `account.js` → `newsletter.js` → `birthday-insights.js` →
`birthplace-search.js` → `vendor/astronomy-engine/astronomy.browser.min.js` →
`natal-engine.js` → `numerology-engine.js` → `birth-lore.js` → `birth-profile.js` →
`birth-form.js` → `numerology.js` → `mobile-sections.js`.

**`/divination/`:** `site-shell.js` → `rooms.js` → `storage-preferences.js` →
`account-core.js` → `account.js` → `divination-data.js` → `divination-engine.js` →
`divination-art.js` → `divination.js` → `mobile-sections.js`.

**`/account/`:** `site-shell.js` → `rooms.js` → `storage-preferences.js` →
`account-core.js` → `account.js` → `mobile-sections.js`. No room module, no
`birth-lore.js`/`birth-profile.js` — the journal and preferences panels need none of
the reading engines.

Disagreements with the brief's page table: none in *page ownership* — every module
above loads on the page the brief's table implies. The brief's table omits
`newsletter.js` (loads on `/charts/`, `/eastern/`, `/numerology/`, wherever the shared
newsletter-join form appears) and `birthplace-search.js` (loads on the same three pages,
alongside the birth form); both are real, present modules, just not named in the task
brief's summary table.

### `natal-room.js` loads on three pages and no-ops per missing section

`natal-room.js` is loaded on `/charts/`, `/eastern/` and `/sky/` — three pages that each
carry a different subset of the sections it attaches to. Every attachment in the module
is guarded with `document.querySelector(...)` returning `null` on a page that lacks that
section, and the module only wires up a `BirthProfile.subscribe` for sections that exist:

```js
const astrocartographyRoom = document.querySelector("#astrocartography-room");
if (astrocartographyRoom) {
  const worldAtlas = Astrocartography.attach(astrocartographyRoom);
  BirthProfile.subscribe(state => { worldAtlas.setBirthChart(state?.natal || null); });
}
```

`/charts/` has `#astrocartography-room`, `#celestial-extras` and `#horary`; `/eastern/`
has `#jyotish`; `/sky/` has `#daily-horoscope`. The sky-portrait render target,
`#birthday-output`, is a bare `document.querySelector("#birthday-output")` at the top of
the module — **only `/charts/index.html` carries that id.** `/eastern/index.html` has a
same-styled `<div class="birthday-output">` wrapping `#birthday-chinese` (filled by
`chinese-room.js` instead), and `/sky/index.html` has neither: on both pages
`birthdayOutput` resolves to `null`, so the `BirthProfile.subscribe` callback that
renders the sky portrait (`if (!birthdayOutput) return;`) and the click/change listeners
guarded by `if (birthdayOutput) {...}` are clean no-ops. `#sky-dialog` (the zoomable
chart explorer `sky-chart.js` drives) is narrower still — only `/charts/index.html` has
it. Loading the same module on divergent pages instead of splitting it into three
smaller files works *because* every section lookup fails soft — a page missing a
section gets a clean no-op for that section's subscriber, not a thrown error that would
kill the whole IIFE.

`window.NatalRoom` does not exist. It held only the three-way `#birthday-output` view
switcher (Western/Chinese/numerology) from the single-page era; that switcher is gone
now that Chinese and numerology have their own pages, and the global was deleted with
it in site-foundation. Anything referencing `NatalRoom` predates this split.

## `data-fold` and `data-room` conventions

### `data-fold` — mobile disclosure sections (`mobile-sections.js`)

At ≤700px, `mobile-sections.js` wraps every element carrying `[data-fold]` in a
collapsible row. Attributes read off that element:

| Attribute | Meaning | Default |
|---|---|---|
| `data-fold` | Visible row title | required |
| `data-fold-key` | Stable key used for open/closed state and hash matching | required |
| `data-fold-subtitle` | Small text under the title | `''` |
| `data-fold-group` | Accordion group; opening one member closes its siblings. `'main'` is the implicit default — a bare `data-fold-group=""` (present, empty) opts *out* of that default, which a falsy-value fallback could not express, since `''` and "attribute absent" are otherwise indistinguishable to `||`. | `'main'` unless the attribute is present and empty |
| `data-fold-level` | Heading level for the row's `<h?>` | `2` |
| `data-fold-open` | Present ⇒ starts open even on phone | closed |
| `data-fold-members` | A selector for elements this fold should wrap *instead of* the element itself (used by the tarot archive's toolbar, which wraps the toolbar plus the gallery and empty-state siblings, not just itself) | wraps the element itself |

Per page, the elements actually carrying `data-fold` today:

- `/tarot/`: "Tarot readings" (`key=tarot`), "The deck archive" (`key=archive`,
  `data-fold-members="#archive,.gallery-head,#gallery,#empty-state"`).
- `/sky/`: "Daily horoscope" (`key=daily-horoscope`), "The sky this month"
  (`key=sky-calendar`).
- `/charts/`: "Birth sky" (`key=birthday`), "Birth details" (`key=birth-form`, nested —
  `data-fold-group=""`), "Astrocartography" (`key=world`), "More astrology charts"
  (`key=charts`, this is `#celestial-extras`, covering sky-today/transits/Two skies (synastry, composite, Davison)/BaZi),
  "Chart in time" (`key=chart-in-time`), "Horary" (`key=horary`).
- `/eastern/`: "Chinese zodiac" (`key=chinese`), "Birth details" (`key=birth-form`,
  nested), "Jyotish" (`key=jyotish`).
- `/numerology/`: "Numerology studio" (`key=numerology`), "Birth details"
  (`key=birth-form`, nested).
- `/divination/`: "Cards & divination" (`key=divination`).
- `/account/`: none — the journal and preference panels carry no `[data-fold]` markup,
  so `mobile-sections.js`'s `init()` skips the "choose a section" intro paragraph for
  this page (it only inserts that intro before `.reading-room` or the first
  `.mobile-fold`, and finds neither).

`mobile-sections.js` also wraps a second tier of finer-grained content
programmatically inside `enhance()` (deck picker, tarot chapters, numerology weaves,
etc.) — those are DOM-pattern matches (`.tarot-position-reading`,
`.num-reading-pair`, ...), not `[data-fold]` markup, and are out of scope for this
convention table.

### `data-room` — reading-kind → DOM scroll target (`rooms.js`)

`data-room` is unrelated to folds. It is a space-separated list of reading *kinds* an
element is the home of, used only by `Rooms.openFromQuery`'s caller to scroll to the
right place after replaying a saved reading:

```js
scrollTo: room => document.querySelector(`[data-room~="${room.kind}"]`)?.scrollIntoView(...)
```

Only three elements in the whole site carry it today:

- `/tarot/`'s `.reading-room` — `data-room="tarot-daily tarot-spread"`.
- `/divination/`'s `#divination-room` — `data-room="lenormand oracle runes geomancy iching"`.
- `/sky/`'s `#sky-calendar` — `data-room="transit-calendar"`.

`rooms.js`'s `PAGES` table also lists `natal`, `solar-return`, `lunar-return`,
`progressed`, `synastry`, `horary`, `jyotish`, `bazi` and `numerology` as kinds with a
home page, but **only `tarot.js`, `divination.js` and `sky-calendar.js` currently call
`Rooms.register()`** (confirmed by grepping every `.js` file for `Rooms.register`). A saved
reading of any of those other kinds would resolve to `'unknown'` in `Rooms.openFromQuery`
today — the `PAGES`/`LABELS` entries are forward declarations for kinds a later sub-project
adds `register()` calls (and, correspondingly, `data-room` markup) for, per the comment atop
`rooms.js`: "Kinds added by later sub-projects join both lists."

The sky project added `transit-calendar` to all three lists that have to agree —
`server/ishtar/readings/kinds.py` (which the API validates against), and `rooms.js`'s `PAGES`
and `LABELS` (which `/account/` needs, since the journal page loads no room module and so
cannot read a registered room's own label).

## The `?reading=` opener

Every one of the seven topic pages, including `/account/` itself, carries the same
inline `<script>` block verbatim, right after its last page-specific `<script src>`. The
hub (`/`) does not carry it — `grep`ing `index.html` for `ishtar-account-change` or
`reading=` finds nothing there, only in the seven topic pages:

```js
document.addEventListener('ishtar-account-change', async function once(event) {
  if (!event.detail.signedIn) return;
  document.removeEventListener('ishtar-account-change', once);
  const result = await Rooms.openFromQuery({
    search: location.search,
    getReading: id => IshtarAccount.getReading(id),
    scrollTo: room => document.querySelector(`[data-room~="${room.kind}"]`)?.scrollIntoView({block: 'start'})
  });
  if (result === 'unknown' || result === 'failed') IshtarAccountUI.openPanel('...');
});
```

This is duplicated seven times (once per topic page) rather than factored into a shared
file — a journal entry opened from `/account/` (`?reading=<id>`) can land on any of the
other six topic pages depending on the reading's kind, so each of those six needs the
same opener waiting on the first `ishtar-account-change` event before `Rooms.get(kind)`
has anything registered to find. `/account/` itself carries the identical block even
though it loads no room module and can never resolve a kind — a click from the journal
never sends `?reading=` to `/account/` in the first place, so the block there is inert
but harmless. The hub needs none of this: it is never a `?reading=` destination for any
registered kind, so it carries no opener at all.

## Hash-redirect map

Only the hub (`/`) carries a redirect map, in an inline `<script>` before
`site-shell.js` loads. It exists because every external bookmark and internal link made
before site-foundation pointed at `/#<fragment>` — the single old page. `location.hash`
is checked once on load; a match calls `location.replace(target)`:

| Old hash | New target |
|---|---|
| `#tarot-readings` | `/tarot/` |
| `#ishtar-deck` | `/tarot/#ishtar-deck` |
| `#archive` | `/tarot/#archive` |
| `#gallery` | `/tarot/#gallery` |
| `#daily-horoscope` | `/sky/` |
| `#birthday-room` | `/charts/#birthday-room` |
| `#astrocartography-room` | `/charts/#astrocartography-room` |
| `#celestial-extras` | `/charts/#celestial-extras` |
| `#cx-transits` | `/charts/#cx-transits` |
| `#cx-synastry` | `/charts/#cx-synastry` |
| `#cx-bazi` | `/charts/#cx-bazi` |
| `#chart-in-time` | `/charts/#chart-in-time` |
| `#horary` | `/charts/#horary` |
| `#birthday-chinese` | `/eastern/#birthday-chinese` |
| `#jyotish` | `/eastern/#jyotish` |
| `#birthday-numbers` | `/numerology/#birthday-numbers` |
| `#divination-room` | `/divination/` |
| `#account-room` | `/account/` |

No other page carries this map — a topic page has no older single-page bookmarks
pointing at it that a different topic page's fragments could collide with.
