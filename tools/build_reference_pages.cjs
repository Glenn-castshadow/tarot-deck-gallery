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

// Memoised: over a network share, accountChrome() and stylesheetLinks() would otherwise each
// re-read divination/index.html per page, and catalogue() re-reads tarot.js per call.
const readCache = new Map();
function read(file) {
  if (!readCache.has(file)) {
    readCache.set(file, fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n'));
  }
  return readCache.get(file);
}

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
