const test = require('node:test');
const assert = require('node:assert/strict');
const SiteShell = require('../site-shell.js');

test('nav renders eight links with the current page marked', () => {
  const {nav} = SiteShell.render({page: 'charts', variant: 'compact'});
  assert.equal((nav.match(/<a /g) || []).length, 8);
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
  assert.equal((nav.match(/href="\//g) || []).length, 8, 'the eight page links are still there');
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
