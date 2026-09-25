const test = require('node:test');
const assert = require('node:assert/strict');
const SiteShell = require('../site-shell.js');

test('nav renders nine links with the current page marked', () => {
  const {nav} = SiteShell.render({page: 'charts', variant: 'compact'});
  assert.equal((nav.match(/<a /g) || []).length, 9);
  assert.match(nav, /href="\/charts\/" aria-current="page"/);
  assert.doesNotMatch(nav, /href="\/tarot\/" aria-current/);
});

test('hero variant only on the hub', () => {
  assert.match(SiteShell.render({page: 'hub', variant: 'hero'}).header, /class="masthead masthead--hero"/);
  assert.match(SiteShell.render({page: 'tarot', variant: 'compact'}).header, /class="masthead masthead--compact"/);
  assert.match(SiteShell.render({page: 'tarot', variant: 'compact'}).header, /id="account-button"/);
});

test('notice and footer carry the storage controls', () => {
  const {notice, footer} = SiteShell.render({page: 'tarot', variant: 'compact'});
  assert.match(notice, /data-storage-choice="allow"/);
  assert.match(footer, /data-storage-settings/);
  assert.match(footer, /href="\/cookie-policy.html"/);
});

test('the nav floats as one bar and lists the page sections on long pages', () => {
  const sections = [{id: 'birthday-room', label: 'Birth sky'}, {id: 'horary', label: 'Horary'}];
  const {nav} = SiteShell.render({page: 'charts', variant: 'compact', sections});
  assert.match(nav, /^<div class="page-nav">/);
  assert.equal((nav.match(/href="\//g) || []).length, 9, 'the nine page links are still there');
  assert.ok(nav.includes('<nav class="page-sections" aria-label="On this page"><span>On this page</span><a href="#birthday-room">Birth sky</a><a href="#horary">Horary</a></nav>'), nav);
  // A page with one section (or none) gets no section row.
  assert.doesNotMatch(SiteShell.render({page: 'divination', variant: 'compact', sections: [sections[0]]}).nav, /page-sections/);
  assert.doesNotMatch(SiteShell.render({page: 'divination', variant: 'compact'}).nav, /page-sections/);
  // Labels are escaped.
  assert.match(SiteShell.render({page: 'charts', variant: 'compact', sections: [{id: 'a', label: 'Sky & <stars>'}, {id: 'b', label: 'B'}]}).nav, /Sky &amp; &lt;stars&gt;/);
});

test('collectSections keeps top-level folds that have an id, in document order', () => {
  const fold = (id, label, parent) => ({id, dataset: {fold: label}, parentElement: {closest: sel => (parent && sel === '[data-fold]') ? parent : null}});
  const room = fold('birthday-room', 'Birth sky', null);
  const nested = fold('birthday-form', 'Birth details', room);
  const unnamed = fold('', 'Anonymous', null);
  const horary = fold('horary', 'Horary', null);
  const doc = {querySelectorAll: sel => sel === '[data-fold]' ? [room, nested, unnamed, horary] : []};
  assert.deepEqual(SiteShell.collectSections(doc), [{id: 'birthday-room', label: 'Birth sky'}, {id: 'horary', label: 'Horary'}]);
});

test('the compact header can demote its title so a generated page owns the h1', () => {
  const demoted = SiteShell.render({page: 'tarot', variant: 'compact', heading: 'p'}).header;
  assert.doesNotMatch(demoted, /<h1/);
  assert.match(demoted, /<p class="masthead-title">Tarot<\/p>/);
  assert.match(SiteShell.render({page: 'tarot', variant: 'compact'}).header, /<h1>Tarot<\/h1>/);
});

test('the footer links the three reference indexes', () => {
  const {footer} = SiteShell.render({page: 'sky', variant: 'compact'});
  for (const href of ['/tarot/cards/', '/sky/signs/', '/divination/i-ching/', '/about.html', '/about.html#contact', '/privacy.html']) {
    assert.ok(footer.includes(`href="${href}"`), `footer lacks ${href}`);
  }
});

test('the hero lotus animates, and the static logo comes back on every failure path', async () => {
  // A minimal DOM: elements that record listeners and can swap places in one parent.
  const make = (tag) => {
    const el = {tagName: tag, attrs: {}, children: [], listeners: {}, parentNode: null, paused: false,
      setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); c.parentNode = this; },
      get lastChild() { return this.children[this.children.length - 1]; },
      addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }, fire(t) { (this.listeners[t] || []).forEach(f => f()); },
      replaceWith(other) { const p = this.parentNode; p.children[p.children.indexOf(this)] = other; other.parentNode = p; this.parentNode = null; },
      pause() { this.paused = true; }, play: () => playResult};
    return el;
  };
  let playResult;
  const setup = ({reduce = false, play = Promise.resolve()} = {}) => {
    playResult = play;
    const timers = [];
    const lockup = make('div');
    const img = make('img');
    img.alt = 'Ishtar Insights lotus logo';
    img.ownerDocument = {createElement: make};
    lockup.appendChild(img);
    const win = {matchMedia: () => ({matches: reduce}), setTimeout: f => timers.push(f)};
    const video = SiteShell.animateHeroLogo(img, win);
    return {lockup, img, video, timers};
  };
  const shown = (s) => s.lockup.children[0].tagName;
  const tick = () => new Promise(r => setImmediate(r));

  const reduced = setup({reduce: true});
  assert.equal(reduced.video, null);
  assert.equal(shown(reduced), 'img', 'reduced motion keeps the static logo');

  const ok = setup();
  assert.equal(shown(ok), 'video');
  assert.deepEqual(ok.video.children.map(s => s.attrs.src), ['/assets/ishtar-logo-animated-hevc.mp4', '/assets/ishtar-logo-animated.webm'], 'Safari’s HEVC is offered first');
  assert.equal(ok.video.attrs['aria-label'], 'Ishtar Insights lotus logo');
  assert.ok('muted' in ok.video.attrs && 'playsinline' in ok.video.attrs, 'iOS autoplays only muted inline video');
  ok.video.fire('playing'); ok.timers.forEach(f => f());
  assert.equal(shown(ok), 'video', 'a video that started is not cut off by the timeout');
  ok.video.fire('ended');
  assert.equal(shown(ok), 'img', 'the sharper static logo takes over at the end');

  const refused = setup({play: Promise.reject(new Error('NotAllowedError'))});
  await tick();
  assert.equal(shown(refused), 'img', 'refused autoplay (Low Power Mode) restores the logo');

  const stalled = setup();
  stalled.timers.forEach(f => f());
  assert.equal(shown(stalled), 'img', 'nothing playing after the timeout restores the logo');
  assert.ok(stalled.video.paused);

  const unplayable = setup();
  unplayable.video.lastChild.fire('error');
  assert.equal(shown(unplayable), 'img', 'no playable source restores the logo');
});

test('every hub path and every top-level section fold has a mark from the icon set', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  for (const entry of SiteShell.NAV.filter(e => e.key !== 'hub')) {
    assert.ok(SiteShell.ICONS[SiteShell.PATH_MARKS[entry.key]], `path ${entry.key} has no mark`);
  }
  // Top-level folds are [data-fold] sections without an explicit (nested) data-fold-group.
  const pages = ['tarot', 'sky', 'charts', 'eastern', 'numerology', 'divination', 'crystals'];
  const keys = pages.flatMap(page => [...fs.readFileSync(path.join(__dirname, '..', page, 'index.html'), 'utf8')
    .matchAll(/<[a-z]+[^>]*\sdata-fold="[^"]*"[^>]*>/g)].map(m => m[0])
    .filter(tag => !/data-fold-group=/.test(tag)).map(tag => tag.match(/data-fold-key="([^"]+)"/)[1]));
  assert.ok(keys.length >= 16, `found only ${keys.length} top-level folds`);
  for (const key of keys) assert.ok(SiteShell.ICONS[SiteShell.FOLD_MARKS[key]], `fold ${key} has no mark`);
  assert.match(SiteShell.mark('no-such-icon', 'x'), /<path d="M/, 'an unknown name falls back to a star');
});
