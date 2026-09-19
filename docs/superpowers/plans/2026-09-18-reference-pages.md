# Reference Pages (cards, hexagrams, signs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give search engines and visitors one static, crawlable page for each of the 78 tarot cards, 64 I Ching hexagrams and 12 zodiac signs, plus three index pages, a full sitemap and JSON-LD, all generated from text the site already holds.

**Architecture:** One Node build tool (`tools/build_reference_pages.cjs`) requires the site's existing UMD data modules, renders complete HTML files (static header, nav and footer from `SiteShell.render`, static content, JSON-LD) and rewrites `sitemap.xml`. The output is committed, because a release here is a `git archive` delta whose gate hashes files against commit blobs. A drift test regenerates in memory and compares with the files on disk, so a data edit that is not followed by a rebuild fails the suite.

**Tech Stack:** Node (stdlib only: `fs`, `path`, `vm`), `node:test`. No new dependency. Static HTML and one new stylesheet.

**Spec:** None was written. The decisions a spec would carry are in "Design" below; they come from the competitive brief of 2026-09-18 (finding 1: all content sits inside 8 pages, the sitemap lists 7 URLs, no structured data) and Glenn's "proceed" on "per-card, per-sign and per-hexagram pages with a full sitemap".

## Global Constraints

Each line says where it comes from, per Glenn's rule that spec constraints be attributed.

- Dependencies must be open source. *(Glenn, global CLAUDE.md.)* This plan needs none beyond Node's stdlib; an HTML templating library was considered and rejected because the pages are five template literals. *(Claude's judgement.)*
- The generator writes no new prose about a card, hexagram or sign. Every interpretive sentence on a page already exists in `tarot-reference.js`, `birth-lore.js`, `tarot.js`, `divination-data.js` or `iching-lines.js`. Fixed labels ("Upright", "A question to sit with") and navigation text are allowed. *(Claude's judgement: keeps originality review out of scope. See [[classic-text-originality-needs-review]] for why new copy on the I Ching is its own job.)*
- No analytics, ad or tracking script on any generated page. *(Codebase: the storage notice in `site-shell.js` states the site uses none.)*
- Classic scripts, no bundler, no build step for the existing eight pages. *(Codebase.)*
- Run the suite as `node --test tests/*.test.cjs`; `node --test tests/` fails on Node 24. *(Codebase, `docs/CHART-IN-TIME.md`.)*
- Work on a branch in the main checkout, not a worktree, and be back on `main` before 03:30 (the nightly `Ishtar-Daily-Prose` task runs from whatever is checked out). *(Codebase/infra, recorded 2026-09-18.)*
- Files with a backslash in them (regexes) are written with the editor's Write/Edit tools, never through a shell heredoc. *(Codebase/infra: the Bash tool collapses `\\`.)*
- Git stores LF; the working tree on Glenn's machine is CRLF (`core.autocrlf=true`). Anything that compares generated text with a file on disk normalises `\r\n` to `\n` first, and a release tar is built with `git -c core.autocrlf=false archive`. *(Codebase, `docs/deployment.md`.)*
- Bump a `?v=` cache key on every page that loads a changed asset. *(Codebase convention, every entry in `docs/deployment.md`.)*

## Design

**URLs.** *(Claude's judgement throughout; none of these exist yet, so nothing is being renamed.)*

| Kind | Index | Page | Count |
|---|---|---|---|
| Tarot card | `/tarot/cards/` | `/tarot/cards/<slug>/`, slug from `TarotReference.slug(i)`, e.g. `the-star`, `three-of-cups` | 78 |
| Hexagram | `/divination/i-ching/` | `/divination/i-ching/hexagram-<n>/`, n = King Wen number 1..64 | 64 |
| Zodiac sign | `/sky/signs/` | `/sky/signs/<sign>/`, lowercase sign name | 12 |

Every page is a directory with an `index.html`, the way the eight existing pages are served. Total: 157 new HTML files.

**What is on a page.**
- Card: number or rank and suit, keywords, the Ishtar deck image (`/assets/ishtar-deck/cards/NN.jpg`, 360x597), the standalone reference essay (`TarotReference.entry(i).reference`), upright and reversed text and the prompt from the catalogue, the traditional attribution line, previous/next card, a "Draw a reading" button to `/tarot/#tarot-readings` and a link to `/tarot/?card=<slug>` (a deep link `tarot.js` already honours).
- Hexagram: number, pinyin name, character, keyword, the six lines drawn from `symbol` (a six-character string, **bottom line first**: hexagram 11 Tài is `111000`, Heaven below Earth), lower and upper trigram names, `gloss`, `meaning`, `prompt`, the six line texts from `IChingLines.lines[n]` (bottom first) each under its `linePositions[i].title`, previous/next, a "Cast a hexagram" button to `/divination/`.
- Sign: glyph, date range (from `zodiacSigns[i].start` to the day before the next sign's start), element, modality, ruler, stones, flower, mantra, the one `horoscope` sentence, the sign banner (`/assets/newsletter/signs/<sign>.jpg`, 1200x520), the Major Arcana card attributed to the sign (from `TarotReference.attribution(i).sign`, linked to its card page), and a button to `/sky/?sign=<sign>#daily-horoscope` (deployed 2026-09-18).

**Known limit.** A sign page carries about 100 words of interpretive text because that is all the site holds per sign. It works as a landing page for the daily horoscope but is thin for search. Writing real per-sign copy is a separate content job and is deliberately not in this plan.

**The `<h1>`.** The shared compact header renders the section name ("Tarot") as the page's `<h1>`, at runtime. A reference page needs the card name as its one static `<h1>`. So `SiteShell.render` gains a `heading` option, and generated pages render the shell at build time with `heading: 'p'`. They do not load `site-shell.js` at all.

**Sign-in still works.** Generated pages carry the same account dialog markup and the same four account scripts as `divination/index.html`, copied out of that file at build time so cache keys stay in step. The drift test then fails when someone bumps a key there without rebuilding.

**Structured data.** Each page gets one `WebPage` JSON-LD block with `isPartOf` the site, `primaryImageOfPage` where there is an image, and a `BreadcrumbList`. `Article` was rejected: it wants an author and dates the site does not have. *(Claude's judgement.)*

## File Structure

| File | Responsibility |
|---|---|
| `site-shell.js` (modify) | `render({heading})` option; footer links to the three indexes |
| `site-shell.css` (modify) | `.masthead-title`, the demoted header title |
| `reference-pages.css` (create) | Layout and type for every generated page |
| `tools/build_reference_pages.cjs` (create) | Data loading, templates, file list, sitemap, `--check` |
| `tests/reference-pages.test.cjs` (create) | Counts, content, one-`h1`, JSON-LD parses, links resolve, sitemap, drift |
| `tarot/cards/**`, `divination/i-ching/**`, `sky/signs/**`, `sitemap.xml` (generated, committed) | Output |
| the eight `index.html` pages (modify) | `site-shell.js?v=10`, `site-shell.css?v=7` |
| `docs/REFERENCE-PAGES.md` (create), `docs/deployment.md` (modify) | How to rebuild; the release record |

---

### Task 1: The shell can give up its `<h1>`, and the footer links the indexes

**Files:**
- Modify: `site-shell.js` (`renderCompactHeader`, `renderFooter`, `render`)
- Modify: `site-shell.css` (after line 53, the `.masthead--compact h1` rule)
- Modify: the eight pages' `site-shell.js?v=9` and `site-shell.css?v=6` keys
- Test: `tests/site-shell.test.cjs`

**Interfaces:**
- Produces: `SiteShell.render({page, variant, links, sections, heading})` where `heading` is `'h1'` (default) or `'p'`. With `'p'` the compact header's title is `<p class="masthead-title">Label</p>`. The footer contains links to `/tarot/cards/`, `/sky/signs/` and `/divination/i-ching/`.

- [ ] **Step 1: Write the failing tests.** Append to `tests/site-shell.test.cjs`:

```js
test('the compact header can demote its title so a generated page owns the h1', () => {
  const demoted = SiteShell.render({page: 'tarot', variant: 'compact', heading: 'p'}).header;
  assert.doesNotMatch(demoted, /<h1/);
  assert.match(demoted, /<p class="masthead-title">Tarot<\/p>/);
  assert.match(SiteShell.render({page: 'tarot', variant: 'compact'}).header, /<h1>Tarot<\/h1>/);
});

test('the footer links the three reference indexes', () => {
  const {footer} = SiteShell.render({page: 'sky', variant: 'compact'});
  for (const href of ['/tarot/cards/', '/sky/signs/', '/divination/i-ching/']) {
    assert.ok(footer.includes(`href="${href}"`), `footer lacks ${href}`);
  }
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `node --test tests/site-shell.test.cjs`
Expected: 2 failures ("The input was expected to not match" for `<h1`, and "footer lacks /tarot/cards/").

- [ ] **Step 3: Implement.** In `site-shell.js`:

```js
  function renderCompactHeader(page, heading = 'h1') {
    const entry = NAV.find(item => item.key === page);
    const title = entry ? entry.label : '';
    const titleHTML = heading === 'p' ? `<p class="masthead-title">${title}</p>` : `<h1>${title}</h1>`;
```

and use `${titleHTML}` where the template has `<h1>${title}</h1>`. In `renderFooter`, add a third paragraph after the cookie line:

```js
        <p>Look something up: <a href="/tarot/cards/">Tarot card meanings</a> · <a href="/sky/signs/">Zodiac signs</a> · <a href="/divination/i-ching/">I Ching hexagrams</a></p>
```

In `render`, accept and pass the option:

```js
  function render({page, variant, links = 'page', sections = [], heading = 'h1'}) {
    return {
      header: variant === 'hero' ? renderHeroHeader() : renderCompactHeader(page, heading),
```

In `site-shell.css`, directly after the `.masthead--compact h1` rule. The global `h1` rule in `styles.css` (line 29) supplies the font, colour and shadow that a `<p>` does not inherit, so they are restated:

```css
.masthead-title { max-width: none; margin: 14px auto 0; color: #fff; font: 700 clamp(15px, 1.6vw, 20px)/1.08 "Playfair Display", serif; letter-spacing: normal; text-shadow: 0 2px 24px rgba(0,0,0,.45); }
```

- [ ] **Step 4: Run the tests.** `node --test tests/site-shell.test.cjs` — expected: all pass.

- [ ] **Step 5: Bump the keys** on all eight pages (`index.html`, `account/`, `charts/`, `divination/`, `eastern/`, `numerology/`, `sky/`, `tarot/`): `site-shell.js?v=9` to `?v=10`, `site-shell.css?v=6` to `?v=7`. Confirm with a search that no `?v=9` or `?v=6` for those two files remains.

- [ ] **Step 6: Check the footer in a browser** at 1400px and 375px on `/` and `/charts/`: three paragraphs, no overflow. The links 404 until Task 5; that is expected here.

- [ ] **Step 7: Commit.** `git commit -m "feat(shell): demotable header title, footer links to the reference indexes"`

---

### Task 2: The generator's frame — data loading, the page template, the stylesheet

**Files:**
- Create: `tools/build_reference_pages.cjs`
- Create: `reference-pages.css`
- Test: `tests/reference-pages.test.cjs`

**Interfaces:**
- Consumes: `SiteShell.render({heading: 'p'})` from Task 1.
- Produces, all exported from `tools/build_reference_pages.cjs`:
  - `SITE = 'https://ishtarinsights.com'`, `LASTMOD` (a `YYYY-MM-DD` string, bumped by hand when generated content changes; it keeps the output deterministic)
  - `catalogue()` returns the 78 card objects `{name, number, keywords, upright, reversed, prompt, type, suit?, rank?}` in image order
  - `renderPage({url, section, title, description, image, crumbs, body})` returns a complete HTML string. `url` is a site path ending in `/`. `section` is a `SiteShell.NAV` key. `image` is `{src, width, height}` or `null`. `crumbs` is `[{name, url}]`, last item being the page itself.
  - `esc(text)` HTML-escapes.
  - `clip(text, max = 155)` cuts at a word boundary and adds `…` when it cut.

- [ ] **Step 1: Write the failing test.** Create `tests/reference-pages.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../tools/build_reference_pages.cjs');

test('the catalogue is the real 78 cards in image order', () => {
  const cards = B.catalogue();
  assert.equal(cards.length, 78);
  assert.equal(cards[0].name, 'The Fool');
  assert.equal(cards[22].name, 'Ace of Wands');
  assert.equal(cards[77].name, 'King of Pentacles');
});

test('clip cuts on a word and marks the cut', () => {
  assert.equal(B.clip('short'), 'short');
  const out = B.clip('word '.repeat(60));
  assert.ok(out.length <= 156 && out.endsWith('…') && !out.includes('  '));
});

test('a rendered page is complete, static and carries one h1', () => {
  const html = B.renderPage({url: '/tarot/cards/the-star/', section: 'tarot', title: 'The Star tarot card meaning',
    description: 'A "quoted" description & more', image: {src: '/assets/ishtar-deck/cards/17.jpg', width: 360, height: 597},
    crumbs: [{name: 'Tarot', url: '/tarot/'}, {name: 'Card meanings', url: '/tarot/cards/'}, {name: 'The Star', url: '/tarot/cards/the-star/'}],
    body: '<h1>The Star</h1>'});
  assert.ok(html.startsWith('<!doctype html>'));
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, 'exactly one h1');
  assert.match(html, /<link rel="canonical" href="https:\/\/ishtarinsights\.com\/tarot\/cards\/the-star\/">/);
  assert.match(html, /<meta name="description" content="A &quot;quoted&quot; description &amp; more">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<p class="masthead-title">Tarot<\/p>/);
  assert.match(html, /aria-current="page"/, 'the section is marked in the nav');
  assert.match(html, /<dialog id="account-dialog"/);
  assert.doesNotMatch(html, /site-shell\.js/, 'the shell is static on these pages');
  for (const script of ['rooms.js', 'storage-preferences.js', 'account-core.js', 'account.js']) {
    assert.ok(html.includes(`/${script}?v=`), `missing ${script}`);
  }
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld['@graph'][0]['@type'], 'WebPage');
  assert.equal(ld['@graph'][1]['@type'], 'BreadcrumbList');
  assert.equal(ld['@graph'][1].itemListElement.length, 3);
  assert.doesNotMatch(html, /gtag|googletagmanager|plausible|adsbygoogle/);
});
```

- [ ] **Step 2: Run it and watch it fail.** `node --test tests/reference-pages.test.cjs` — expected: `Cannot find module '../tools/build_reference_pages.cjs'`.

- [ ] **Step 3: Write the frame.** Create `tools/build_reference_pages.cjs` **with the Write tool** (it contains regexes):

```js
'use strict';
/* Builds the static reference pages (78 cards, 64 hexagrams, 12 signs, three indexes) and
   sitemap.xml from the site's own data modules. The output is committed: a release hashes
   files against commit blobs. docs/REFERENCE-PAGES.md says when to re-run it.
     node tools/build_reference_pages.cjs          write the files
     node tools/build_reference_pages.cjs --check  exit 1 if any file on disk is stale */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://ishtarinsights.com';
const LASTMOD = '2026-09-19';

const SiteShell = require('../site-shell.js');
const TarotReference = require('../tarot-reference.js');
const BirthLore = require('../birth-lore.js');
const TarotReadings = require('../tarot-readings.js');
const DivinationData = require('../divination-data.js');
const IChingLines = require('../iching-lines.js');

const esc = BirthLore.escapeHTML;
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

function clip(text, max = 155) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

// tarot.js is a browser IIFE, so the catalogue is cut out of its source and evaluated, the
// way tests/tarot-reference.test.cjs and tests/tarot-readings.test.cjs already do.
function catalogue() {
  const source = read('tarot.js');
  const slice = source.slice(source.indexOf('const suitProfiles')).split('const readingDecks =')[0];
  return vm.runInNewContext(slice + '\ntarotCards', {TarotReadings, majorArcana: BirthLore.majorArcana});
}

// The account dialog and its four scripts, lifted from a hand-written page so the cache keys
// cannot drift from the ones the rest of the site serves.
function accountChrome() {
  const page = read('divination/index.html');
  const dialog = page.match(/<dialog id="account-dialog"[\s\S]*?<\/dialog>/);
  if (!dialog) throw new Error('divination/index.html no longer carries #account-dialog');
  const scripts = ['rooms.js', 'storage-preferences.js', 'account-core.js', 'account.js'].map(name => {
    const tag = page.match(new RegExp(`<script src="/${name.replace('.', '\\.')}\\?v=[^"]*"></script>`));
    if (!tag) throw new Error(`divination/index.html no longer loads ${name}`);
    return tag[0];
  });
  return {dialog: dialog[0], scripts: scripts.join('\n    ')};
}

// The stylesheet links, with the same keys the hand-written pages use.
function stylesheetLinks() {
  const page = read('divination/index.html');
  return ['styles.css', 'site-shell.css', 'account.css'].map(name => {
    const tag = page.match(new RegExp(`<link rel="stylesheet" href="/${name.replace('.', '\\.')}\\?v=[^"]*">`));
    if (!tag) throw new Error(`divination/index.html no longer links ${name}`);
    return tag[0];
  }).concat('<link rel="stylesheet" href="/reference-pages.css?v=1">').join('\n    ');
}

function jsonLd({url, title, description, image, crumbs}) {
  const page = {'@type': 'WebPage', '@id': SITE + url, url: SITE + url, name: title, description,
    inLanguage: 'en', isPartOf: {'@type': 'WebSite', name: 'Ishtar Insights', url: SITE + '/'}};
  if (image) page.primaryImageOfPage = {'@type': 'ImageObject', url: SITE + image.src, width: image.width, height: image.height};
  const list = {'@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, i) => (
    {'@type': 'ListItem', position: i + 1, name: crumb.name, item: SITE + crumb.url}))};
  // "</" cannot appear inside a script element.
  return JSON.stringify({'@context': 'https://schema.org', '@graph': [page, list]}).replace(/</g, '\\u003c');
}

function renderPage({url, section, title, description, image, crumbs, body}) {
  const shell = SiteShell.render({page: section, variant: 'compact', heading: 'p'});
  const chrome = accountChrome();
  const fullTitle = `${title} · Ishtar Insights`;
  const ogImage = SITE + (image ? image.src : '/assets/celestial-hero.webp');
  const trail = crumbs.map((crumb, i) => i === crumbs.length - 1
    ? `<span aria-current="page">${esc(crumb.name)}</span>`
    : `<a href="${crumb.url}">${esc(crumb.name)}</a>`).join(' <span aria-hidden="true">›</span> ');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#20152b">
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(fullTitle)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:url" content="${SITE + url}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="canonical" href="${SITE + url}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
    ${stylesheetLinks()}
    <script type="application/ld+json">${jsonLd({url, title: fullTitle, description, image, crumbs})}</script>
  </head>
  <body>
    <div class="grain" aria-hidden="true"></div>
    <main class="shell">
      ${shell.header}
      ${shell.nav}
      <article class="ref-page">
        <nav class="ref-crumbs" aria-label="Breadcrumb">${trail}</nav>
        ${body}
      </article>
      ${shell.footer}
    </main>
    ${chrome.dialog}
    ${shell.notice}
    ${chrome.scripts}
  </body>
</html>
`;
}

module.exports = {SITE, LASTMOD, ROOT, esc, clip, read, catalogue, renderPage,
  TarotReference, BirthLore, DivinationData, IChingLines};
```

Before moving on, open `divination/index.html` and confirm the two assumptions the regexes make: the dialog opens with `<dialog id="account-dialog"` and the stylesheet tags have the form `<link rel="stylesheet" href="/styles.css?v=…">`. If the attribute order differs, fix the regex, not the page.

- [ ] **Step 4: Write the stylesheet.** Create `reference-pages.css`. The first rule matters: `styles.css` styles every `h1` as white hero text with a shadow, which is invisible on the paper background.

```css
/* Generated reference pages: tools/build_reference_pages.cjs. */
.ref-page { max-width: 980px; margin: 8px auto 0; }
.ref-page h1 { max-width: none; margin: 6px 0 0; color: var(--plum-dark); font: 700 clamp(30px, 4.4vw, 52px)/1.08 "Playfair Display", serif; letter-spacing: -.02em; text-shadow: none; }
.ref-page h2 { margin: 30px 0 8px; color: var(--plum); font: 700 clamp(19px, 2.2vw, 24px)/1.2 "Playfair Display", serif; }
.ref-page h3 { margin: 18px 0 4px; color: var(--plum); font: 600 15px/1.3 "DM Sans", sans-serif; }
.ref-page p, .ref-page li, .ref-page dd { color: var(--ink); font-size: 16px; line-height: 1.7; }
.ref-page a { color: var(--plum); }
.ref-crumbs { margin: 18px 0 22px; color: var(--ink-soft); font: 11px "DM Mono", monospace; letter-spacing: .06em; }
.ref-kicker { margin: 0; color: var(--gold); text-transform: uppercase; letter-spacing: .14em; font: 11px "DM Mono", monospace; }
.ref-keywords { margin: 10px 0 0; color: var(--ink-soft); font-size: 15px; }
.ref-layout { display: grid; grid-template-columns: minmax(180px, 280px) minmax(0, 1fr); gap: clamp(24px, 4vw, 48px); align-items: start; margin-top: 26px; }
.ref-layout figure { margin: 0; position: sticky; top: 130px; }
.ref-layout img, .ref-banner img { display: block; width: 100%; height: auto; border-radius: 8px; box-shadow: var(--shadow); }
.ref-banner { margin: 24px 0 0; }
.ref-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px 24px; margin: 24px 0 0; padding: 18px 20px; border: 1px solid var(--line); background: var(--cream); }
.ref-facts dt { color: var(--gold); text-transform: uppercase; letter-spacing: .12em; font: 10px "DM Mono", monospace; }
.ref-facts dd { margin: 3px 0 0; font-size: 15px; }
.ref-hexagram { display: grid; gap: 7px; width: 120px; margin: 0; }
.ref-hexagram i { display: block; height: 11px; background: var(--plum-dark); }
.ref-hexagram i.is-broken { background: linear-gradient(to right, var(--plum-dark) 42%, transparent 42% 58%, var(--plum-dark) 58%); }
.ref-cta { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 22px; margin: 34px 0 0; }
.ref-cta .ref-button { display: inline-block; padding: 12px 18px; background: var(--plum-dark); color: var(--cream); text-decoration: none; font-weight: 600; }
.ref-cta .ref-button:hover { background: var(--plum); }
.ref-pager { display: flex; justify-content: space-between; gap: 16px; margin: 40px 0 0; padding-top: 18px; border-top: 1px solid var(--line); font-size: 14px; }
.ref-index { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 22px; margin: 12px 0 0; padding: 0; list-style: none; }
.ref-index li { font-size: 15px; line-height: 1.5; }
.ref-index small { display: block; color: var(--ink-soft); font-size: 12px; }
@media (max-width: 700px) {
  .ref-layout { grid-template-columns: minmax(0, 1fr); }
  .ref-layout figure { position: static; width: min(64vw, 240px); margin: 0 auto; }
}
```

- [ ] **Step 5: Run the test.** `node --test tests/reference-pages.test.cjs` — expected: 3 pass.

- [ ] **Step 6: Commit.** `git commit -m "feat(reference): generator frame, page template and stylesheet"`

---

### Task 3: Card pages

**Files:**
- Modify: `tools/build_reference_pages.cjs`
- Test: `tests/reference-pages.test.cjs`

**Interfaces:**
- Consumes: `catalogue`, `renderPage`, `esc`, `clip`, `TarotReference` from Task 2.
- Produces: `cardPages()` returns an array of 79 `{file, url, html}`: the index first (`file: 'tarot/cards/index.html'`, `url: '/tarot/cards/'`), then the 78 cards in image order (`file: 'tarot/cards/<slug>/index.html'`). `cardUrl(index)` returns `/tarot/cards/<slug>/`. `file` always uses forward slashes.

- [ ] **Step 1: Write the failing tests.** Append:

```js
test('78 card pages and their index, each with the site\'s own text', () => {
  const pages = B.cardPages();
  assert.equal(pages.length, 79);
  assert.equal(pages[0].file, 'tarot/cards/index.html');
  assert.equal((pages[0].html.match(/href="\/tarot\/cards\/[a-z0-9-]+\/"/g) || []).length, 78);
  const star = pages.find(p => p.url === '/tarot/cards/the-star/');
  assert.equal(star.file, 'tarot/cards/the-star/index.html');
  assert.match(star.html, /<h1>The Star<\/h1>/);
  assert.match(star.html, /<title>The Star tarot card meaning · Ishtar Insights<\/title>/);
  assert.ok(star.html.includes(B.esc(B.TarotReference.entry(17).reference)), 'the reference essay is on the page');
  assert.ok(star.html.includes(B.esc(B.BirthLore.majorArcana[17].upright)));
  assert.ok(star.html.includes(B.esc(B.BirthLore.majorArcana[17].reversed)));
  assert.match(star.html, /src="\/assets\/ishtar-deck\/cards\/17\.jpg" width="360" height="597"/);
  assert.match(star.html, /href="\/tarot\/cards\/the-tower\/"[^>]*>← The Tower/);
  assert.match(star.html, /href="\/tarot\/cards\/the-moon\/"[^>]*>The Moon →/);
  assert.match(star.html, /href="\/tarot\/\?card=the-star"/);
  const ace = pages.find(p => p.url === '/tarot/cards/ace-of-wands/');
  assert.match(ace.html, /src="\/assets\/ishtar-deck\/cards\/22\.jpg"/);
  assert.match(ace.html, /Minor Arcana · Wands/);
});

test('every card page has one h1, a unique title and a description of sane length', () => {
  const titles = new Set();
  for (const page of B.cardPages()) {
    assert.equal((page.html.match(/<h1[ >]/g) || []).length, 1, page.file);
    const title = page.html.match(/<title>(.*?)<\/title>/)[1];
    assert.ok(!titles.has(title), `duplicate title ${title}`); titles.add(title);
    const description = page.html.match(/<meta name="description" content="(.*?)">/)[1];
    assert.ok(description.length >= 50 && description.length <= 170, `${page.file}: ${description.length}`);
  }
});
```

- [ ] **Step 2: Run and watch them fail.** Expected: `B.cardPages is not a function`.

- [ ] **Step 3: Implement.** Add above `module.exports`, and add `cardUrl, cardPages` to the exports:

```js
const pad = index => String(index).padStart(2, '0');
const cardUrl = index => `/tarot/cards/${TarotReference.slug(index)}/`;

function pager(previous, next) {
  return `<nav class="ref-pager" aria-label="Previous and next">
          <span>${previous ? `<a href="${previous.url}" rel="prev">← ${esc(previous.name)}</a>` : ''}</span>
          <span>${next ? `<a href="${next.url}" rel="next">${esc(next.name)} →</a>` : ''}</span>
        </nav>`;
}

function cardPages() {
  const cards = catalogue();
  const crumbsBase = [{name: 'Tarot', url: '/tarot/'}, {name: 'Card meanings', url: '/tarot/cards/'}];
  const kicker = (card) => card.type === 'major' ? `${card.number} · Major Arcana` : `Minor Arcana · ${card.suit}`;
  const pages = cards.map((card, i) => {
    const entry = TarotReference.entry(i);
    const near = j => (j >= 0 && j < 78 ? {url: cardUrl(j), name: cards[j].name} : null);
    const slug = TarotReference.slug(i);
    const body = `<header><p class="ref-kicker">${esc(kicker(card))}</p><h1>${esc(card.name)}</h1><p class="ref-keywords">${esc(card.keywords)}</p></header>
        <div class="ref-layout">
          <figure><img src="/assets/ishtar-deck/cards/${pad(i)}.jpg" width="360" height="597" alt="${esc(card.name)}, from the Ishtar Insights tarot deck"></figure>
          <div>
            <section><h2>What ${esc(card.name)} means</h2><p>${esc(entry.reference)}</p></section>
            <section><h2>Upright</h2><p>${esc(card.upright)}</p></section>
            <section><h2>Reversed</h2><p>${esc(card.reversed)}</p></section>
            <section><h2>A question to sit with</h2><p>${esc(card.prompt)}</p></section>
            <section><h2>Traditional attribution</h2><p>${esc(entry.attribution.line)}. Attributions follow the Golden Dawn with Waite's numbering.</p></section>
          </div>
        </div>
        <p class="ref-cta"><a class="ref-button" href="/tarot/#tarot-readings">Draw a reading</a><a href="/tarot/?card=${slug}">Open ${esc(card.name)} in the card reference</a></p>
        ${pager(near(i - 1), near(i + 1))}`;
    return {file: `tarot/cards/${slug}/index.html`, url: cardUrl(i), html: renderPage({url: cardUrl(i), section: 'tarot',
      title: `${card.name} tarot card meaning`, description: clip(entry.reference),
      image: {src: `/assets/ishtar-deck/cards/${pad(i)}.jpg`, width: 360, height: 597},
      crumbs: [...crumbsBase, {name: card.name, url: cardUrl(i)}], body})};
  });
  const group = (label, from, to) => `<h2>${label}</h2><ul class="ref-index">${cards.slice(from, to).map((card, k) =>
    `<li><a href="${cardUrl(from + k)}">${esc(card.name)}</a><small>${esc(card.keywords)}</small></li>`).join('')}</ul>`;
  const indexBody = `<header><p class="ref-kicker">78 cards</p><h1>Tarot card meanings</h1><p class="ref-keywords">Every card on its own page: what it means, upright and reversed, with its traditional attribution.</p></header>
        ${group('Major Arcana', 0, 22)}${TarotReference.SUITS.map((suit, s) => group(suit, 22 + s * 14, 36 + s * 14)).join('')}
        <p class="ref-cta"><a class="ref-button" href="/tarot/#tarot-readings">Draw a reading</a></p>`;
  const index = {file: 'tarot/cards/index.html', url: '/tarot/cards/', html: renderPage({url: '/tarot/cards/', section: 'tarot',
    title: 'Tarot card meanings: all 78 cards', description: 'All 78 tarot cards, each on its own page: what the card means, upright and reversed, and its traditional Golden Dawn attribution.',
    image: null, crumbs: crumbsBase, body: indexBody})};
  return [index, ...pages];
}
```

- [ ] **Step 4: Run the tests.** Expected: all pass. If the description-length assertion fails for a card, print that card's `reference` and check `clip`; do not relax the bound.

- [ ] **Step 5: Commit.** `git commit -m "feat(reference): 78 card pages and their index"`

---

### Task 4: Hexagram pages

**Files:**
- Modify: `tools/build_reference_pages.cjs`
- Test: `tests/reference-pages.test.cjs`

**Interfaces:**
- Consumes: `renderPage`, `pager`, `esc`, `clip`, `DivinationData`, `IChingLines` from Tasks 2 and 3.
- Produces: `hexagramPages()` returns 65 `{file, url, html}`: index first (`divination/i-ching/index.html`), then hexagrams 1..64 (`divination/i-ching/hexagram-<n>/index.html`). `hexagramUrl(n)`.

- [ ] **Step 1: Write the failing tests.** Append:

```js
test('64 hexagram pages and their index, lines drawn bottom first', () => {
  const pages = B.hexagramPages();
  assert.equal(pages.length, 65);
  const tai = pages.find(p => p.url === '/divination/i-ching/hexagram-11/');
  const hex = B.DivinationData.hexagrams.find(h => h.number === 11);
  assert.match(tai.html, /<h1>Hexagram 11: Tài <span lang="zh">泰<\/span><\/h1>/);
  assert.ok(tai.html.includes(B.esc(hex.meaning)));
  for (const line of B.IChingLines.lines[11]) assert.ok(tai.html.includes(B.esc(line)), 'a line text is missing');
  // 111000 is Heaven below Earth. The figure is drawn top line first, so the three broken lines come first.
  const figure = tai.html.match(/<div class="ref-hexagram"[^>]*>([\s\S]*?)<\/div>/)[1];
  assert.deepEqual(figure.match(/<i[^>]*>/g).map(tag => tag.includes('is-broken')), [true, true, true, false, false, false]);
  assert.match(tai.html, /Heaven below, Earth above/);
  assert.match(pages[0].html, /href="\/divination\/i-ching\/hexagram-64\/"/);
});

test('every hexagram page has one h1 and a unique title', () => {
  const titles = new Set();
  for (const page of B.hexagramPages()) {
    assert.equal((page.html.match(/<h1[ >]/g) || []).length, 1, page.file);
    const title = page.html.match(/<title>(.*?)<\/title>/)[1];
    assert.ok(!titles.has(title), title); titles.add(title);
  }
});
```

- [ ] **Step 2: Run and watch them fail.** Expected: `B.hexagramPages is not a function`.

- [ ] **Step 3: Implement.** Add and export `hexagramUrl, hexagramPages`:

```js
const hexagramUrl = number => `/divination/i-ching/hexagram-${number}/`;

function hexagramPages() {
  const {hexagrams, trigrams, linePositions} = DivinationData;
  const byNumber = [...hexagrams].sort((a, b) => a.number - b.number);
  const trigram = symbol => trigrams.find(t => t.symbol === symbol);
  const crumbsBase = [{name: 'Divination', url: '/divination/'}, {name: 'I Ching hexagrams', url: '/divination/i-ching/'}];
  const label = hex => `Hexagram ${hex.number}: ${hex.name}`;
  const pages = byNumber.map((hex, i) => {
    // symbol is bottom line first; a figure is read, and so drawn, from the top down.
    const drawn = [...hex.symbol].reverse().map(bit => `<i${bit === '1' ? '' : ' class="is-broken"'}></i>`).join('');
    const lower = trigram(hex.symbol.slice(0, 3)), upper = trigram(hex.symbol.slice(3));
    const near = j => (byNumber[j] ? {url: hexagramUrl(byNumber[j].number), name: label(byNumber[j])} : null);
    const lines = IChingLines.lines[hex.number].map((text, k) =>
      `<h3>Line ${k + 1} · ${esc(linePositions[k].title)}</h3><p>${esc(text)}</p>`).join('');
    const body = `<header><p class="ref-kicker">I Ching · ${esc(hex.keyword)}</p><h1>Hexagram ${hex.number}: ${esc(hex.name)} <span lang="zh">${esc(hex.character)}</span></h1><p class="ref-keywords">${esc(hex.gloss)}</p></header>
        <div class="ref-layout">
          <figure><div class="ref-hexagram" role="img" aria-label="${esc(hex.gloss)}">${drawn}</div></figure>
          <div>
            <dl class="ref-facts"><div><dt>Trigrams</dt><dd>${esc(lower.image)} below, ${esc(upper.image)} above</dd></div><div><dt>Keyword</dt><dd>${esc(hex.keyword)}</dd></div></dl>
            <section><h2>What hexagram ${hex.number} means</h2><p>${esc(hex.meaning)}</p></section>
            <section><h2>A question to sit with</h2><p>${esc(hex.prompt)}</p></section>
            <section><h2>The six lines, bottom to top</h2><p>A changing line is read on its own. These are original reflections written for this site, not a translation.</p>${lines}</section>
          </div>
        </div>
        <p class="ref-cta"><a class="ref-button" href="/divination/">Cast a hexagram</a></p>
        ${pager(near(i - 1), near(i + 1))}`;
    return {file: `divination/i-ching/hexagram-${hex.number}/index.html`, url: hexagramUrl(hex.number), html: renderPage({
      url: hexagramUrl(hex.number), section: 'divination', title: `I Ching hexagram ${hex.number}, ${hex.name} (${hex.keyword}): meaning and lines`,
      description: clip(hex.meaning), image: null, crumbs: [...crumbsBase, {name: label(hex), url: hexagramUrl(hex.number)}], body})};
  });
  const indexBody = `<header><p class="ref-kicker">64 hexagrams</p><h1>I Ching hexagrams</h1><p class="ref-keywords">Each hexagram on its own page, with its trigrams and a reflection on every line.</p></header>
        <ul class="ref-index">${byNumber.map(hex => `<li><a href="${hexagramUrl(hex.number)}">${hex.number}. ${esc(hex.name)} <span lang="zh">${esc(hex.character)}</span></a><small>${esc(hex.keyword)}</small></li>`).join('')}</ul>
        <p class="ref-cta"><a class="ref-button" href="/divination/">Cast a hexagram</a></p>`;
  const index = {file: 'divination/i-ching/index.html', url: '/divination/i-ching/', html: renderPage({url: '/divination/i-ching/', section: 'divination',
    title: 'I Ching hexagrams: all 64, with every line', description: 'All 64 I Ching hexagrams, each on its own page with its trigrams, a plain-language meaning and an original reflection on each of the six lines.',
    image: null, crumbs: crumbsBase, body: indexBody})};
  return [index, ...pages];
}
```

If `IChingLines.lines[n]` is missing for any n the map throws; that is the intended failure. `tests/iching-lines.test.cjs` already pins all 64.

- [ ] **Step 4: Run the tests.** Expected: all pass.

- [ ] **Step 5: Commit.** `git commit -m "feat(reference): 64 hexagram pages and their index"`

---

### Task 5: Sign pages, the sitemap, writing files, and the drift check

**Files:**
- Modify: `tools/build_reference_pages.cjs`
- Generated: `tarot/cards/**`, `divination/i-ching/**`, `sky/signs/**`, `sitemap.xml`
- Test: `tests/reference-pages.test.cjs`

**Interfaces:**
- Consumes: everything above.
- Produces: `signPages()` (13 entries: index, then Aries..Pisces), `allFiles()` returning every `{file, html}` including `{file: 'sitemap.xml', html: <xml>}`, `stale()` returning the list of `file`s whose disk content differs from the generated content after CRLF normalisation (a missing file counts), and a CLI: no argument writes, `--check` prints stale files and exits 1 if any.

- [ ] **Step 1: Write the failing tests.** Append:

```js
const fs = require('node:fs');
const path = require('node:path');

test('12 sign pages with date ranges that meet end to end', () => {
  const pages = B.signPages();
  assert.equal(pages.length, 13);
  const aries = pages.find(p => p.url === '/sky/signs/aries/');
  assert.match(aries.html, /<h1><span aria-hidden="true">♈<\/span> Aries<\/h1>/);
  assert.match(aries.html, /March 21 to April 19/);
  assert.match(aries.html, /href="\/sky\/\?sign=aries#daily-horoscope"/);
  assert.match(aries.html, /href="\/tarot\/cards\/the-emperor\/"/, 'Aries is the Emperor in the Golden Dawn attributions');
  const capricorn = pages.find(p => p.url === '/sky/signs/capricorn/');
  assert.match(capricorn.html, /December 22 to January 19/, 'the range crosses the year end');
});

test('the sitemap lists the eight-minus-account pages and every generated page, once', () => {
  const xml = B.allFiles().find(f => f.file === 'sitemap.xml').html;
  const locs = xml.match(/<loc>(.*?)<\/loc>/g).map(tag => tag.slice(5, -6));
  assert.equal(locs.length, 7 + 79 + 65 + 13);
  assert.equal(new Set(locs).size, locs.length);
  assert.ok(locs.includes('https://ishtarinsights.com/tarot/cards/the-star/'));
  assert.ok(!locs.some(loc => loc.includes('/account/')));
});

test('every internal link on a generated page resolves to a file in the repo', () => {
  const generated = new Set(B.allFiles().map(f => f.file));
  for (const {file, html} of B.allFiles()) {
    if (file === 'sitemap.xml') continue;
    for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
      const target = match[1].endsWith('/') ? match[1].slice(1) + 'index.html' : match[1].slice(1);
      assert.ok(generated.has(target) || fs.existsSync(path.join(B.ROOT, target)), `${file} links to missing ${match[1]}`);
    }
  }
});

test('the committed pages are what the generator produces now', () => {
  assert.deepEqual(B.stale(), [], 'run: node tools/build_reference_pages.cjs');
});
```

- [ ] **Step 2: Run and watch them fail.** Expected: `B.signPages is not a function`.

- [ ] **Step 3: Implement signs, the sitemap and the CLI.** The day before a sign's start is computed with `Date.UTC` in a non-leap year, so no date library is needed. Add and export `signPages, allFiles, stale`:

```js
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function signPages() {
  const signs = BirthLore.zodiacSigns;
  const crumbsBase = [{name: 'Sky', url: '/sky/'}, {name: 'Zodiac signs', url: '/sky/signs/'}];
  const url = sign => `/sky/signs/${sign.name.toLowerCase()}/`;
  const range = i => {
    const [month, day] = signs[i].start, [nextMonth, nextDay] = signs[(i + 1) % 12].start;
    const end = new Date(Date.UTC(2025, nextMonth - 1, nextDay - 1));
    return `${MONTHS[month - 1]} ${day} to ${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}`;
  };
  const cardFor = name => {
    for (let i = 0; i < 22; i++) if (TarotReference.attribution(i).sign === name) return i;
    return -1;
  };
  const pages = signs.map((sign, i) => {
    const slug = sign.name.toLowerCase(), card = cardFor(sign.name);
    const near = j => ({url: url(signs[(j + 12) % 12]), name: signs[(j + 12) % 12].name});
    const facts = [['Dates', range(i)], ['Element', sign.element], ['Modality', sign.modality], ['Ruler', sign.ruler],
      ['Stones', sign.stones], ['Flower', sign.flower], ['Mantra', sign.mantra]];
    const body = `<header><p class="ref-kicker">${esc(sign.element)} · ${esc(sign.modality)}</p><h1><span aria-hidden="true">${sign.symbol}</span> ${esc(sign.name)}</h1><p class="ref-keywords">${esc(range(i))}</p></header>
        <figure class="ref-banner"><img src="/assets/newsletter/signs/${slug}.jpg" width="1200" height="520" alt="${esc(sign.name)}, illustrated"></figure>
        <dl class="ref-facts">${facts.map(([term, value]) => `<div><dt>${term}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
        <section><h2>${esc(sign.name)} in a sentence</h2><p>${esc(sign.horoscope)}</p></section>
        ${card >= 0 ? `<section><h2>${esc(sign.name)} in the tarot</h2><p>In the Golden Dawn attributions ${esc(sign.name)} belongs to <a href="${cardUrl(card)}">${esc(TarotReference.name(card))}</a>.</p></section>` : ''}
        <p class="ref-cta"><a class="ref-button" href="/sky/?sign=${slug}#daily-horoscope">Read today's ${esc(sign.name)} horoscope</a><a href="/charts/#birthday-room">Find your rising sign with a birth chart</a></p>
        ${pager(near(i - 1), near(i + 1))}`;
    return {file: `sky/signs/${slug}/index.html`, url: url(sign), html: renderPage({url: url(sign), section: 'sky',
      title: `${sign.name} (${range(i)}): dates, element, ruler and today's horoscope`,
      description: clip(`${sign.name}, ${range(i)}. ${sign.element} sign, ${sign.modality.toLowerCase()}, ruled by ${sign.ruler}. ${sign.horoscope}`),
      image: {src: `/assets/newsletter/signs/${slug}.jpg`, width: 1200, height: 520}, crumbs: [...crumbsBase, {name: sign.name, url: url(sign)}], body})};
  });
  const indexBody = `<header><p class="ref-kicker">12 signs</p><h1>The zodiac signs</h1><p class="ref-keywords">Dates, element, modality and ruler for each sign, with a link to today's horoscope.</p></header>
        <ul class="ref-index">${signs.map((sign, i) => `<li><a href="${url(sign)}"><span aria-hidden="true">${sign.symbol}</span> ${esc(sign.name)}</a><small>${esc(range(i))}</small></li>`).join('')}</ul>
        <p class="ref-cta"><a class="ref-button" href="/sky/#daily-horoscope">Today's horoscope</a></p>`;
  const index = {file: 'sky/signs/index.html', url: '/sky/signs/', html: renderPage({url: '/sky/signs/', section: 'sky',
    title: 'The twelve zodiac signs: dates, elements and rulers', description: 'The twelve zodiac signs with their dates, element, modality, ruling planet and a link to each sign\'s horoscope for today.',
    image: null, crumbs: crumbsBase, body: indexBody})};
  return [index, ...pages];
}

// /account/ is disallowed in robots.txt and stays out, as it is today.
const HAND_WRITTEN = ['/', '/tarot/', '/sky/', '/charts/', '/eastern/', '/numerology/', '/divination/'];

function allFiles() {
  const pages = [...cardPages(), ...hexagramPages(), ...signPages()];
  const urls = [...HAND_WRITTEN, ...pages.map(page => page.url)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>\n    <loc>${SITE}${url}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;
  return [...pages.map(({file, html}) => ({file, html})), {file: 'sitemap.xml', html: sitemap}];
}

function stale() {
  return allFiles().filter(({file, html}) => {
    const target = path.join(ROOT, file);
    return !fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== html;
  }).map(({file}) => file);
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const files = stale();
    if (files.length) { console.error(`stale or missing (${files.length}):\n${files.join('\n')}`); process.exit(1); }
    console.log('reference pages are current');
  } else {
    for (const {file, html} of allFiles()) {
      const target = path.join(ROOT, file);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, html);
    }
    console.log(`wrote ${allFiles().length} files`);
  }
}
```

Before relying on the two date assertions, print `BirthLore.zodiacSigns.map(s => s.start)` and confirm Aries starts `[3, 21]`, Taurus `[4, 20]`, Capricorn `[12, 22]` and Aquarius `[1, 20]`. If the site's own boundaries differ, the **test's expected strings** change to match the site's data, not the other way round. Check also that all twelve `/assets/newsletter/signs/<sign>.jpg` files exist; the link test does not look at `src`.

- [ ] **Step 4: Generate.** Run `node tools/build_reference_pages.cjs`. Expected: `wrote 158 files` (157 pages and the sitemap).

- [ ] **Step 5: Run the whole suite.** `node --test tests/*.test.cjs` — expected: everything passes, including the drift test and `tests/pages.test.cjs` (its page list reads the root and first-level directories only, so the nested pages do not reach it; if it does fail, read its assertion before touching it).

- [ ] **Step 6: Prove the drift test can fail.** Change one character in `tarot/cards/the-star/index.html`, run `node tools/build_reference_pages.cjs --check`, expect exit 1 naming that file; rerun the generator, expect `--check` to pass.

- [ ] **Step 7: Commit the tool and the output together.** `git add tools tests reference-pages.css tarot/cards divination/i-ching sky/signs sitemap.xml && git commit -m "feat(reference): sign pages, sitemap, 158 generated files and a drift check"`

---

### Task 6: Look at it, document it, release it

**Files:**
- Create: `docs/REFERENCE-PAGES.md`
- Modify: `docs/deployment.md`, `docs/SITE-STRUCTURE.md`

- [ ] **Step 1: Browser check, local preview, 1400px and 375px.** For `/tarot/cards/the-star/`, `/tarot/cards/`, `/divination/i-ching/hexagram-11/`, `/sky/signs/capricorn/`:
  - the header looks the same as on `/tarot/` (compare the computed `font` and `color` of `.masthead-title` with the `h1` on `/tarot/`);
  - the page `h1` is dark on paper, not white;
  - no horizontal overflow at 375px (`document.documentElement.scrollWidth <= innerWidth`);
  - "Sign in" opens the dialog; the cookie notice buttons work; the console shows no error other than the local API's 502s;
  - hexagram 11 draws three broken lines above three solid ones;
  - the previous/next links and the button land where they say.

- [ ] **Step 2: Validate the structured data.** Paste one card page's JSON-LD into https://validator.schema.org/ and confirm no errors.

- [ ] **Step 3: Write `docs/REFERENCE-PAGES.md`.** It must say: what the pages are and their URL scheme; that they are generated and must not be edited by hand; the two commands; that any edit to `tarot-reference.js`, `birth-lore.js`, the catalogue in `tarot.js`, `divination-data.js`, `iching-lines.js`, `site-shell.js`, or the account dialog or cache keys in `divination/index.html` requires a rebuild, which the drift test enforces; that `LASTMOD` is bumped by hand when content changes; and the known limit on sign pages. Add the three index URLs to `docs/SITE-STRUCTURE.md`.

- [ ] **Step 4: Release**, following the 2026-09-18 entries in `docs/deployment.md`: a `cp -al` copy of the live release; a tar of the changed and new files built with `git -c core.autocrlf=false archive`; each replaced regular file `rm -f`'d before extraction (never `tar --unlink-first`); gates on `current`, on the sha256 of every shipped file against the commit's blobs, on a link count of 1 for each replaced file, and on the previous release still lacking `tarot/cards`. With about 170 files, generate the hash list with a loop, and check each gate's needle against the file it reads before running. Build the script file locally, ship it, and run it as three separate commands.

- [ ] **Step 5: After the switch.** Confirm 200 for the three indexes, five sample pages, `/sitemap.xml` and `/reference-pages.css?v=1`; confirm `/sitemap.xml` holds 164 `<loc>` entries; load one page of each kind in a browser at ishtarinsights.com. Record the release in `docs/deployment.md`. Tell Glenn the sitemap is ready to submit in Google Search Console; submitting it needs his Google account.

- [ ] **Step 6: Commit and push.** `git commit -m "docs: reference pages, and the release record"`; push `main`.

---

## Self-Review

- **Coverage.** Cards: Task 3. Hexagrams: Task 4. Signs: Task 5. Indexes: one per kind inside each task. Sitemap: Task 5. JSON-LD and Twitter card: Task 2, asserted there. Internal links to the new pages: the footer in Task 1, asserted there. Release: Task 6.
- **Placeholders.** None: every code step carries its code, every run step its command and expected result. Task 6 Step 3 describes a document's required contents instead of reproducing it, because it restates this plan.
- **Names.** `renderPage`, `catalogue`, `cardPages`, `cardUrl`, `hexagramPages`, `hexagramUrl`, `signPages`, `allFiles`, `stale`, `pager`, `esc`, `clip`, `ROOT`, `LASTMOD` are spelled the same in every task and in the tests. `pager` is defined in Task 3 and used in Tasks 4 and 5; `cardUrl` is defined in Task 3 and used in Task 5.
- **Not in scope, on purpose.** Runes, Lenormand and geomancy pages (two sentences of text each, too thin); compatibility pages and angel numbers (no text exists); share images; per-sign written copy; baking the day's horoscope into sign pages.
