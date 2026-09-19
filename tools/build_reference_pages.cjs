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
    const files = allFiles();
    for (const {file, html} of files) {
      const target = path.join(ROOT, file);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, html);
    }
    console.log(`wrote ${files.length} files`);
  }
}

module.exports = {SITE, LASTMOD, ROOT, esc, clip, read, catalogue, renderPage,
  TarotReference, BirthLore, DivinationData, IChingLines, cardUrl, pager, cardPages, hexagramUrl, hexagramPages,
  signPages, allFiles, stale};
