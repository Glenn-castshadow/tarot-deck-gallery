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
