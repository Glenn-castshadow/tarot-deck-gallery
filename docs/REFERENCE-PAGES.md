# Reference pages (`tools/build_reference_pages.cjs`)

157 static landing pages plus `sitemap.xml`, one per tarot card, I Ching hexagram and
zodiac sign, generated from the site's own data modules. They exist for search: each
card, hexagram and sign gets its own indexable URL instead of living only behind a
JS-driven picker on `/tarot/`, `/divination/` or `/sky/`.

## URL scheme

| Kind | Index | Page | Count |
|---|---|---|---|
| Tarot cards | `/tarot/cards/` | `/tarot/cards/<slug>/` | 78 |
| I Ching hexagrams | `/divination/i-ching/` | `/divination/i-ching/hexagram-<n>/` | 64 |
| Zodiac signs | `/sky/signs/` | `/sky/signs/<sign>/` | 12 |

`<slug>` is a card's lower-cased, hyphenated name (`the-star`); `<n>` is the hexagram's
number 1-64; `<sign>` is the sign's lower-cased name.

## Generated. Do not hand-edit.

Every file under `tarot/cards/`, `divination/i-ching/` and `sky/signs/`, plus
`sitemap.xml`, is written by the tool below. They render the shared header, nav and
footer at build time via `SiteShell.render({heading: 'p'})` baked into static HTML, and
do not load `site-shell.js` themselves. A hand edit is a diff the drift check flags as
stale, and the next build overwrites it anyway.

```
node tools/build_reference_pages.cjs          # write the files
node tools/build_reference_pages.cjs --check  # exit 1 if anything on disk is stale
```

`tests/reference-pages.test.cjs` runs the same check as a test, so stale pages fail CI,
not just a manual `--check`.

## What triggers a rebuild

The generator reads these as its inputs. Edit any of them, then run the write command
and commit the result:

- `tarot-reference.js`, `birth-lore.js`: card and sign copy.
- the catalogue in `tarot.js` (`suitProfiles` through `readingDecks`, cut out and
  evaluated at build time) and `tarot-readings.js`, which supplies `enrichMinor`
  (minor-card keywords, upright, reversed and prompt text) to that evaluation.
- `divination-data.js`, `iching-lines.js`: hexagram and line copy.
- `site-shell.js`: the shared header/nav/footer chrome.
- `divination/index.html`: the tool lifts the account dialog, its four script tags
  (`rooms.js`, `storage-preferences.js`, `account-core.js`, `account.js`) and the
  `styles.css`/`site-shell.css`/`account.css` cache-key query strings straight out of
  this page (`accountChrome()` and `stylesheetLinks()` in the tool), so its cache keys
  cannot drift from what the rest of the site serves. Bumping any of those three `?v=`
  keys needs a rebuild too.
- `reference-pages.css`: editing it means bumping the hard-coded `?v=1` in
  `stylesheetLinks()` and rebuilding all 157 pages.

## `LASTMOD`

`LASTMOD` is a constant near the top of the tool, bumped by hand whenever generated
content changes. It is the `<lastmod>` value for every URL in `sitemap.xml`, hand-set
rather than read from the filesystem so the sitemap stays deterministic across runs.

## Two fixed provenance sentences

Every card page carries "Attributions follow the Golden Dawn with Waite's numbering."
(written once in `cardPages()`, in the "Traditional attribution" section). Every
hexagram page carries "A changing line is read on its own. These are original
reflections written for this site, not a translation." (written once in
`hexagramPages()`, ahead of the six lines). Both are literal strings in the tool, not
data pulled from a module.

Beyond those two sentences, the only other fixed, templated text the tool writes is:
the sign pages' sentence "In the Golden Dawn attributions \<Sign\> belongs to
\<Card\>." (a templated fact from `TarotReference.attribution`), the three index
pages' ledes and descriptions, and the fixed section labels (e.g. "Upright",
"Reversed", "\<Sign\> in brief"). None of it interprets a card, hexagram or sign;
every interpretive sentence on every page comes from the data modules listed above.

## Known limit: sign pages are thin

A sign page carries roughly 100 words of interpretive text, because that is all
`birth-lore.js` holds per sign. It works as a landing page for the day's horoscope link,
but it is thin for search next to the card and hexagram pages. Per-sign copy is a
separate content job, not part of this generator.

Runes, Lenormand and geomancy were left out entirely: the site holds two sentences of
text per entry for each, not enough for a standalone page.

## Release note

Build a release tar of these files with `git -c core.autocrlf=false archive`, so line
endings match the committed blobs a deploy hashes against. Git Bash's `tar` needs
`--force-local` on a `C:/` path, or it reads the colon as a `host:path` remote spec.
