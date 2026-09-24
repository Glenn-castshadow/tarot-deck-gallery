const test = require('node:test');
const assert = require('node:assert/strict');
const BirthLore = require('../birth-lore.js');

test('stoneSlug turns a stone name into its crystal URL segment', () => {
  assert.equal(BirthLore.stoneSlug("Tiger's eye"), 'tigers-eye');
  assert.equal(BirthLore.stoneSlug('Lapis lazuli'), 'lapis-lazuli');
  assert.equal(BirthLore.stoneSlug('Garnet'), 'garnet');
  assert.equal(BirthLore.stoneSlug(' Moss  agate '), 'moss-agate');
});

test('stoneLinks links every stone in a " · " list, escaped', () => {
  assert.equal(BirthLore.stoneLinks('Pearl · moonstone'),
    '<a href="/crystals/pearl/">Pearl</a> · <a href="/crystals/moonstone/">moonstone</a>');
  assert.equal(BirthLore.stoneLinks("Tiger's eye"), '<a href="/crystals/tigers-eye/">Tiger&#39;s eye</a>');
});
