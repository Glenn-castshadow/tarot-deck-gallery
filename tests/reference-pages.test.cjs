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
  assert.match(html, /<meta name="twitter:card" content="summary">/);
  assert.match(html, /<meta property="og:site_name" content="Ishtar Insights">/);
  assert.match(html, /<meta property="og:image:width" content="360">/);
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

  const noImage = B.renderPage({url: '/divination/i-ching/', section: 'divination', title: 'I Ching hexagrams',
    description: 'All 64 I Ching hexagrams.', image: null,
    crumbs: [{name: 'Divination', url: '/divination/'}, {name: 'I Ching hexagrams', url: '/divination/i-ching/'}],
    body: '<h1>I Ching hexagrams</h1>'});
  assert.match(noImage, /<meta name="twitter:card" content="summary_large_image">/);
});

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
  assert.match(tai.html, /aria-label="Hexagram 11: Earth over Heaven"/);
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

test('every page title fits a search result once the site suffix is removed', () => {
  for (const {file, html} of B.allFiles()) {
    if (file === 'sitemap.xml') continue;
    const title = html.match(/<title>(.*?)<\/title>/)[1].replace(/ · Ishtar Insights$/, '');
    assert.ok(title.length <= 65, `${file}: ${title.length} (${title})`);
  }
});

const fs = require('node:fs');
const path = require('node:path');

test('12 sign pages with date ranges that meet end to end', () => {
  const pages = B.signPages();
  assert.equal(pages.length, 13);
  const aries = pages.find(p => p.url === '/sky/signs/aries/');
  assert.match(aries.html, /<h1><span aria-hidden="true">♈<\/span> Aries<\/h1>/);
  assert.match(aries.html, /March 21 to April 19/);
  assert.match(aries.html, /<h2>Aries in brief<\/h2>/);
  assert.doesNotMatch(aries.html, /in a sentence/);
  assert.match(aries.html, /href="\/sky\/\?sign=aries#daily-horoscope"/);
  assert.match(aries.html, /href="\/tarot\/cards\/the-emperor\/"/, 'Aries is the Emperor in the Golden Dawn attributions');
  const capricorn = pages.find(p => p.url === '/sky/signs/capricorn/');
  assert.match(capricorn.html, /December 22 to January 19/, 'the range crosses the year end');
});

test('the sitemap lists the hand-written pages and every generated page, once', () => {
  const xml = B.allFiles().find(f => f.file === 'sitemap.xml').html;
  const locs = xml.match(/<loc>(.*?)<\/loc>/g).map(tag => tag.slice(5, -6));
  assert.equal(locs.length, 10 + 79 + 65 + 13 + 100);
  assert.equal(new Set(locs).size, locs.length);
  assert.ok(locs.includes('https://ishtarinsights.com/tarot/cards/the-star/'));
  assert.ok(locs.includes('https://ishtarinsights.com/crystals/'));
  assert.ok(locs.includes('https://ishtarinsights.com/crystals/rose-quartz/'));
  assert.ok(!locs.some(loc => loc.includes('/account/')));
});

test('100 crystal pages, each with its prose, correspondences and links', () => {
  const pages = B.crystalPages();
  assert.equal(pages.length, 100);
  assert.ok(!pages.some(p => p.file === 'crystals/index.html'), '/crystals/ is hand-written; the generator must not write it');
  const rose = pages.find(p => p.url === '/crystals/rose-quartz/');
  const data = B.CrystalData.crystals.find(c => c.slug === 'rose-quartz');
  assert.equal(rose.file, 'crystals/rose-quartz/index.html');
  assert.match(rose.html, /<h1>Rose quartz<\/h1>/);
  assert.match(rose.html, /<title>Rose quartz crystal meaning and properties · Ishtar Insights<\/title>/);
  for (const text of [data.meaning, data.properties.emotional, data.properties.spiritual, data.properties.physical, data.care, data.prompt]) {
    assert.ok(rose.html.includes(B.esc(text)), 'prose missing from the page');
  }
  for (const sign of data.signs) assert.ok(rose.html.includes(`href="/sky/signs/${sign.toLowerCase()}/"`), sign);
  for (const card of data.cards) assert.ok(rose.html.includes(`href="/tarot/cards/${card}/"`), card);
  assert.ok(rose.html.includes('Crystal correspondences are traditional; the descriptions are original to this site.'));
  assert.match(rose.html, /src="\/assets\/crystals\/rose-quartz.webp"/);
  assert.match(rose.html, /AI-generated depiction; natural specimens vary/);
  assert.match(rose.html, /href="\/crystals\/" aria-current="page"/, 'Crystals is marked in the nav');
  for (const crystal of B.CrystalData.crystals) {
    const file = path.join(__dirname, '..', 'assets', 'crystals', `${crystal.slug}.webp`);
    const thumb = path.join(__dirname, '..', 'assets', 'crystals', 'thumbs', `${crystal.slug}.webp`);
    assert.ok(fs.existsSync(file), `${crystal.slug} detail image is missing`);
    assert.ok(fs.existsSync(thumb), `${crystal.slug} thumbnail is missing`);
  }
});

test('sign pages link their stones to the crystal pages', () => {
  const aquarius = B.signPages().find(p => p.url === '/sky/signs/aquarius/');
  assert.ok(aquarius.html.includes('<a href="/crystals/amethyst/">Amethyst</a> · <a href="/crystals/garnet/">garnet</a>'));
});

test('every internal link on a generated page resolves to a file in the repo', () => {
  const generated = new Set(B.allFiles().map(f => f.file));
  for (const {file, html} of B.allFiles()) {
    if (file === 'sitemap.xml') continue;
    assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/, file);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const target = match[1].endsWith('/') ? match[1].slice(1) + 'index.html' : match[1].slice(1);
      assert.ok(generated.has(target) || fs.existsSync(path.join(B.ROOT, target)), `${file} links to missing ${match[1]}`);
    }
  }
});

test('the committed pages are what the generator produces now', () => {
  assert.deepEqual(B.stale(), [], 'run: node tools/build_reference_pages.cjs');
});
