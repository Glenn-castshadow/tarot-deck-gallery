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
