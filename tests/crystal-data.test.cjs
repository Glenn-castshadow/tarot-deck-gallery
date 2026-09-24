const test = require('node:test');
const assert = require('node:assert/strict');
const BirthLore = require('../birth-lore.js');

test('stoneSlug turns a stone name into its crystal URL segment', () => {
  assert.equal(BirthLore.stoneSlug("Tiger's eye"), 'tigers-eye');
  assert.equal(BirthLore.stoneSlug('Tiger’s eye'), 'tigers-eye');
  assert.equal(BirthLore.stoneSlug('Lapis lazuli'), 'lapis-lazuli');
  assert.equal(BirthLore.stoneSlug('Garnet'), 'garnet');
  assert.equal(BirthLore.stoneSlug(' Moss  agate '), 'moss-agate');
});

test('stoneLinks links every stone in a " · " list, escaped', () => {
  assert.equal(BirthLore.stoneLinks('Pearl · moonstone'),
    '<a href="/crystals/pearl/">Pearl</a> · <a href="/crystals/moonstone/">moonstone</a>');
  assert.equal(BirthLore.stoneLinks("Tiger's eye"), '<a href="/crystals/tigers-eye/">Tiger&#39;s eye</a>');
});

const {crystals, chakras} = require('../crystal-data.js');
const TarotReference = require('../tarot-reference.js');

const SIGNS = new Set(BirthLore.zodiacSigns.map(s => s.name));
const CARDS = new Set(Array.from({length: 78}, (_, i) => TarotReference.slug(i)));
const ELEMENTS = new Set(['Fire', 'Earth', 'Air', 'Water']);
const PLANETS = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);

test('the seven chakras, root to crown', () => {
  assert.deepEqual(chakras.map(c => c.key), ['root', 'sacral', 'solar-plexus', 'heart', 'throat', 'third-eye', 'crown']);
  for (const c of chakras) assert.ok(c.name, c.key);
});

test('100 crystals, sorted by name, with unique slugs that match their names', () => {
  assert.equal(crystals.length, 100);
  const names = crystals.map(c => c.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  assert.equal(new Set(crystals.map(c => c.slug)).size, 100);
  for (const c of crystals) {
    assert.match(c.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, c.name);
    assert.equal(c.slug, BirthLore.stoneSlug(c.name), c.name);
  }
  // Literal anchors, so a slug rule change cannot pass by changing both sides.
  for (const slug of ['tigers-eye', 'lapis-lazuli', 'clear-quartz', 'watermelon-tourmaline']) {
    assert.ok(crystals.some(c => c.slug === slug), slug);
  }
});

test('every correspondence resolves', () => {
  const chakraKeys = new Set(chakras.map(c => c.key));
  for (const c of crystals) {
    assert.ok(Array.isArray(c.aka), `${c.slug} aka`);
    assert.ok(c.colours.length >= 1 && c.colours.length <= 3, `${c.slug} colours`);
    for (const hex of c.colours) assert.match(hex, /^#[0-9a-f]{6}$/, `${c.slug} colour ${hex}`);
    assert.ok(c.signs.length >= 1 && c.signs.length <= 3, `${c.slug} signs`);
    for (const s of c.signs) assert.ok(SIGNS.has(s), `${c.slug} sign ${s}`);
    assert.ok(c.chakras.length >= 1 && c.chakras.length <= 2, `${c.slug} chakras`);
    for (const k of c.chakras) assert.ok(chakraKeys.has(k), `${c.slug} chakra ${k}`);
    assert.ok(ELEMENTS.has(c.element), `${c.slug} element ${c.element}`);
    assert.ok(PLANETS.has(c.planet), `${c.slug} planet ${c.planet}`);
    assert.ok(c.cards.length >= 1 && c.cards.length <= 2, `${c.slug} cards`);
    for (const card of c.cards) assert.ok(CARDS.has(card), `${c.slug} card ${card}`);
  }
});

test('every stone birth-lore.js names has a crystal page', () => {
  const named = [...Object.values(BirthLore.birthstones), ...BirthLore.zodiacSigns.map(s => s.stones)]
    .flatMap(text => text.split(' · '));
  assert.ok(named.length >= 26);
  const slugs = new Set(crystals.map(c => c.slug));
  for (const name of named) assert.ok(slugs.has(BirthLore.stoneSlug(name)), `no crystal for "${name}"`);
});

const PROSE = ['keyword', 'meaning', 'properties', 'care', 'prompt'];
const written = crystals.filter(c => PROSE.some(field => field in c));
const words = text => text.trim().split(/\s+/).length;
const sentences = text => (text.match(/[.!?](?=\s|$)/g) || []).length;
// Named conditions and cure language. The copy may say a stone soothes or supports; it may not name a disease.
const CLAIMS = /\b(cure[sd]?|curing|treat(s|ed|ing|ment)?|disease|disorder|syndrome|cancer|tumou?r|diabetes|arthritis|infection|depression|medication|prescription|doctor|anxiety|insomnia)\b/i;

test('prose is all or nothing per entry, and in shape when present', () => {
  for (const c of written) {
    for (const field of PROSE) assert.ok(field in c, `${c.slug} has some prose but no ${field}`);
    assert.ok(words(c.keyword) <= 4 && !/[.!?]$/.test(c.keyword), `${c.slug} keyword`);
    assert.ok(sentences(c.meaning) >= 1 && sentences(c.meaning) <= 2, `${c.slug} meaning sentences`);
    assert.ok(words(c.meaning) >= 12 && words(c.meaning) <= 50, `${c.slug} meaning ${words(c.meaning)} words`);
    for (const part of ['emotional', 'spiritual', 'physical']) {
      const text = c.properties[part];
      assert.ok(sentences(text) >= 2 && sentences(text) <= 4, `${c.slug} ${part} sentences`);
      assert.ok(words(text) >= 30 && words(text) <= 90, `${c.slug} ${part} ${words(text)} words`);
    }
    assert.ok(sentences(c.care) >= 1 && sentences(c.care) <= 3 && words(c.care) <= 60, `${c.slug} care`);
    assert.ok(c.prompt.endsWith('?') && (c.prompt.match(/\?/g) || []).length === 1 && words(c.prompt) <= 30, `${c.slug} prompt`);
    const all = [c.keyword, c.meaning, c.properties.emotional, c.properties.spiritual, c.properties.physical, c.care, c.prompt].join(' ');
    assert.doesNotMatch(all, CLAIMS, `${c.slug} makes a medical claim`);
    assert.doesNotMatch(all, /undefined|NaN|TODO/, c.slug);
  }
});

test('openings vary: no two-word opening starts more than three entries of one field', () => {
  const fields = [c => c.meaning, c => c.properties.emotional, c => c.properties.spiritual, c => c.properties.physical, c => c.care];
  for (const get of fields) {
    const counts = new Map();
    for (const c of written) {
      const opening = get(c).replace(new RegExp('^' + c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), 'NAME').split(/\s+/).slice(0, 2).join(' ').toLowerCase();
      counts.set(opening, (counts.get(opening) || 0) + 1);
    }
    for (const [opening, n] of counts) assert.ok(n <= 3, `"${opening}" opens ${n} entries`);
  }
});

// [judgement] Stones that are soluble, porous or rust in water, and stones that are toxic to handle
// or use in elixirs. Extend when a reviewer flags another. The list names only stones in Task 2's table.
const WATER = ['selenite', 'halite', 'desert-rose', 'angelite', 'celestite', 'pyrite', 'hematite', 'lodestone',
  'malachite', 'azurite', 'chrysocolla', 'cinnabar', 'vanadinite', 'turquoise', 'peacock-ore'];
const TOXIC = ['malachite', 'azurite', 'chrysocolla', 'cinnabar', 'vanadinite', 'peacock-ore', 'amazonite'];

test('water-sensitive and toxic stones say so in their care note', () => {
  for (const slug of [...WATER, ...TOXIC]) assert.ok(crystals.some(c => c.slug === slug), `${slug} is not in the data`);
  for (const c of written) {
    if (WATER.includes(c.slug)) assert.match(c.care, /water/i, `${c.slug} care must mention water`);
    if (TOXIC.includes(c.slug)) assert.match(c.care, /toxic|elixir/i, `${c.slug} care must warn against elixirs`);
    if (TOXIC.includes(c.slug)) assert.match(c.care, /wash|hands/i, `${c.slug} care must say to wash hands`);
  }
});

test('British spelling throughout the prose', () => {
  const spelling = /\b(color|colors|colored|favorite|favor|favored|center|centered|gray|energized|energize|jewelry|honor|fiber|theater|mold|molded)\b/i;
  for (const c of written) {
    const all = [c.aka.join(' '), c.keyword, c.meaning, c.properties.emotional, c.properties.spiritual, c.properties.physical, c.care, c.prompt].join(' ');
    assert.doesNotMatch(all, spelling, c.slug);
  }
});

test('tarot cards are spread across the crystals', () => {
  const counts = new Map();
  for (const c of crystals) for (const card of c.cards) counts.set(card, (counts.get(card) || 0) + 1);
  for (const [card, n] of counts) assert.ok(n <= 4, `${card} is on ${n} crystals`);
  assert.ok(crystals.filter(c => c.cards.length === 2).length >= 40, 'at least 40 crystals carry two cards');
});
