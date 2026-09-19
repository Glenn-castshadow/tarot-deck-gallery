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

module.exports = {SITE, LASTMOD, ROOT, esc, clip, read, catalogue, renderPage,
  TarotReference, BirthLore, DivinationData, IChingLines, cardUrl, pager, cardPages};
